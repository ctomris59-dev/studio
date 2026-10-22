"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
type Row = {
  id: string;
  title: string;
  starts_at: string;
  status: string;
  series_id: string | null;
};
type Member = { id: string; full_name: string };
type Booking = {
  id: string;
  member_name: string;
  status: string;
  offer_expires_at: string | null;
  offer_closed: boolean;
};
type Pack = { id: string; name: string; credits: number; active: boolean };
type Data = {
  policy: { autoPromote: boolean; cutoffMinutes: number; offerMinutes: number };
  rules: { id: string; full_name: string; title: string; active: boolean; blocked: number }[];
  attempts: {
    session_id: string;
    title: string;
    starts_at: string;
    outcome: string;
    message: string;
  }[];
  documents: { id: string; title: string; version: string; body: string }[];
  member: { credits: number | null; rollover_credits: number; credit_cycle: number } | null;
  waiverRecords: {
    id: string;
    title: string;
    version: string;
    accepted_on: string;
    evidence_reference: string;
  }[];
  renewals: {
    id: string;
    carried_credits: number;
    expired_credits: number;
    new_credits: number;
    expiry_date: string;
  }[];
};
async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Operation failed.");
  return d;
}
export function StaffOperationsPanel({
  role,
  section,
  timezone,
  onChange,
}: {
  role: string;
  section: "classes" | "members" | "settings";
  timezone: string;
  onChange: () => void;
}) {
  const manage = ["owner", "manager"].includes(role),
    allowed = ["owner", "manager", "receptionist"].includes(role);
  const [data, setData] = useState<Data | null>(null),
    [classes, setClasses] = useState<Row[]>([]),
    [members, setMembers] = useState<Member[]>([]),
    [packs, setPacks] = useState<Pack[]>([]),
    [bookings, setBookings] = useState<Booking[]>([]);
  const [member, setMember] = useState(""),
    [session, setSession] = useState(""),
    [target, setTarget] = useState(""),
    [booking, setBooking] = useState("");
  const [search, setSearch] = useState(""),
    [classSearch, setClassSearch] = useState(""),
    [moreMembers, setMoreMembers] = useState(false),
    [moreClasses, setMoreClasses] = useState(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [revision, setRevision] = useState(0);
  const [end, setEnd] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [bulk, setBulk] = useState("instructor"),
    [value, setValue] = useState("");
  const [pack, setPack] = useState(""),
    [limit, setLimit] = useState(0),
    [confirmed, setConfirmed] = useState(false),
    [requestKey, setRequestKey] = useState("");
  const [document, setDocument] = useState(""),
    [accepted, setAccepted] = useState(""),
    [evidence, setEvidence] = useState(""),
    [attested, setAttested] = useState(false);
  const [title, setTitle] = useState(""),
    [version, setVersion] = useState(""),
    [text, setText] = useState("");
  const [policy, setPolicy] = useState({ autoPromote: true, cutoffMinutes: 0, offerMinutes: 30 });
  const label = (c: Row) =>
    c.title + " · " + new Date(c.starts_at).toLocaleString("en-GB", { timeZone: timezone });
  const reload = useCallback(async () => {
    const d = await api<Data>("/api/studio/operations" + (member ? "?memberId=" + member : ""));
    setData(d);
    setPolicy(d.policy);
  }, [member]);
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    void api<Data>("/api/studio/operations" + (member ? "?memberId=" + member : ""))
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setPolicy(d.policy);
        }
      })
      .catch((e) => {
        if (!cancelled) setMessage(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, member, revision]);
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void api<{ members: Member[]; hasMore: boolean }>(
        "/api/studio/members?search=" + encodeURIComponent(search),
      )
        .then((d) => {
          if (!cancelled) {
            setMembers(d.members);
            setMoreMembers(d.hasMore);
          }
        })
        .catch((e) => {
          if (!cancelled) setMessage(e.message);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [allowed, search, revision]);
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void api<{ classes: Row[]; hasMore: boolean }>(
        "/api/studio/classes?search=" + encodeURIComponent(classSearch),
      )
        .then((d) => {
          if (!cancelled) {
            setClasses(d.classes);
            setMoreClasses(d.hasMore);
          }
        })
        .catch((e) => {
          if (!cancelled) setMessage(e.message);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [allowed, classSearch, revision]);
  useEffect(() => {
    if (!allowed) return;
    void api<{ packages: Pack[] }>("/api/studio/packages")
      .then((d) => setPacks(d.packages.filter((p) => p.active)))
      .catch((e) => setMessage(e.message));
  }, [allowed, revision]);
  useEffect(() => {
    setBookings([]);
    setBooking("");
    if (!session) return;
    let cancelled = false;
    void api<{ bookings: Booking[] }>("/api/studio/bookings?sessionId=" + session)
      .then((d) => {
        if (!cancelled) setBookings(d.bookings);
      })
      .catch((e) => {
        if (!cancelled) setMessage(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [session, revision]);
  useEffect(() => {
    setConfirmed(false);
    setRequestKey(crypto.randomUUID());
  }, [member, pack, limit]);
  async function more(kind: "members" | "classes") {
    setBusy(true);
    try {
      if (kind === "members") {
        const d = await api<{ members: Member[]; hasMore: boolean }>(
          "/api/studio/members?search=" + encodeURIComponent(search) + "&offset=" + members.length,
        );
        setMembers((v) => [...v, ...d.members.filter((x) => !v.some((y) => y.id === x.id))]);
        setMoreMembers(d.hasMore);
      } else {
        const d = await api<{ classes: Row[]; hasMore: boolean }>(
          "/api/studio/classes?search=" +
            encodeURIComponent(classSearch) +
            "&offset=" +
            classes.length,
        );
        setClasses((v) => [...v, ...d.classes.filter((x) => !v.some((y) => y.id === x.id))]);
        setMoreClasses(d.hasMore);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load more.");
    } finally {
      setBusy(false);
    }
  }
  async function run(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await api("/api/studio/operations", body);
      setMessage("Saved. Review the updated records below.");
      setConfirmed(false);
      setAttested(false);
      setSelected([]);
      setRevision((v) => v + 1);
      onChange();
      await reload();
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Operation failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const submit = (body: Record<string, unknown>) => (e: FormEvent) => {
    e.preventDefault();
    void run(body);
  };
  if (!allowed) return null;
  const upcoming = classes.filter(
    (c) => c.status === "scheduled" && new Date(c.starts_at).getTime() > Date.now(),
  );
  const selectedPack = packs.find((p) => p.id === pack),
    balance = data?.member?.credits,
    carried = Math.min(Math.max(0, (balance ?? 0) - (data?.member?.rollover_credits ?? 0)), limit);
  return (
    <section className="rd-live-section" aria-label="Staff operations">
      <h2>
        {section === "settings"
          ? "Reservation policies & waiver versions"
          : section === "classes"
            ? "Reservation tools"
            : "Package renewal & waiver records"}
      </h2>
      <p className="rd-tiny">
        For your studio team. Contact members using your usual channels; follow-up tasks keep track
        of required contact.
      </p>
      <p className="rd-feedback" role="status" aria-live="polite">
        {message}
      </p>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
        {section !== "settings" && (
          <div className="rd-form">
            <label>
              Find member
              <input maxLength={80} value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <label>
              Member
              <select
                value={member}
                onChange={(e) => {
                  setMember(e.target.value);
                  setData(null);
                }}
              >
                <option value="">Choose a member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </label>
            {moreMembers && (
              <button type="button" onClick={() => void more("members")}>
                Load more members
              </button>
            )}
          </div>
        )}
        {section === "classes" && (
          <>
            <div className="rd-form">
              <label>
                Find class
                <input
                  maxLength={80}
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                />
              </label>
              <label>
                Source / recurring class
                <select value={session} onChange={(e) => setSession(e.target.value)}>
                  <option value="">Choose a class</option>
                  {upcoming.map((c) => (
                    <option key={c.id} value={c.id}>
                      {label(c)}
                    </option>
                  ))}
                </select>
              </label>
              {moreClasses && (
                <button type="button" onClick={() => void more("classes")}>
                  Load more classes
                </button>
              )}
            </div>
            <details className="rd-ops-details">
              <summary>Waitlist holds</summary>
              <p>
                Process the list to release expired holds and offer available places to eligible
                members in order. Holds require staff confirmation after contacting the member.
              </p>
              <button
                disabled={!session}
                onClick={() => void run({ action: "process_waitlist", sessionId: session })}
              >
                Process waitlist
              </button>
              {bookings
                .filter((b) => b.status === "waitlisted")
                .map((b) => (
                  <div key={b.id} className="rd-contact-row">
                    <b>{b.member_name}</b>
                    <span>
                      {b.offer_expires_at
                        ? "Held until " +
                          new Date(b.offer_expires_at).toLocaleString("en-GB", {
                            timeZone: timezone,
                          })
                        : b.offer_closed
                          ? "Offer closed"
                          : "Waiting"}
                    </span>
                    {b.offer_expires_at && new Date(b.offer_expires_at).getTime() > Date.now() && (
                      <>
                        <button
                          onClick={() =>
                            void run({
                              action: "offer_decision",
                              bookingId: b.id,
                              decision: "accept",
                            })
                          }
                        >
                          Confirm place
                        </button>
                        <button
                          onClick={() =>
                            void run({
                              action: "offer_decision",
                              bookingId: b.id,
                              decision: "decline",
                            })
                          }
                        >
                          Decline / release
                        </button>
                      </>
                    )}
                  </div>
                ))}
            </details>
            <details className="rd-ops-details">
              <summary>Move a reservation</summary>
              <form
                className="rd-form"
                onSubmit={submit({
                  action: "move_booking",
                  bookingId: booking,
                  targetSessionId: target,
                })}
              >
                <p>
                  Move a confirmed reservation before its cancellation deadline. Its existing credit
                  follows it; a failed move leaves it in place.
                </p>
                <label>
                  Reservation
                  <select required value={booking} onChange={(e) => setBooking(e.target.value)}>
                    <option value="">Choose reservation</option>
                    {bookings
                      .filter((b) => b.status === "booked")
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.member_name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Destination class
                  <select required value={target} onChange={(e) => setTarget(e.target.value)}>
                    <option value="">Choose destination</option>
                    {upcoming
                      .filter((c) => c.id !== session)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {label(c)}
                        </option>
                      ))}
                  </select>
                </label>
                <button className="rd-primary">Move reservation</button>
              </form>
            </details>
            <details className="rd-ops-details">
              <summary>Recurring member reservations</summary>
              <form
                className="rd-form"
                onSubmit={submit({
                  action: "create_recurring",
                  memberId: member,
                  sessionId: session,
                  endDate: end,
                })}
              >
                <p>
                  Choose a member and a class from a recurring series above. Reserve the already
                  scheduled occurrences on that weekday and time, for up to 12 weeks. Blocked dates
                  remain visible for staff to retry.
                </p>
                <label>
                  Through date
                  <input
                    required
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
                <button
                  className="rd-primary"
                  disabled={!member || !classes.find((c) => c.id === session)?.series_id}
                >
                  Create recurring reservations
                </button>
              </form>
              {data?.rules.map((r) => (
                <div key={r.id} className="rd-contact-row">
                  <b>
                    {r.full_name} · {r.title}
                  </b>
                  <span>
                    {r.active ? "Active" : "Stopped"} · {r.blocked} blocked
                  </span>
                  {r.active && (
                    <>
                      <button
                        onClick={() => void run({ action: "retry_recurring", reservationId: r.id })}
                      >
                        Retry blocked dates
                      </button>
                      <button
                        onClick={() => void run({ action: "stop_recurring", reservationId: r.id })}
                      >
                        Stop retries
                      </button>
                    </>
                  )}
                </div>
              ))}
              <p className="rd-tiny">
                Stopping a rule keeps existing reservations. It does not add future unscheduled
                classes.
              </p>
              {data?.attempts.map((a) => (
                <p key={a.session_id}>
                  {a.title} ·{" "}
                  {new Date(a.starts_at).toLocaleString("en-GB", { timeZone: timezone })}:{" "}
                  {a.outcome} {a.message}
                </p>
              ))}
            </details>
            {manage && (
              <details className="rd-ops-details">
                <summary>Bulk schedule changes</summary>
                <form
                  className="rd-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (window.confirm(`Apply ${bulk} to ${selected.length} selected classes?`))
                      void run({
                        action: "bulk_classes",
                        sessionIds: selected,
                        operation: bulk,
                        value,
                      });
                  }}
                >
                  <p>
                    Select up to 52 classes. Conflicting changes are rejected together. Cancelling
                    returns eligible booking credits and creates contact tasks.
                  </p>
                  <div style={{ maxHeight: 280, overflow: "auto" }}>
                    {upcoming.map((c) => (
                      <label className="rd-check" key={c.id}>
                        <input
                          type="checkbox"
                          checked={selected.includes(c.id)}
                          onChange={(e) =>
                            setSelected((v) =>
                              e.target.checked ? [...v, c.id] : v.filter((x) => x !== c.id),
                            )
                          }
                        />
                        {label(c)}
                      </label>
                    ))}
                  </div>
                  <label>
                    Change
                    <select value={bulk} onChange={(e) => setBulk(e.target.value)}>
                      <option value="instructor">Instructor</option>
                      <option value="room">Room</option>
                      <option value="cancel">Cancel classes</option>
                    </select>
                  </label>
                  {bulk !== "cancel" && (
                    <label>
                      New {bulk}
                      <input
                        required
                        minLength={2}
                        maxLength={80}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                      />
                    </label>
                  )}
                  <button
                    className="rd-primary"
                    disabled={!selected.length || selected.length > 52}
                  >
                    Apply to {selected.length} classes
                  </button>
                </form>
              </details>
            )}
          </>
        )}
        {section === "members" && member && (
          <>
            {manage && (
              <details className="rd-ops-details">
                <summary>Renew package with credit carryover</summary>
                <form
                  className="rd-form"
                  onSubmit={submit({
                    action: "renew_package",
                    memberId: member,
                    packageId: pack,
                    rolloverLimit: limit,
                    expectedCycle: data?.member?.credit_cycle,
                    requestKey,
                  })}
                >
                  <p>
                    Renewal starts today. Finish or cancel future confirmed bookings first. Carried
                    credits are used first and expire at the end of the new package; they cannot
                    carry over again.
                  </p>
                  <p>
                    Current balance: {balance === null ? "Unlimited" : (balance ?? "Loading…")} ·
                    Previously carried: {data?.member?.rollover_credits ?? 0}
                  </p>
                  <label>
                    New package
                    <select required value={pack} onChange={(e) => setPack(e.target.value)}>
                      <option value="">Choose package</option>
                      {packs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.credits} credits
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Maximum credits to carry
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                    />
                  </label>
                  {selectedPack && typeof balance === "number" && (
                    <p>
                      Carry {carried} · Expire {balance - carried} · New balance{" "}
                      {selectedPack.credits + carried}
                    </p>
                  )}
                  <label className="rd-check">
                    <input
                      type="checkbox"
                      required
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />{" "}
                    I have reviewed this renewal and the credits that will expire.
                  </label>
                  <button
                    className="rd-primary"
                    disabled={!data?.member || typeof balance !== "number" || !confirmed}
                  >
                    Renew package
                  </button>
                </form>
                {data?.renewals.map((r) => (
                  <p key={r.id}>
                    Carried {r.carried_credits} · Expired {r.expired_credits} · Balance at renewal{" "}
                    {r.new_credits} · Valid through {String(r.expiry_date).slice(0, 10)}
                  </p>
                ))}
              </details>
            )}
            <details className="rd-ops-details">
              <summary>Record signed waiver</summary>
              <form
                className="rd-form"
                onSubmit={submit({
                  action: "waiver_record",
                  memberId: member,
                  documentId: document,
                  acceptedOn: accepted,
                  evidenceReference: evidence,
                  confirmRecorded: attested,
                })}
              >
                <p>
                  Record acceptance obtained outside StudioTasker. Keep the signed original in your
                  studio’s records.
                </p>
                <label>
                  Document version
                  <select required value={document} onChange={(e) => setDocument(e.target.value)}>
                    <option value="">Choose version</option>
                    {data?.documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} · {d.version}
                      </option>
                    ))}
                  </select>
                </label>
                {document && (
                  <pre style={{ whiteSpace: "pre-wrap" }}>
                    {data?.documents.find((d) => d.id === document)?.body}
                  </pre>
                )}
                <label>
                  Acceptance date
                  <input
                    type="date"
                    required
                    value={accepted}
                    onChange={(e) => setAccepted(e.target.value)}
                  />
                </label>
                <label>
                  Signed document reference
                  <input
                    required
                    minLength={3}
                    maxLength={200}
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                  />
                </label>
                <label className="rd-check">
                  <input
                    required
                    type="checkbox"
                    checked={attested}
                    onChange={(e) => setAttested(e.target.checked)}
                  />{" "}
                  I verified acceptance of this exact document version.
                </label>
                <button className="rd-primary">Record acceptance</button>
              </form>
              {data?.waiverRecords.map((r) => (
                <p key={r.id}>
                  {r.title} · {r.version} · {String(r.accepted_on).slice(0, 10)} ·{" "}
                  {r.evidence_reference}
                </p>
              ))}
            </details>
          </>
        )}
        {section === "settings" && manage && (
          <>
            <details className="rd-ops-details">
              <summary>Waitlist policy</summary>
              <form className="rd-form" onSubmit={submit({ action: "waitlist_policy", ...policy })}>
                <label className="rd-check">
                  <input
                    type="checkbox"
                    checked={policy.autoPromote}
                    onChange={(e) => setPolicy({ ...policy, autoPromote: e.target.checked })}
                  />{" "}
                  Automatically confirm eligible waiting members
                </label>
                <label>
                  Stop automatic confirmation this many minutes before class
                  <input
                    type="number"
                    required
                    min={0}
                    max={10080}
                    value={policy.cutoffMinutes}
                    onChange={(e) =>
                      setPolicy({ ...policy, cutoffMinutes: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Staff hold duration (minutes)
                  <input
                    type="number"
                    required
                    min={5}
                    max={1440}
                    value={policy.offerMinutes}
                    onChange={(e) => setPolicy({ ...policy, offerMinutes: Number(e.target.value) })}
                  />
                </label>
                <p>
                  Within the cutoff, or when automatic confirmation is off, staff contact the member
                  and confirm a timed hold. Expired holds advance when staff process the list or
                  another booking operation runs.
                </p>
                <button className="rd-primary" disabled={!data}>
                  Save waitlist policy
                </button>
              </form>
            </details>
            <details className="rd-ops-details">
              <summary>Studio waiver document versions</summary>
              <form
                className="rd-form"
                onSubmit={submit({ action: "waiver_document", title, version, text })}
              >
                <p>
                  Saved versions cannot be overwritten. Add a new version when your document
                  changes.
                </p>
                <label>
                  Document title
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label>
                  Version
                  <input
                    required
                    maxLength={40}
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </label>
                <label>
                  Document text
                  <textarea
                    required
                    minLength={10}
                    maxLength={10000}
                    rows={8}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
                <button className="rd-primary">Save document version</button>
              </form>
              {data?.documents.map((d) => (
                <details key={d.id}>
                  <summary>
                    {d.title} · {d.version}
                  </summary>
                  <p style={{ whiteSpace: "pre-wrap" }}>{d.body}</p>
                </details>
              ))}
            </details>
          </>
        )}
      </fieldset>
    </section>
  );
}
