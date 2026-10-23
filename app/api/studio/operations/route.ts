import { NextRequest } from "next/server";
import { authenticated } from "@/lib/server/auth";
import {
  jsonObject,
  errorResponse,
  successResponse,
  backendError,
  sameOrigin,
} from "@/lib/server/responses";
import { staffOperation } from "@/lib/server/staff-operations";
import { StudioOperationError, validUUID } from "@/lib/server/studio-booking";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return errorResponse(403, "Invalid request origin.");
  try {
    const r = await authenticated(
      request,
      ["owner", "manager", "receptionist"],
      async (client, auth) => {
        const body = await jsonObject(request);
        if (!body) throw new StudioOperationError(400, "Invalid request.");
        return staffOperation(client, auth, body);
      },
    );
    return r.access.ok
      ? successResponse({ result: r.value })
      : errorResponse(r.access.status, r.access.message);
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      return errorResponse(409, "This record already exists.");
    return e instanceof StudioOperationError ? errorResponse(e.status, e.message) : backendError();
  }
}
export async function GET(request: NextRequest) {
  try {
    const r = await authenticated(
      request,
      ["owner", "manager", "receptionist"],
      async (client, auth) => {
        const memberId = request.nextUrl.searchParams.get("memberId") || null;
        if (memberId && !validUUID(memberId))
          throw new StudioOperationError(400, "Invalid member.");
        const policy = await client.query(
          'SELECT waitlist_auto_promote AS "autoPromote",waitlist_auto_cutoff_minutes AS "cutoffMinutes",waitlist_offer_minutes AS "offerMinutes" FROM studios WHERE id=$1',
          [auth.studioId],
        );
        const rules = await client.query(
          `SELECT r.*,p.full_name,c.title,(SELECT count(*)::int FROM recurring_booking_attempts a WHERE a.studio_id=r.studio_id AND a.reservation_id=r.id AND a.outcome='blocked') blocked
    FROM recurring_reservations r JOIN people p ON p.studio_id=r.studio_id AND p.id=r.member_id JOIN class_sessions c ON c.studio_id=r.studio_id AND c.id=r.anchor_session_id
    WHERE r.studio_id=$1 AND ($2::uuid IS NULL OR r.member_id=$2) ORDER BY r.created_at DESC,r.id LIMIT 100`,
          [auth.studioId, memberId],
        );
        const attempts = memberId
          ? await client.query(
              `SELECT a.*,c.title,c.starts_at FROM recurring_booking_attempts a JOIN recurring_reservations r ON r.studio_id=a.studio_id AND r.id=a.reservation_id
    JOIN class_sessions c ON c.studio_id=a.studio_id AND c.id=a.session_id WHERE a.studio_id=$1 AND r.member_id=$2 ORDER BY c.starts_at DESC LIMIT 100`,
              [auth.studioId, memberId],
            )
          : { rows: [] };
        const documents = await client.query(
          "SELECT id,title,version,body,created_at FROM studio_waiver_documents WHERE studio_id=$1 AND active=true ORDER BY created_at DESC LIMIT 100",
          [auth.studioId],
        );
        const member = memberId
          ? await client.query(
              "SELECT id,credits,rollover_credits,credit_cycle,expiry_date::text,package_status,waiver_status FROM people WHERE studio_id=$1 AND id=$2 AND archived_at IS NULL AND kind='member'",
              [auth.studioId, memberId],
            )
          : { rows: [] };
        const records = memberId
          ? await client.query(
              "SELECT r.*,d.title,d.version FROM member_waiver_records r JOIN studio_waiver_documents d ON d.studio_id=r.studio_id AND d.id=r.document_id WHERE r.studio_id=$1 AND r.member_id=$2 ORDER BY r.created_at DESC LIMIT 100",
              [auth.studioId, memberId],
            )
          : { rows: [] };
        const renewals = memberId
          ? await client.query(
              "SELECT * FROM package_renewals WHERE studio_id=$1 AND member_id=$2 ORDER BY created_at DESC LIMIT 50",
              [auth.studioId, memberId],
            )
          : { rows: [] };
        return {
          policy: policy.rows[0],
          rules: rules.rows,
          attempts: attempts.rows,
          documents: documents.rows,
          member: member.rows[0] || null,
          waiverRecords: records.rows,
          renewals: renewals.rows,
        };
      },
    );
    return r.access.ok
      ? successResponse(r.value)
      : errorResponse(r.access.status, r.access.message);
  } catch (e) {
    return e instanceof StudioOperationError ? errorResponse(e.status, e.message) : backendError();
  }
}
