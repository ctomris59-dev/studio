import "server-only";
import type { PoolClient } from "pg";
import type { Authenticated } from "./auth";
import { StudioOperationError } from "./studio-booking";

// Always lock the class before the member. Consume carried credits first.
export async function debitBookingCredit(
  client: PoolClient,
  auth: Authenticated,
  memberId: string,
  bookingId: string,
) {
  const m = await client.query<{
    credits: number | null;
    rollover_credits: number;
    credit_cycle: number;
  }>(
    "SELECT credits,rollover_credits,credit_cycle FROM people WHERE studio_id=$1 AND id=$2 FOR UPDATE",
    [auth.studioId, memberId],
  );
  if (!m.rowCount) throw new StudioOperationError(404, "Member not found.");
  const p = m.rows[0];
  if (p.credits === null) return;
  if (p.credits < 1)
    throw new StudioOperationError(409, "The member does not have enough class credits.");
  const carried = p.rollover_credits > 0 ? 1 : 0;
  await client.query(
    "UPDATE people SET credits=credits-1,rollover_credits=rollover_credits-$3,updated_at=now() WHERE studio_id=$1 AND id=$2",
    [auth.studioId, memberId, carried],
  );
  await client.query(
    "INSERT INTO credit_ledger(studio_id,member_id,booking_id,delta,reason,created_by,credit_cycle,rollover_amount) VALUES($1,$2,$3,-1,'class_booking',$4,$5,$6)",
    [auth.studioId, memberId, bookingId, auth.userId, p.credit_cycle, carried],
  );
}

export async function refundBookingCredit(
  client: PoolClient,
  auth: Authenticated,
  memberId: string,
  bookingId: string,
) {
  const m = await client.query<{ credits: number | null; credit_cycle: number }>(
    "SELECT credits,credit_cycle FROM people WHERE studio_id=$1 AND id=$2 FOR UPDATE",
    [auth.studioId, memberId],
  );
  const debit = await client.query<{ id: string; credit_cycle: number; rollover_amount: number }>(
    "SELECT id,credit_cycle,rollover_amount FROM credit_ledger WHERE studio_id=$1 AND booking_id=$2 AND reason='class_booking'",
    [auth.studioId, bookingId],
  );
  if (!debit.rowCount || !m.rowCount || m.rows[0].credits === null) return false;
  const d = debit.rows[0];
  const prior = await client.query("SELECT 1 FROM credit_ledger WHERE reversal_of=$1", [d.id]);
  if (prior.rowCount) return false;
  // A credit from a superseded package must never become a fresh credit.
  if (m.rows[0].credit_cycle !== d.credit_cycle) {
    await client.query(
      "INSERT INTO activity_log(studio_id,person_id,actor_id,action,details) VALUES($1,$2,$3,'booking.expired_credit_not_refunded',jsonb_build_object('bookingId',$4::text))",
      [auth.studioId, memberId, auth.userId, bookingId],
    );
    return false;
  }
  await client.query(
    "UPDATE people SET credits=credits+1,rollover_credits=rollover_credits+$3,updated_at=now() WHERE studio_id=$1 AND id=$2",
    [auth.studioId, memberId, d.rollover_amount],
  );
  await client.query(
    "INSERT INTO credit_ledger(studio_id,member_id,booking_id,delta,reason,reversal_of,created_by,credit_cycle,rollover_amount) VALUES($1,$2,$3,1,'class_refund',$4,$5,$6,$7)",
    [auth.studioId, memberId, bookingId, d.id, auth.userId, d.credit_cycle, d.rollover_amount],
  );
  return true;
}
