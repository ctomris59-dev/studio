import "server-only";
import type { PoolClient } from "pg";
import type { Authenticated } from "./auth";
import {
  StudioOperationError,
  validUUID,
  validInteger,
  validText,
  reserveClass,
} from "./studio-booking";
import { assignSpotToBooking, reviseClass, cancelEntireClass } from "./class-based-os";
import { debitBookingCredit } from "./booking-credits";
import { fillWaitlist, freeSpot, lockStudioOperations } from "./waitlist-policy";
const fail = (status: number, message: string): never => {
  throw new StudioOperationError(status, message);
};
function id(value: unknown): string {
  if (!validUUID(value)) fail(400, "Invalid record identifier.");
  return value as string;
}
function date(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + "T12:00:00Z")) ||
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) !== value
  )
    fail(400, "Choose a valid date.");
  return value as string;
}
async function audit(
  client: PoolClient,
  auth: Authenticated,
  action: string,
  details: unknown,
  memberId: string | null = null,
) {
  await client.query(
    "INSERT INTO activity_log(studio_id,person_id,actor_id,action,details) VALUES($1,$2,$3,$4,$5::jsonb)",
    [auth.studioId, memberId, auth.userId, action, JSON.stringify(details)],
  );
}

async function moveBooking(client: PoolClient, auth: Authenticated, body: Record<string, unknown>) {
  const bookingId = id(body.bookingId),
    targetId = id(body.targetSessionId);
  const found = await client.query<{
    id: string;
    session_id: string;
    member_id: string;
    status: string;
    attended_at: Date | null;
    no_show_at: Date | null;
  }>("SELECT * FROM bookings WHERE studio_id=$1 AND id=$2 FOR UPDATE", [auth.studioId, bookingId]);
  if (!found.rowCount) fail(404, "Booking not found.");
  const b = found.rows[0];
  if (b.status !== "booked" || b.attended_at || b.no_show_at)
    fail(409, "Only an upcoming confirmed booking can be moved.");
  if (b.session_id === targetId) return { alreadyMoved: true, bookingId };
  const sessions = await client.query<{
    id: string;
    starts_at: Date;
    cancel_cutoff_hours: number;
    booking_cutoff_hours: number;
    capacity: number;
    status: string;
    spot_booking_enabled: boolean;
    spot_count: number;
    local_day: string;
    waiver_required: boolean;
  }>(
    `SELECT c.*,(c.starts_at AT TIME ZONE s.timezone)::date::text AS local_day,s.waiver_required FROM class_sessions c JOIN studios s ON s.id=c.studio_id WHERE c.studio_id=$1 AND c.id=ANY($2::uuid[]) ORDER BY c.id FOR UPDATE OF c`,
    [auth.studioId, [b.session_id, targetId]],
  );
  const source = sessions.rows.find((x) => x.id === b.session_id),
    target = sessions.rows.find((x) => x.id === targetId);
  if (!source || !target) fail(404, "Class not found in this studio.");
  if (Date.now() >= new Date(source!.starts_at).getTime() - source!.cancel_cutoff_hours * 3600000)
    fail(409, "The original cancellation deadline has passed.");
  if (
    target!.status !== "scheduled" ||
    Date.now() >= new Date(target!.starts_at).getTime() - target!.booking_cutoff_hours * 3600000
  )
    fail(409, "The destination class is closed.");
  await fillWaitlist(client, auth, targetId);
  const duplicate = await client.query(
    "SELECT 1 FROM bookings WHERE studio_id=$1 AND session_id=$2 AND member_id=$3 AND status IN('booked','waitlisted')",
    [auth.studioId, targetId, b.member_id],
  );
  if (duplicate.rowCount)
    fail(409, "This member already has a booking or waitlist entry in the destination.");
  const member = await client.query(
    `SELECT 1 FROM people p WHERE p.studio_id=$1 AND p.id=$2 AND p.archived_at IS NULL AND p.kind='member'
 AND p.member_status='Active' AND p.package_status='Confirmed' AND (p.start_date IS NULL OR p.start_date<=$3::date)
 AND (p.expiry_date IS NULL OR p.expiry_date>=$3::date) AND (NOT $4::boolean OR p.waiver_status='signed')
 AND (p.credits IS NULL OR EXISTS(SELECT 1 FROM credit_ledger l WHERE l.studio_id=p.studio_id AND l.booking_id=$5 AND l.reason='class_booking' AND l.credit_cycle=p.credit_cycle)) FOR UPDATE`,
    [auth.studioId, b.member_id, target!.local_day, target!.waiver_required, bookingId],
  );
  if (!member.rowCount)
    fail(409, "The existing booking credit is not valid for the destination class.");
  const occupied = await client.query<{ n: number }>(
    "SELECT count(*)::int n FROM bookings WHERE studio_id=$1 AND session_id=$2 AND (status='booked' OR (status='waitlisted' AND offer_expires_at>now()))",
    [auth.studioId, targetId],
  );
  if (occupied.rows[0].n >= target!.capacity)
    fail(409, "The destination class is full. The original booking is unchanged.");
  const spot = target!.spot_booking_enabled
    ? await freeSpot(client, auth.studioId, targetId, target!.spot_count)
    : null;
  if (target!.spot_booking_enabled && spot === null) fail(409, "No equipment spot is available.");
  await client.query(
    "UPDATE bookings SET session_id=$3,spot_number=$4,queue_number=NULL,offer_expires_at=NULL,offer_closed=false WHERE studio_id=$1 AND id=$2",
    [auth.studioId, bookingId, targetId, spot],
  );
  await audit(
    client,
    auth,
    "booking.moved",
    { bookingId, fromSessionId: b.session_id, toSessionId: targetId, spotNumber: spot },
    b.member_id,
  );
  await client.query(
    `INSERT INTO followup_tasks(studio_id,person_id,title,due_at,category,notes,source_key)
 VALUES($1,$2,'Notify member: reservation moved',now(),'General',$3,$4) ON CONFLICT DO NOTHING`,
    [
      auth.studioId,
      b.member_id,
      `Booking ${bookingId}: ${b.session_id} to ${targetId}`,
      "booking_moved:" + bookingId + ":" + targetId,
    ],
  );
  await fillWaitlist(client, auth, b.session_id);
  return { bookingId, sessionId: targetId, spotNumber: spot, creditsChanged: false };
}

async function offerDecision(
  client: PoolClient,
  auth: Authenticated,
  body: Record<string, unknown>,
) {
  const bookingId = id(body.bookingId);
  if (!["accept", "decline"].includes(String(body.decision)))
    fail(400, "Choose accept or decline.");
  const lookup = await client.query<{ session_id: string }>(
    "SELECT session_id FROM bookings WHERE studio_id=$1 AND id=$2",
    [auth.studioId, bookingId],
  );
  if (!lookup.rowCount) fail(404, "Booking not found.");
  const sessionId = lookup.rows[0].session_id;
  // Do not create/extend an offer while accepting it. The displayed hold must still be valid.
  const row = await client.query<{
    member_id: string;
    status: string;
    offer_expires_at: Date | null;
    starts_at: Date;
    local_day: string;
    waiver_required: boolean;
  }>(
    `SELECT b.*,c.starts_at,(c.starts_at AT TIME ZONE s.timezone)::date::text AS local_day,s.waiver_required
 FROM bookings b JOIN class_sessions c ON c.studio_id=b.studio_id AND c.id=b.session_id JOIN studios s ON s.id=b.studio_id
 WHERE b.studio_id=$1 AND b.id=$2 AND c.status='scheduled' FOR UPDATE OF c,b`,
    [auth.studioId, bookingId],
  );
  if (!row.rowCount) fail(409, "Class is not available.");
  const b = row.rows[0];
  if (body.decision === "accept" && b.status === "booked") return { alreadyApplied: true };
  if (
    b.status !== "waitlisted" ||
    !b.offer_expires_at ||
    new Date(b.offer_expires_at).getTime() <= Date.now() ||
    new Date(b.starts_at).getTime() <= Date.now()
  )
    fail(409, "This offer is no longer active. Process the waitlist to offer the next place.");
  if (body.decision === "accept") {
    const eligible = await client.query(
      `SELECT 1 FROM people WHERE studio_id=$1 AND id=$2 AND archived_at IS NULL AND member_status='Active' AND package_status='Confirmed'
   AND (start_date IS NULL OR start_date<=$3::date) AND (expiry_date IS NULL OR expiry_date>=$3::date)
   AND (NOT $4::boolean OR waiver_status='signed') FOR UPDATE`,
      [auth.studioId, b.member_id, b.local_day, b.waiver_required],
    );
    if (!eligible.rowCount)
      fail(409, "Member is no longer eligible. Decline the offer to release the place.");
    await debitBookingCredit(client, auth, b.member_id, bookingId);
    await client.query(
      "UPDATE bookings SET status='booked',offer_expires_at=NULL WHERE studio_id=$1 AND id=$2",
      [auth.studioId, bookingId],
    );
  } else
    await client.query(
      "UPDATE bookings SET offer_closed=true,offer_expires_at=NULL,spot_number=NULL WHERE studio_id=$1 AND id=$2",
      [auth.studioId, bookingId],
    );
  await audit(client, auth, "booking.offer_" + body.decision, { bookingId }, b.member_id);
  await fillWaitlist(client, auth, sessionId);
  return { bookingId, decision: body.decision };
}

async function processRecurring(client: PoolClient, auth: Authenticated, reservationId: string) {
  const found = await client.query<{
    id: string;
    member_id: string;
    anchor_session_id: string;
    end_date: string;
    active: boolean;
  }>("SELECT * FROM recurring_reservations WHERE studio_id=$1 AND id=$2 FOR UPDATE", [
    auth.studioId,
    reservationId,
  ]);
  if (!found.rowCount) fail(404, "Reservation rule not found.");
  const rule = found.rows[0];
  if (!rule.active) fail(409, "This recurring reservation has been stopped.");
  const sessions = await client.query<{
    id: string;
    spot_booking_enabled: boolean;
    spot_count: number;
    status: string;
  }>(
    `SELECT c.id,c.spot_booking_enabled,c.spot_count,c.status FROM class_sessions c
 JOIN class_sessions a ON a.studio_id=c.studio_id AND a.id=$2 JOIN studios s ON s.id=c.studio_id
 WHERE c.studio_id=$1 AND a.series_id IS NOT NULL AND c.series_id=a.series_id AND c.starts_at>=a.starts_at AND c.starts_at>now()
 AND (c.starts_at AT TIME ZONE s.timezone)::date<=$3::date
 AND extract(dow FROM c.starts_at AT TIME ZONE s.timezone)=extract(dow FROM a.starts_at AT TIME ZONE s.timezone)
 AND (c.starts_at AT TIME ZONE s.timezone)::time=(a.starts_at AT TIME ZONE s.timezone)::time
 ORDER BY c.starts_at,c.id LIMIT 53`,
    [auth.studioId, rule.anchor_session_id, rule.end_date],
  );
  if (sessions.rows.length > 52) fail(400, "A reservation can cover at most 52 sessions.");
  const outcomes = [];
  for (const c of sessions.rows) {
    const prior = await client.query<{ booking_id: string | null; outcome: string }>(
      "SELECT booking_id,outcome FROM recurring_booking_attempts WHERE studio_id=$1 AND reservation_id=$2 AND session_id=$3",
      [auth.studioId, reservationId, c.id],
    );
    // Successful occurrences stay consumed even when later cancelled or moved by staff.
    if (prior.rows[0]?.booking_id) {
      outcomes.push({ sessionId: c.id, outcome: "already_processed" });
      continue;
    }
    await client.query("SAVEPOINT recurring_occurrence");
    try {
      const booking = await reserveClass(client, auth, c.id, rule.member_id);
      if (booking.status === "booked" && !booking.alreadyExists) {
        const spot = c.spot_booking_enabled
          ? await freeSpot(client, auth.studioId, c.id, c.spot_count)
          : null;
        await assignSpotToBooking(client, auth.studioId, c.id, booking, spot);
      }
      await client.query(
        `INSERT INTO recurring_booking_attempts(studio_id,reservation_id,session_id,booking_id,outcome)
    VALUES($1,$2,$3,$4,$5) ON CONFLICT(studio_id,reservation_id,session_id) DO UPDATE SET booking_id=excluded.booking_id,outcome=excluded.outcome,message='',updated_at=now()`,
        [auth.studioId, reservationId, c.id, booking.id, booking.status],
      );
      outcomes.push({ sessionId: c.id, outcome: booking.status });
      await client.query("RELEASE SAVEPOINT recurring_occurrence");
    } catch (e) {
      await client.query("ROLLBACK TO SAVEPOINT recurring_occurrence");
      await client.query("RELEASE SAVEPOINT recurring_occurrence");
      if (!(e instanceof StudioOperationError)) throw e;
      await client.query(
        `INSERT INTO recurring_booking_attempts(studio_id,reservation_id,session_id,outcome,message) VALUES($1,$2,$3,'blocked',$4)
    ON CONFLICT(studio_id,reservation_id,session_id) DO UPDATE SET outcome='blocked',message=excluded.message,updated_at=now()`,
        [auth.studioId, reservationId, c.id, e.message],
      );
      outcomes.push({ sessionId: c.id, outcome: "blocked", message: e.message });
    }
  }
  await audit(client, auth, "reservation.processed", { reservationId, outcomes }, rule.member_id);
  return { reservationId, outcomes };
}
async function createRecurring(
  client: PoolClient,
  auth: Authenticated,
  body: Record<string, unknown>,
) {
  const memberId = id(body.memberId),
    anchorId = id(body.sessionId),
    end = date(body.endDate);
  const anchor = await client.query<{ local_day: string; series_id: string | null; starts_at: Date }>(
    "SELECT c.series_id,c.starts_at,(c.starts_at AT TIME ZONE s.timezone)::date::text AS local_day FROM class_sessions c JOIN studios s ON s.id=c.studio_id WHERE c.studio_id=$1 AND c.id=$2 AND c.status='scheduled'",
    [auth.studioId, anchorId],
  );
  if (!anchor.rowCount || !anchor.rows[0].series_id)
    fail(400, "Select an upcoming class from a recurring series.");
  const a = anchor.rows[0];
  if (
    new Date(a.starts_at).getTime() <= Date.now() ||
    end < a.local_day ||
    Date.parse(end) - Date.parse(a.local_day) > 84 * 86400000
  )
    fail(400, "Choose an end date within 12 weeks of the selected class.");
  const m = await client.query(
    "SELECT id FROM people WHERE studio_id=$1 AND id=$2 AND kind='member' AND archived_at IS NULL",
    [auth.studioId, memberId],
  );
  if (!m.rowCount) fail(404, "Member not found.");
  const created = await client.query<{ id: string }>(
    `INSERT INTO recurring_reservations(studio_id,member_id,anchor_session_id,end_date,created_by)
 VALUES($1,$2,$3,$4,$5) ON CONFLICT(studio_id,member_id,anchor_session_id) DO NOTHING RETURNING id`,
    [auth.studioId, memberId, anchorId, end, auth.userId],
  );
  if (!created.rowCount)
    fail(409, "A rule already exists for this member and class. Retry that rule instead.");
  return processRecurring(client, auth, created.rows[0].id);
}

async function bulkClasses(client: PoolClient, auth: Authenticated, body: Record<string, unknown>) {
  if (
    !Array.isArray(body.sessionIds) ||
    !body.sessionIds.length ||
    body.sessionIds.length > 52 ||
    !body.sessionIds.every(validUUID) ||
    new Set(body.sessionIds).size !== body.sessionIds.length
  )
    fail(400, "Select 1–52 distinct classes.");
  const ids = body.sessionIds as string[];
  if (!["cancel", "instructor", "room"].includes(String(body.operation)))
    fail(400, "Choose cancel, instructor or room.");
  const found = await client.query<{ id: string; status: string; starts_at: Date }>(
    "SELECT id,status,starts_at FROM class_sessions WHERE studio_id=$1 AND id=ANY($2::uuid[]) ORDER BY id FOR UPDATE",
    [auth.studioId, ids],
  );
  if (found.rowCount !== ids.length)
    fail(404, "One or more classes were not found in this studio.");
  if (
    found.rows.some(
      (x) => x.status !== "scheduled" || new Date(x.starts_at).getTime() <= Date.now(),
    )
  )
    fail(409, "Only upcoming scheduled classes can be changed. No changes applied.");
  const patch: Record<string, unknown> = {};
  if (body.operation === "instructor") {
    if (!validText(body.value, 80, 2)) fail(400, "Enter an instructor name.");
    Object.assign(patch, { instructor: body.value, staffId: null, substituteStaffId: null });
  } else if (body.operation === "room") {
    if (!validText(body.value, 80, 2)) fail(400, "Enter a room name.");
    patch.room = body.value;
  }
  const results = [];
  for (const c of found.rows)
    results.push(
      body.operation === "cancel"
        ? await cancelEntireClass(client, auth, c.id)
        : await reviseClass(client, auth, c.id, patch),
    );
  await audit(client, auth, "classes.bulk_" + body.operation, { sessionIds: ids });
  return { affected: results.length, results };
}

async function renewal(client: PoolClient, auth: Authenticated, body: Record<string, unknown>) {
  const memberId = id(body.memberId),
    packageId = id(body.packageId),
    requestKey = id(body.requestKey);
  if (!validInteger(body.rolloverLimit, 0, 100)) fail(400, "Rollover limit must be 0–100.");
  if (!validInteger(body.expectedCycle, 0, 1000000))
    fail(400, "Refresh the member package before renewal.");
  const old = await client.query<{
    credits: number | null;
    rollover_credits: number;
    credit_cycle: number;
    package_status: string;
    member_status: string;
  }>(
    "SELECT credits,rollover_credits,credit_cycle,package_status,member_status FROM people WHERE studio_id=$1 AND id=$2 AND kind='member' AND archived_at IS NULL FOR UPDATE",
    [auth.studioId, memberId],
  );
  if (!old.rowCount) fail(404, "Member not found.");
  const prior = await client.query(
    "SELECT * FROM package_renewals WHERE studio_id=$1 AND request_key=$2",
    [auth.studioId, requestKey],
  );
  if (prior.rowCount) {
    const r = prior.rows[0];
    if (
      r.member_id !== memberId ||
      r.package_id !== packageId ||
      r.rollover_limit !== body.rolloverLimit
    )
      fail(409, "Request key already used for a different renewal.");
    return { renewal: r, alreadyApplied: true };
  }
  const m = old.rows[0];
  if (m.package_status !== "Confirmed" || m.credits === null)
    fail(409, "Only a confirmed numeric class pack can be renewed here.");
  if (m.credit_cycle !== body.expectedCycle)
    fail(409, "This package changed. Refresh before renewing again.");
  // Do not strand already-paid future bookings when replacing the current package.
  const upcoming = await client.query(
    "SELECT 1 FROM bookings b JOIN class_sessions c ON c.studio_id=b.studio_id AND c.id=b.session_id WHERE b.studio_id=$1 AND b.member_id=$2 AND b.status='booked' AND c.starts_at>now() LIMIT 1",
    [auth.studioId, memberId],
  );
  if (upcoming.rowCount)
    fail(409, "Finish or cancel future confirmed bookings before renewing this package.");
  const pack = await client.query<{ name: string; credits: number; valid_days: number }>(
    "SELECT name,credits,valid_days FROM studio_packages WHERE studio_id=$1 AND id=$2 AND active=true",
    [auth.studioId, packageId],
  );
  if (!pack.rowCount) fail(404, "Active package not found.");
  const p = pack.rows[0],
    carried = Math.min(Math.max(0, m.credits! - m.rollover_credits), body.rolloverLimit as number),
    expired = m.credits! - carried,
    cycle = m.credit_cycle + 1;
  const updated = await client.query(
    `UPDATE people SET credits=$3,initial_credits=$3,rollover_credits=$4,credit_cycle=$5,plan=$6,
 start_date=(now() AT TIME ZONE s.timezone)::date,expiry_date=(now() AT TIME ZONE s.timezone)::date+$7::int,updated_at=now()
 FROM studios s WHERE people.studio_id=$1 AND people.id=$2 AND s.id=people.studio_id RETURNING people.credits,people.expiry_date::text`,
    [auth.studioId, memberId, p.credits + carried, carried, cycle, p.name, p.valid_days],
  );
  if (expired)
    await client.query(
      "INSERT INTO credit_ledger(studio_id,member_id,delta,reason,created_by,credit_cycle) VALUES($1,$2,$3,'package_renewal_expiry',$4,$5)",
      [auth.studioId, memberId, -expired, auth.userId, m.credit_cycle],
    );
  await client.query(
    "INSERT INTO credit_ledger(studio_id,member_id,delta,reason,created_by,credit_cycle) VALUES($1,$2,$3,'package_renewal_grant',$4,$5)",
    [auth.studioId, memberId, p.credits, auth.userId, cycle],
  );
  const r = await client.query(
    `INSERT INTO package_renewals(studio_id,member_id,package_id,request_key,rollover_limit,previous_credits,carried_credits,expired_credits,new_credits,credit_cycle,expiry_date,created_by)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      auth.studioId,
      memberId,
      packageId,
      requestKey,
      body.rolloverLimit,
      m.credits,
      carried,
      expired,
      p.credits + carried,
      cycle,
      updated.rows[0].expiry_date,
      auth.userId,
    ],
  );
  await audit(client, auth, "package.renewed", { packageId, carried, expired, cycle }, memberId);
  return { renewal: r.rows[0] };
}

async function waiver(client: PoolClient, auth: Authenticated, body: Record<string, unknown>) {
  if (body.action === "waiver_document") {
    if (
      !validText(body.title, 100, 2) ||
      !validText(body.version, 40, 1) ||
      !validText(body.text, 10000, 10)
    )
      fail(400, "Enter a title, version and document text (10–10000 characters).");
    const r = await client.query(
      "INSERT INTO studio_waiver_documents(studio_id,title,version,body,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id",
      [auth.studioId, body.title, body.version, body.text, auth.userId],
    );
    await audit(client, auth, "waiver.document_created", { documentId: r.rows[0].id });
    return r.rows[0];
  }
  const memberId = id(body.memberId),
    documentId = id(body.documentId),
    acceptedOn = date(body.acceptedOn);
  if (!validText(body.evidenceReference, 200, 3) || body.confirmRecorded !== true)
    fail(400, "Confirm the externally obtained acceptance and enter its evidence reference.");
  const m = await client.query(
    "SELECT 1 FROM people WHERE studio_id=$1 AND id=$2 AND kind='member' AND archived_at IS NULL FOR UPDATE",
    [auth.studioId, memberId],
  );
  if (!m.rowCount) fail(404, "Member not found.");
  const doc = await client.query(
    "SELECT 1 FROM studio_waiver_documents WHERE studio_id=$1 AND id=$2 AND active=true",
    [auth.studioId, documentId],
  );
  if (!doc.rowCount) fail(404, "Document not found.");
  const today = await client.query<{ local_day: string }>(
    "SELECT (now() AT TIME ZONE timezone)::date::text AS local_day FROM studios WHERE id=$1",
    [auth.studioId],
  );
  if (acceptedOn > today.rows[0].local_day) fail(400, "Acceptance cannot be dated in the future.");
  const row = await client.query(
    `INSERT INTO member_waiver_records(studio_id,member_id,document_id,evidence_reference,accepted_on,recorded_by)
 VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(studio_id,member_id,document_id) DO NOTHING RETURNING id`,
    [auth.studioId, memberId, documentId, body.evidenceReference, acceptedOn, auth.userId],
  );
  if (!row.rowCount) fail(409, "Acceptance for this document version is already recorded.");
  await client.query(
    "UPDATE people SET waiver_status='signed',waiver_updated_at=now(),updated_at=now() WHERE studio_id=$1 AND id=$2",
    [auth.studioId, memberId],
  );
  await audit(
    client,
    auth,
    "waiver.external_acceptance_recorded",
    { documentId, recordId: row.rows[0].id },
    memberId,
  );
  return row.rows[0];
}

export async function staffOperation(
  client: PoolClient,
  auth: Authenticated,
  body: Record<string, unknown>,
) {
  const action = String(body.action || "");
  const staffActions = [
    "move_booking",
    "process_waitlist",
    "offer_decision",
    "create_recurring",
    "retry_recurring",
    "stop_recurring",
    "waiver_record",
  ];
  const managementActions = ["waitlist_policy", "bulk_classes", "renew_package", "waiver_document"];
  if (![...staffActions, ...managementActions].includes(action)) fail(400, "Unknown operation.");
  if (managementActions.includes(action) && !["owner", "manager"].includes(auth.role))
    fail(403, "Owner or manager access required.");
  await lockStudioOperations(client, auth.studioId);
  switch (action) {
    case "move_booking":
      return moveBooking(client, auth, body);
    case "process_waitlist":
      return { processed: await fillWaitlist(client, auth, id(body.sessionId)) };
    case "offer_decision":
      return offerDecision(client, auth, body);
    case "create_recurring":
      return createRecurring(client, auth, body);
    case "retry_recurring":
      return processRecurring(client, auth, id(body.reservationId));
    case "stop_recurring": {
      const reservationId = id(body.reservationId);
      const row = await client.query(
        "UPDATE recurring_reservations SET active=false WHERE studio_id=$1 AND id=$2 RETURNING member_id",
        [auth.studioId, reservationId],
      );
      if (!row.rowCount) fail(404, "Reservation not found.");
      await audit(client, auth, "reservation.stopped", { reservationId }, row.rows[0].member_id);
      return { stopped: true };
    }
    case "bulk_classes":
      return bulkClasses(client, auth, body);
    case "renew_package":
      return renewal(client, auth, body);
    case "waiver_document":
    case "waiver_record":
      return waiver(client, auth, body);
    case "waitlist_policy": {
      if (
        typeof body.autoPromote !== "boolean" ||
        !validInteger(body.cutoffMinutes, 0, 10080) ||
        !validInteger(body.offerMinutes, 5, 1440)
      )
        fail(400, "Check the waitlist policy values.");
      await client.query(
        "UPDATE studios SET waitlist_auto_promote=$2,waitlist_auto_cutoff_minutes=$3,waitlist_offer_minutes=$4 WHERE id=$1",
        [auth.studioId, body.autoPromote, body.cutoffMinutes, body.offerMinutes],
      );
      await audit(client, auth, "waitlist.policy_updated", {
        autoPromote: body.autoPromote,
        cutoffMinutes: body.cutoffMinutes,
        offerMinutes: body.offerMinutes,
      });
      return { saved: true };
    }
  }
}
