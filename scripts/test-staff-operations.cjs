const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
module.exports = async function testStaffOperations({
  call,
  admin,
  a,
  b,
  staffCookie,
  instructorCookie,
}) {
  const post = (body, cookie = a.cookie) =>
    call("/api/studio/operations", { method: "POST", cookie, body });
  const ok = (r, status = 200) => {
    assert.equal(r.status, status, JSON.stringify(r.data));
    return r.data.result;
  };
  const read = async (memberId) => {
    const r = await call("/api/studio/operations?memberId=" + memberId, { cookie: a.cookie });
    ok(r);
    return r.data;
  };
  const day = new Date(Date.now() + 40 * 86400000);
  day.setUTCHours(10, 0, 0, 0);
  const member = async (name, credits = 8) => {
    const r = await admin.query(
      "INSERT INTO people(studio_id,kind,full_name,email,member_status,package_status,credits,waiver_status) VALUES($1,'member',$2,$3,'Active','Confirmed',$4,'signed') RETURNING id",
      [a.studioId, name, randomUUID() + "@example.test", credits],
    );
    return r.rows[0].id;
  };
  const cls = async (n, { capacity = 1, series = null, spot = false } = {}) => {
    const r = await admin.query(
      `INSERT INTO class_sessions(studio_id,title,instructor,room,starts_at,duration_minutes,capacity,booking_cutoff_hours,cancel_cutoff_hours,series_id,spot_booking_enabled,spot_count)
 VALUES($1,$2,$2,$2,$3,50,$4,0,0,$5,$6,$7) RETURNING id`,
      [
        a.studioId,
        "Operations " + n,
        new Date(day.getTime() + n * 86400000),
        capacity,
        series,
        spot,
        spot ? capacity : null,
      ],
    );
    return r.rows[0].id;
  };
  const book = async (sessionId, memberId) => {
    const r = await call("/api/studio/bookings", {
      method: "POST",
      cookie: a.cookie,
      body: { sessionId, memberId, spotNumber: 1 },
    });
    ok(r, 201);
    return r.data.booking;
  };
  const cancel = async (id) =>
    ok(await call("/api/studio/bookings/" + id, { method: "DELETE", cookie: a.cookie }));
  const m1 = await member("Operations One"),
    m2 = await member("Operations Two"),
    m3 = await member("Operations Three");
  const source = await cls(0, { spot: true }),
    target = await cls(1, { spot: true });
  assert.equal((await call("/api/studio/operations")).status, 401);
  assert.equal((await call("/api/studio/operations", { cookie: instructorCookie })).status, 403);
  ok(
    await post({
      action: "waitlist_policy",
      autoPromote: false,
      cutoffMinutes: 60,
      offerMinutes: 5,
    }),
  );
  ok(
    await post(
      { action: "waitlist_policy", autoPromote: true, cutoffMinutes: 0, offerMinutes: 5 },
      staffCookie,
    ),
    403,
  );
  const first = await book(source, m1),
    second = await book(source, m2);
  assert.equal(second.status, "waitlisted");
  await cancel(first.id);
  let held = (
    await call("/api/studio/bookings?sessionId=" + source, { cookie: a.cookie })
  ).data.bookings.find((x) => x.id === second.id);
  assert(held.offer_expires_at);
  assert.equal(held.spot_number, 1);
  assert.equal((await read(m2)).member.credits, 8, "Holding does not debit");
  const third = await book(source, m3);
  assert.equal(third.status, "waitlisted", "New request cannot steal held place");
  ok(
    await post({ action: "offer_decision", bookingId: second.id, decision: "accept" }, b.cookie),
    404,
  );
  const accepts = await Promise.all([
    post({ action: "offer_decision", bookingId: second.id, decision: "accept" }),
    post({ action: "offer_decision", bookingId: second.id, decision: "accept" }),
  ]);
  accepts.forEach((r) => ok(r));
  assert.equal((await read(m2)).member.credits, 7, "Concurrent acceptance debits once");
  const occupied = await book(target, m1);
  ok(await post({ action: "move_booking", bookingId: second.id, targetSessionId: target }), 409);
  assert.equal(
    (await admin.query("SELECT session_id FROM bookings WHERE id=$1", [second.id])).rows[0]
      .session_id,
    source,
    "Failed move preserves original",
  );
  await cancel(occupied.id);
  ok(await post({ action: "move_booking", bookingId: second.id, targetSessionId: target }));
  assert.equal((await read(m2)).member.credits, 7, "Move preserves debit");
  held = (
    await call("/api/studio/bookings?sessionId=" + source, { cookie: a.cookie })
  ).data.bookings.find((x) => x.id === third.id);
  assert(held.offer_expires_at, "Move offers released seat");
  await admin.query("UPDATE bookings SET offer_expires_at=now()-interval '1 second' WHERE id=$1", [
    third.id,
  ]);
  ok(await post({ action: "offer_decision", bookingId: third.id, decision: "accept" }), 409);
  ok(await post({ action: "process_waitlist", sessionId: source }));
  assert.equal((await read(m3)).member.credits, 8);
  const free = await book(source, m1);
  await cancel(free.id);
  // Recurrence records partial failures and retries only unresolved occurrences.
  const series = randomUUID(),
    r1 = await cls(2, { series, spot: true }),
    r2 = await cls(9, { series, spot: true }),
    r3 = await cls(16, { series, spot: true });
  const low = await member("Operations Recurring", 1);
  const recurring = ok(
    await post({
      action: "create_recurring",
      memberId: low,
      sessionId: r1,
      endDate: new Date(day.getTime() + 17 * 86400000).toISOString().slice(0, 10),
    }),
  );
  assert.deepEqual(
    recurring.outcomes.map((x) => x.outcome),
    ["booked", "blocked", "blocked"],
  );
  await admin.query("UPDATE people SET credits=3 WHERE id=$1", [low]);
  const retried = ok(
    await post({ action: "retry_recurring", reservationId: recurring.reservationId }),
  );
  assert.deepEqual(
    retried.outcomes.map((x) => x.outcome),
    ["already_processed", "booked", "booked"],
  );
  const rbooking = (
    await admin.query("SELECT id FROM bookings WHERE session_id=$1 AND member_id=$2", [r2, low])
  ).rows[0].id;
  await cancel(rbooking);
  ok(await post({ action: "retry_recurring", reservationId: recurring.reservationId }));
  assert.equal(
    (await admin.query("SELECT status FROM bookings WHERE id=$1", [rbooking])).rows[0].status,
    "cancelled",
    "Retry does not resurrect cancelled occurrence",
  );
  ok(await post({ action: "stop_recurring", reservationId: recurring.reservationId }));
  ok(await post({ action: "retry_recurring", reservationId: recurring.reservationId }), 409);
  // Bulk rollback across tenant and invalid class selection.
  ok(
    await post({
      action: "bulk_classes",
      sessionIds: [r1, randomUUID()],
      operation: "room",
      value: "New room",
    }),
    404,
  );
  assert.notEqual(
    (await admin.query("SELECT room FROM class_sessions WHERE id=$1", [r1])).rows[0].room,
    "New room",
  );
  ok(
    await post({
      action: "bulk_classes",
      sessionIds: [r1, r3],
      operation: "room",
      value: "Operations room",
    }),
  );
  ok(await post({ action: "bulk_classes", sessionIds: [r1, r3], operation: "cancel" }));
  assert.equal((await read(low)).member.credits, 4, "Bulk cancellation refunds each debit once");
  ok(await post({ action: "bulk_classes", sessionIds: [r1, r3], operation: "cancel" }), 409);
  assert.equal((await read(low)).member.credits, 4);
  // Capped carryover, retry idempotency, current-cycle credit refunds.
  const pack = (
    await admin.query(
      "INSERT INTO studio_packages(studio_id,name,credits,valid_days) VALUES($1,'Operations pack',5,90) RETURNING id",
      [a.studioId],
    )
  ).rows[0].id;
  const renewal = {
    action: "renew_package",
    memberId: m3,
    packageId: pack,
    rolloverLimit: 3,
    expectedCycle: 0,
    requestKey: randomUUID(),
  };
  ok(await post(renewal, staffCookie), 403);
  ok(await post(renewal, b.cookie), 404);
  const renew = ok(await post(renewal));
  assert.equal(renew.renewal.carried_credits, 3);
  assert.equal(renew.renewal.expired_credits, 5);
  ok(await post(renewal));
  assert.equal((await read(m3)).member.credit_cycle, 1);
  ok(await post({ ...renewal, requestKey: randomUUID() }), 409);
  const carryClass = await cls(3),
    carryBooking = await book(carryClass, m3);
  assert.equal((await read(m3)).member.rollover_credits, 2);
  await cancel(carryBooking.id);
  assert.equal((await read(m3)).member.rollover_credits, 3);
  ok(await post({ ...renewal, expectedCycle: 1, requestKey: randomUUID(), rolloverLimit: 100 }));
  assert.equal(
    (await read(m3)).member.credits,
    10,
    "Previously carried credits cannot carry twice",
  );
  assert.equal((await read(m3)).member.rollover_credits, 5);
  // Versioned external acceptance, immutable versions and tenant isolation.
  const doc = ok(
    await post({
      action: "waiver_document",
      title: "Operations waiver",
      version: "v1",
      text: "Studio acceptance document for staff records.",
    }),
  );
  ok(
    await post({
      action: "waiver_document",
      title: "Operations waiver",
      version: "v1",
      text: "A changed document must use a new version.",
    }),
    409,
  );
  const record = {
    action: "waiver_record",
    memberId: m3,
    documentId: doc.id,
    acceptedOn: new Date().toISOString().slice(0, 10),
    evidenceReference: "Archive shelf 12",
    confirmRecorded: true,
  };
  ok(await post({ ...record, confirmRecorded: false }), 400);
  ok(await post(record, b.cookie), 404);
  ok(await post(record, staffCookie));
  ok(await post(record), 409);
  assert.equal((await read(m3)).waiverRecords[0].version, "v1");
  const exported = await call("/api/studio/export", { cookie: a.cookie });
  ok(exported);
  assert(exported.data.member_waiver_records.some((x) => x.member_id === m3));
  ok(
    await post({
      action: "waitlist_policy",
      autoPromote: true,
      cutoffMinutes: 0,
      offerMinutes: 30,
    }),
  );
  console.log(
    "Staff operations passed: holds, concurrency, atomic moves, recurring retries, bulk rollback, rollover, waiver versions and tenant/role isolation.",
  );
};
