import "server-only";
import type { PoolClient } from "pg";
import type { Authenticated } from "./auth";
import { StudioOperationError } from "./studio-booking";
import { debitBookingCredit } from "./booking-credits";

export async function lockStudioOperations(client: PoolClient, studioId: string) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))", [studioId]);
}
export async function freeSpot(
  client: PoolClient,
  studioId: string,
  sessionId: string,
  count: number,
) {
  const r = await client.query<{ spot: number }>(
    `SELECT n::int AS spot FROM generate_series(1,$3::int) n
 WHERE NOT EXISTS(SELECT 1 FROM bookings WHERE studio_id=$1 AND session_id=$2 AND spot_number=n
 AND (status='booked' OR (status='waitlisted' AND offer_expires_at>now()))) ORDER BY n LIMIT 1`,
    [studioId, sessionId, count],
  );
  return r.rows[0]?.spot ?? null;
}
export async function fillWaitlist(client: PoolClient, auth: Authenticated, sessionId: string) {
  await lockStudioOperations(client, auth.studioId);
  const r = await client.query<{
    starts_at: Date;
    status: string;
    capacity: number;
    spot_booking_enabled: boolean;
    spot_count: number;
    timezone: string;
    waiver_required: boolean;
    waitlist_auto_promote: boolean;
    waitlist_auto_cutoff_minutes: number;
    waitlist_offer_minutes: number;
    day: string;
  }>(
    `SELECT c.*,s.timezone,s.waiver_required,s.waitlist_auto_promote,s.waitlist_auto_cutoff_minutes,s.waitlist_offer_minutes,
 (c.starts_at AT TIME ZONE s.timezone)::date::text AS day FROM class_sessions c JOIN studios s ON s.id=c.studio_id
 WHERE c.studio_id=$1 AND c.id=$2 FOR UPDATE OF c`,
    [auth.studioId, sessionId],
  );
  if (!r.rowCount) throw new StudioOperationError(404, "Class not found.");
  const c = r.rows[0];
  await client.query(
    `UPDATE bookings SET offer_closed=true,offer_expires_at=NULL,spot_number=NULL
 WHERE studio_id=$1 AND session_id=$2 AND status='waitlisted' AND offer_expires_at<=now()`,
    [auth.studioId, sessionId],
  );
  await client.query(
    `UPDATE followup_tasks t SET completed_at=now(),outcome='Offer ended'
 WHERE t.studio_id=$1 AND t.completed_at IS NULL AND t.source_key LIKE 'waitlist_offer:%'
 AND EXISTS(SELECT 1 FROM bookings b WHERE b.studio_id=t.studio_id AND b.session_id=$2
 AND t.source_key='waitlist_offer:'||b.id::text AND (b.status<>'waitlisted' OR b.offer_expires_at IS NULL))`,
    [auth.studioId, sessionId],
  );
  if (c.status !== "scheduled" || new Date(c.starts_at).getTime() <= Date.now()) return [];
  const count = await client.query<{ n: number }>(
    "SELECT count(*)::int n FROM bookings WHERE studio_id=$1 AND session_id=$2 AND (status='booked' OR (status='waitlisted' AND offer_expires_at>now()))",
    [auth.studioId, sessionId],
  );
  let remaining = c.capacity - count.rows[0].n;
  const waiting = await client.query<{ id: string; member_id: string }>(
    `SELECT b.id,b.member_id FROM bookings b JOIN people p ON p.studio_id=b.studio_id AND p.id=b.member_id
 WHERE b.studio_id=$1 AND b.session_id=$2 AND b.status='waitlisted' AND NOT b.offer_closed AND b.offer_expires_at IS NULL
 AND p.archived_at IS NULL ORDER BY b.queue_number ASC NULLS LAST,b.booked_at,b.id LIMIT 300`,
    [auth.studioId, sessionId],
  );
  const results: { id: string; memberId: string; status: string; spotNumber: number | null }[] = [];
  for (const b of waiting.rows) {
    if (remaining <= 0) break;
    const eligible = await client.query(
      `SELECT id FROM people WHERE studio_id=$1 AND id=$2 AND kind='member' AND archived_at IS NULL
   AND member_status='Active' AND package_status='Confirmed' AND (credits IS NULL OR credits>0)
   AND (start_date IS NULL OR start_date<=$3::date) AND (expiry_date IS NULL OR expiry_date>=$3::date)
   AND (NOT $4::boolean OR waiver_status='signed') FOR UPDATE`,
      [auth.studioId, b.member_id, c.day, c.waiver_required],
    );
    if (!eligible.rowCount) continue;
    const spot = c.spot_booking_enabled
      ? await freeSpot(client, auth.studioId, sessionId, c.spot_count)
      : null;
    if (c.spot_booking_enabled && spot === null) break;
    const auto =
      c.waitlist_auto_promote &&
      Date.now() < new Date(c.starts_at).getTime() - c.waitlist_auto_cutoff_minutes * 60000;
    if (auto) {
      await debitBookingCredit(client, auth, b.member_id, b.id);
      await client.query(
        "UPDATE bookings SET status='booked',spot_number=$3 WHERE studio_id=$1 AND id=$2",
        [auth.studioId, b.id, spot],
      );
    } else {
      await client.query(
        "UPDATE bookings SET offer_expires_at=least(now()+$3::int*interval '1 minute',$4::timestamptz),spot_number=$5 WHERE studio_id=$1 AND id=$2",
        [auth.studioId, b.id, c.waitlist_offer_minutes, c.starts_at, spot],
      );
    }
    await client.query(
      "INSERT INTO activity_log(studio_id,person_id,actor_id,action,details) VALUES($1,$2,$3,$4,jsonb_build_object('bookingId',$5::text))",
      [
        auth.studioId,
        b.member_id,
        auth.userId,
        auto ? "booking.promoted" : "booking.offer_held",
        b.id,
      ],
    );
    await client.query(
      `INSERT INTO followup_tasks(studio_id,person_id,title,due_at,category,notes,source_key)
   VALUES($1,$2,$3,now(),'General',$4,$5) ON CONFLICT DO NOTHING`,
      [
        auth.studioId,
        b.member_id,
        auto ? "Notify member: promoted from waitlist" : "Contact member: reserved waitlist place",
        `Class ${sessionId} booking ${b.id}. Staff contact required; no message sent.`,
        (auto ? "waitlist_promoted:" : "waitlist_offer:") + b.id,
      ],
    );
    results.push({
      id: b.id,
      memberId: b.member_id,
      status: auto ? "booked" : "offered",
      spotNumber: spot,
    });
    remaining--;
  }
  return results;
}
