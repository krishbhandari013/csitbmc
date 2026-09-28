"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import NepaliDate from "nepali-date-converter";
import { useToast } from "@/components/client";
import {
  AbsentBadge, AnonBadge, Dialog, EmptyState, ErrorState, Field, PresentBadge,
  SkeletonList, Stat, StatusBadge,
} from "@/components/ui";
import {
  IconAlert, IconBack, IconBook, IconCalendar, IconCheck, IconDoc, IconPlus, IconX,
} from "@/components/icons";
import {
  reportError,
  useAddTopic,
  useAssignments,
  useAttendance,
  useCreateAssignment,
  useDeleteTopic,
  useMarkAttendance,
  useSession,
  useSubject,
  useToggleSubmission,
  useToggleTopic,
  type AttendanceData,
  type SessionUser,
  type SubjectItem,
  type TopicItem,
} from "@/lib/hooks";

const BS_MONTHS = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
type Tab = "attendance" | "assignments" | "status";
type Show = (text: string, ok?: boolean) => void;

function currentBs(): { y: string; m: string } {
  try {
    const b = new NepaliDate(new Date()).getBS() as unknown as { year: number; month: number };
    return { y: String(b.year), m: String(b.month + 1) };
  } catch {
    return { y: "2083", m: "6" };
  }
}

function fmtDate(iso: string) {
  return iso.slice(0, 10);
}

function canEditRole(me: SessionUser | null | undefined) {
  return me?.role === "ADMIN" || me?.role === "TEACHER";
}

/* ============================== ATTENDANCE ============================== */

function AttendanceTab({ subjectId, me, show }: { subjectId: string; me: SessionUser | null; show: Show }) {
  const now = useMemo(currentBs, []);
  const [bsYear, setBsYear] = useState(now.y);
  const [bsMonth, setBsMonth] = useState(now.m);
  const [markDate, setMarkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, "P" | "A">>({});
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  const canEdit = canEditRole(me);
  const att = useAttendance(subjectId, bsYear, bsMonth);
  const markMutation = useMarkAttendance(subjectId);
  const data: AttendanceData | undefined = att.data;

  const dates: string[] = useMemo(() => {
    if (!data?.records) return [];
    return Array.from(new Set(data.records.map((r) => fmtDate(r.date)))).sort() as string[];
  }, [data]);

  const grid = useMemo(() => {
    const m: Record<string, Record<string, string>> = {};
    for (const r of data?.records ?? []) {
      const roll = r.student?.rollNumber ?? r.studentId ?? "";
      (m[roll] ??= {})[fmtDate(r.date)] = r.status;
    }
    return m;
  }, [data]);

  const dirtyIds = Object.keys(marks);
  const students = data?.students ?? [];
  const pCount = students.filter((s) => (marks[s.id] ?? "P") === "P").length;

  async function save() {
    const list = students.map((s) => ({ studentId: s.id, status: marks[s.id] ?? ("P" as const) }));
    if (!list.length || markMutation.isPending) return;
    try {
      await markMutation.mutateAsync({ date: markDate, marks: list });
      setMarks({});
      setConfirming(false);
      show(`Attendance saved for ${list.length} students on ${markDate}.`);
    } catch (err) {
      reportError(show, err, router);
    }
  }

  function jumpToCurrentMonth() {
    const c = currentBs();
    setBsYear(c.y); setBsMonth(c.m);
  }

  const loading = att.isPending;
  const refreshing = att.isFetching && !att.isPending;

  return (
    <section aria-label="Attendance" className="space-y-3.5">
      <div className="card card-pad">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="section-title flex items-center gap-2"><IconCalendar className="h-5 w-5 text-brand-700" />Attendance</h2>
          <span className="badge-slate">Bikram Sambat filter</span>
          {refreshing && <span className="tiny ml-auto" aria-live="polite">Updating…</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:flex sm:items-end">
          <div className="min-w-0">
            <label className="label" htmlFor="bsy">BS year</label>
            <input id="bsy" inputMode="numeric" pattern="[0-9]*" className="input" value={bsYear}
              onChange={(e) => setBsYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} aria-describedby="bs-hint" />
          </div>
          <div className="min-w-0 sm:w-52">
            <label className="label" htmlFor="bsm">BS month</label>
            <select id="bsm" className="input" value={bsMonth} onChange={(e) => setBsMonth(e.target.value)}>
              {BS_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <button className="btn-secondary btn-sm col-span-2 sm:col-auto" onClick={jumpToCurrentMonth}>This month</button>
        </div>
        <p id="bs-hint" className="hint mt-2">Showing {BS_MONTHS[Number(bsMonth) - 1] ?? "—"} {bsYear} BS. Dates are stored in AD and converted automatically.</p>
        <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px] font-medium">
          <span className="font-semibold text-slate-500">Legend:</span> <PresentBadge /> <AbsentBadge />
        </p>
      </div>

      {loading && <SkeletonList rows={3} />}
      {!loading && att.isError && (
        <ErrorState
          message={att.error instanceof Error ? att.error.message : "Could not load attendance."}
          onRetry={() => att.refetch()}
        />
      )}

      {!loading && !att.isError && me?.role === "STUDENT" && data && (
        <StudentAttendance data={data} bsLabel={`${BS_MONTHS[Number(bsMonth) - 1]} ${bsYear}`} />
      )}

      {!loading && !att.isError && canEdit && data?.students && (
        <>
          <div className="card card-pad">
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="min-w-0 flex-1 sm:max-w-[220px]">
                <label className="label" htmlFor="md">Marking date (AD)</label>
                <input id="md" type="date" className="input" value={markDate} onChange={(e) => setMarkDate(e.target.value)} />
              </div>
              <button className="btn-secondary btn-sm" onClick={() => {
                const all: Record<string, "P" | "A"> = {};
                for (const s of students) all[s.id] = "P";
                setMarks(all);
              }}>All present</button>
              <button className="btn-ghost btn-sm" onClick={() => setMarks({})}>Reset</button>
            </div>

            <ul className="mt-3 space-y-2" role="list" aria-label="Mark attendance">
              {students.map((s) => {
                const v = marks[s.id] ?? "P";
                return (
                  <li key={s.id} className={`flex items-center gap-3 rounded-[12px] border p-3 transition-colors ${v === "P" ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-bold">{s.rollNumber}</p>
                      <p className="truncate text-[13px] text-slate-500">{s.name}</p>
                    </div>
                    <div className="segmented shrink-0" role="radiogroup" aria-label={`Mark ${s.rollNumber} present or absent`}>
                      {(["P", "A"] as const).map((opt) => (
                        <button key={opt} type="button" role="radio" aria-checked={v === opt}
                          aria-label={`${s.rollNumber} ${opt === "P" ? "present" : "absent"}`}
                          onClick={() => setMarks((m) => ({ ...m, [s.id]: opt }))}
                          className={opt === "P" && v === "P" ? "!bg-emerald-600 !text-white" : opt === "A" && v === "A" ? "!bg-rose-600 !text-white" : ""}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    <span className="sr-only">{v === "P" ? "Present" : "Absent"}</span>
                  </li>
                );
              })}
            </ul>
            {students.length === 0 && <p className="muted mt-2">No active students in this semester.</p>}
          </div>

          {dates.length > 0 && (
            <div className="card card-pad">
              <h3 className="font-bold">History <span className="font-medium text-slate-500">· {dates.length} day{dates.length === 1 ? "" : "s"} in filter</span></h3>
              <div className="table-wrap mt-2.5">
                <table className="data !min-w-[480px]">
                  <thead><tr>
                    <th className="sticky left-0 bg-slate-50 shadow-[1px_0_0_0_#e2e8f0]">Roll</th>
                    {dates.map((d) => <th key={d} className="text-center">{d.slice(5).replace("-", "/")}</th>)}
                  </tr></thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td className="sticky left-0 bg-white font-mono text-[13px] font-bold shadow-[1px_0_0_0_#f1f5f9]">{s.rollNumber}</td>
                        {dates.map((d) => {
                          const st = grid[s.rollNumber]?.[d];
                          return (
                            <td key={d} className="text-center">
                              {st === "P" && <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><IconCheck className="h-4 w-4" />P<span className="sr-only">resent</span></span>}
                              {st === "A" && <span className="inline-flex items-center gap-1 font-bold text-rose-700"><IconX className="h-4 w-4" />A<span className="sr-only">bsent</span></span>}
                              {!st && <span className="text-slate-300" aria-label="No record">–</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dirtyIds.length > 0 && !confirming && (
            <div className="fixed inset-x-0 bottom-[72px] z-30 px-4 md:bottom-6">
              <div className="mx-auto flex w-full max-w-2xl items-center gap-3 rounded-[14px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                <p className="min-w-0 flex-1 text-sm"><strong>{dirtyIds.length} marked</strong> <span className="text-slate-500">({pCount} present · {students.length - pCount} absent)</span></p>
                <button className="btn-primary btn-sm !min-h-[44px]" onClick={() => setConfirming(true)}>Review & save</button>
              </div>
            </div>
          )}

          {confirming && (
            <Dialog
              title="Save attendance?"
              onClose={() => setConfirming(false)}
              actions={<>
                <button className="btn-secondary" onClick={() => setConfirming(false)} disabled={markMutation.isPending}>Keep editing</button>
                <button className="btn-primary" onClick={save} disabled={markMutation.isPending}>{markMutation.isPending ? "Saving…" : `Save for ${students.length}`}</button>
              </>}
            >
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-[10px] bg-slate-50 p-3"><dt className="tiny">Date (AD)</dt><dd className="font-bold">{markDate}</dd></div>
                <div className="rounded-[10px] bg-slate-50 p-3"><dt className="tiny">Students</dt><dd className="font-bold">{students.length}</dd></div>
                <div className="rounded-[10px] bg-emerald-50 p-3"><dt className="tiny">Present</dt><dd className="font-bold text-emerald-800">{pCount} P</dd></div>
                <div className="rounded-[10px] bg-rose-50 p-3"><dt className="tiny">Absent</dt><dd className="font-bold text-rose-800">{students.length - pCount} A</dd></div>
              </dl>
              <p className="hint mt-3">Untouched students are saved as Present. Saving again for the same date overwrites previous marks.</p>
            </Dialog>
          )}
        </>
      )}
    </section>
  );
}

function StudentAttendance({ data, bsLabel }: { data: AttendanceData; bsLabel: string }) {
  const mine = data.mine ?? [];
  const p = mine.filter((r) => r.status === "P").length;
  const pct = mine.length ? Math.round((p / mine.length) * 100) : null;
  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Present" value={`${p}`} sub={bsLabel} />
        <Stat label="Absent" value={`${mine.length - p}`} sub={bsLabel} />
        <Stat label="Rate" value={pct === null ? "–" : `${pct}%`} sub={mine.length ? `${mine.length} classes` : "No classes"} />
      </div>
      <div className="card card-pad">
        <h3 className="font-bold">My records <span className="font-medium text-slate-500">· {bsLabel} BS</span></h3>
        {mine.length === 0 ? (
          <p className="muted mt-2">No attendance recorded for you in this month yet.</p>
        ) : (
          <ul className="mt-2.5 divide-y divide-slate-100" role="list">
            {mine.map((r, i) => (
              <li key={r.id ?? `${r.date}-${i}`} className="flex items-center gap-3 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><IconCalendar className="h-4 w-4 text-slate-400" />{fmtDate(r.date)}</span>
                <span className="ml-auto">{r.status === "P" ? <PresentBadge /> : <AbsentBadge />}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {(data.roster ?? []).length > 0 && (
        <details className="card card-pad group">
          <summary className="cursor-pointer list-none text-sm font-bold marker:hidden">
            <span className="inline-flex min-h-[44px] items-center gap-2">Semester roll-number list <span className="badge-slate">read-only</span>
              <span className="text-slate-400 transition-transform group-open:rotate-90" aria-hidden>›</span>
            </span>
          </summary>
          <div className="table-wrap mt-2">
            <table className="data !min-w-[420px]">
              <thead><tr><th>Date</th><th>Roll number</th><th>Status</th></tr></thead>
              <tbody>
                {data.roster!.slice(0, 100).map((r, i) => (
                  <tr key={i}><td>{fmtDate(r.date)}</td><td className="font-mono font-semibold">{r.rollNumber}</td>
                    <td>{r.status === "P" ? "Present (P)" : "Absent (A)"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

/* ============================== ASSIGNMENTS ============================== */

function AssignmentsTab({ subjectId, me, show }: { subjectId: string; me: SessionUser | null; show: Show }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", link: "" });
  const [formError, setFormError] = useState("");
  const router = useRouter();

  const canEdit = canEditRole(me);
  const list = useAssignments(subjectId);
  const createMutation = useCreateAssignment(subjectId);
  const toggleMutation = useToggleSubmission(subjectId);
  const items = list.data?.assignments ?? [];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (form.title.trim().length < 3) { setFormError("Title needs at least 3 characters."); return; }
    if (!form.dueDate) { setFormError("Choose a due date."); return; }
    setFormError("");
    try {
      await createMutation.mutateAsync({ ...form, title: form.title.trim() });
      setForm({ title: "", description: "", dueDate: "", link: "" });
      setCreating(false);
      show("Assignment created for the whole class.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the assignment.");
    }
  }

  async function toggle(aid: string, studentId: string, to: boolean, roll: string) {
    try {
      await toggleMutation.mutateAsync({ assignmentId: aid, studentId, isComplete: to });
      show(`${roll} marked ${to ? "complete" : "incomplete"}.`);
    } catch (err) {
      reportError(show, err, router);
    }
  }

  const loading = list.isPending;

  return (
    <section aria-label="Assignments" className="space-y-3.5">
      <div className="flex items-center gap-2">
        <h2 className="section-title flex items-center gap-2"><IconDoc className="h-5 w-5 text-brand-700" />Assignments</h2>
        <span className="badge-slate">{items.length}</span>
        {list.isFetching && !list.isPending && <span className="tiny" aria-live="polite">Updating…</span>}
        {canEdit && <button className="btn-primary btn-sm ml-auto" onClick={() => { setCreating(true); setFormError(""); }}><IconPlus />New</button>}
      </div>

      {loading && <SkeletonList rows={2} />}
      {!loading && list.isError && (
        <ErrorState
          message={list.error instanceof Error ? list.error.message : "Could not load assignments."}
          onRetry={() => list.refetch()}
        />
      )}
      {!loading && !list.isError && items.length === 0 && (
        <EmptyState
          icon={<IconDoc className="h-6 w-6" />}
          title="No assignments yet"
          sub={canEdit ? "Create the first assignment for this subject." : "Your teacher has not posted any assignments for this subject."}
          action={canEdit ? <button className="btn-primary" onClick={() => setCreating(true)}><IconPlus />Create assignment</button> : undefined}
        />
      )}

      {items.map((a) => {
        const overdue = new Date(a.dueDate) < new Date();
        const mine = a.submissions?.[0];
        const doneCount = canEdit ? a.submissions?.filter((s) => s.isComplete).length ?? 0 : 0;
        return (
          <article key={a.id} className="card card-pad">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 flex-1 break-words font-bold">{a.title}</h3>
              {overdue
                ? <StatusBadge tone="red" icon={<IconAlert className="h-3.5 w-3.5" />}>Overdue · due {fmtDate(a.dueDate)}</StatusBadge>
                : <StatusBadge tone="sky" icon={<IconCalendar className="h-3.5 w-3.5" />}>Due {fmtDate(a.dueDate)}</StatusBadge>}
            </div>
            {a.description && <p className="muted mt-1.5 whitespace-pre-wrap break-words">{a.description}</p>}
            {a.link && <a className="mt-1.5 inline-block break-all text-sm font-semibold text-brand-700 underline-offset-2 hover:underline" href={a.link} target="_blank" rel="noreferrer">Open attachment / link</a>}

            {me?.role === "STUDENT" && mine && (
              <p className="mt-3">
                {mine.isComplete
                  ? <StatusBadge tone="green" icon={<IconCheck className="h-3.5 w-3.5" />}>Complete — submitted</StatusBadge>
                  : <StatusBadge tone="amber" icon={<IconX className="h-3.5 w-3.5" />}>{overdue ? "Incomplete — overdue" : "Incomplete — pending"}</StatusBadge>}
              </p>
            )}

            {canEdit && a.submissions && (
              <div className="mt-3 border-t border-slate-100 pt-2.5">
                <p className="tiny font-semibold uppercase tracking-wide">Class status · {doneCount}/{a.submissions.length} complete</p>
                <ul className="mt-2 space-y-1.5" role="list">
                  {a.submissions.map((s) => {
                    const sid = s.studentId ?? s.student?.id ?? "";
                    const busyRow = toggleMutation.isPending && toggleMutation.variables?.studentId === sid && toggleMutation.variables?.assignmentId === a.id;
                    return (
                      <li key={s.id} className="flex items-center gap-2.5 rounded-[10px] bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                        <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-bold">{s.student?.rollNumber}</span>
                        {s.isComplete
                          ? <StatusBadge tone="green" icon={<IconCheck className="h-3.5 w-3.5" />}>Complete</StatusBadge>
                          : <StatusBadge tone="amber" icon={<IconX className="h-3.5 w-3.5" />}>Incomplete</StatusBadge>}
                        <button
                          disabled={busyRow}
                          onClick={() => toggle(a.id, sid, !s.isComplete, s.student?.rollNumber ?? "")}
                          aria-label={`Mark ${s.student?.rollNumber} ${s.isComplete ? "incomplete" : "complete"}`}
                          className="btn-secondary btn-sm !min-h-[40px] shrink-0 disabled:opacity-50">
                          {s.isComplete ? "Mark ✗" : "Mark ✓"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </article>
        );
      })}

      {creating && (
        <Dialog
          title="New assignment" wide
          onClose={() => setCreating(false)}
          actions={<>
            <button className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn-primary" onClick={create} disabled={createMutation.isPending}>{createMutation.isPending ? "Creating…" : "Create assignment"}</button>
          </>}
        >
          <form onSubmit={create} className="space-y-4">
            <Field label="Title" htmlFor="na-t">
              <input id="na-t" className="input" required minLength={3} maxLength={140} placeholder="e.g. Assignment 3: Normalization"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Due date" htmlFor="na-d">
                <input id="na-d" type="date" className="input" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </Field>
              <Field label="Attachment link" htmlFor="na-l" optional>
                <input id="na-l" className="input" inputMode="url" placeholder="https://…" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
              </Field>
            </div>
            <Field label="Description" htmlFor="na-desc" optional>
              <textarea id="na-desc" className="input min-h-[100px]" maxLength={2000} placeholder="What should students submit, and how?"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            {formError && <p className="form-error" role="alert"><IconAlert className="mt-0.5 h-5 w-5 shrink-0" />{formError}</p>}
          </form>
        </Dialog>
      )}
    </section>
  );
}

/* ============================== COURSE STATUS ============================== */

function StatusTab({ subjectId, me, subject, show }: {
  subjectId: string; me: SessionUser | null; subject: SubjectItem; show: Show;
}) {
  const [newTopic, setNewTopic] = useState("");
  const [deleting, setDeleting] = useState<TopicItem | null>(null);
  const router = useRouter();

  const canEdit = canEditRole(me);
  const toggleMutation = useToggleTopic(subjectId);
  const addMutation = useAddTopic(subjectId);
  const deleteMutation = useDeleteTopic(subjectId);

  const topics = subject.topics ?? [];
  const done = topics.filter((t) => t.isComplete).length;
  const pct = topics.length ? Math.round((done / topics.length) * 100) : 0;

  async function toggle(t: TopicItem) {
    try {
      await toggleMutation.mutateAsync({ id: t.id, isComplete: !t.isComplete });
    } catch (err) {
      reportError(show, err, router);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (newTopic.trim().length < 2 || addMutation.isPending) return;
    try {
      await addMutation.mutateAsync(newTopic.trim());
      setNewTopic("");
      show("Topic added.");
    } catch (err) {
      reportError(show, err, router);
    }
  }

  async function remove() {
    if (!deleting || deleteMutation.isPending) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      setDeleting(null);
      show("Topic removed.");
    } catch (err) {
      reportError(show, err, router);
    }
  }

  return (
    <section aria-label="Course status" className="space-y-3.5">
      <div className="card card-pad">
        <div className="flex items-center gap-2">
          <h2 className="section-title flex items-center gap-2"><IconBook className="h-5 w-5 text-brand-700" />Course progress</h2>
          <span className="badge-blue ml-auto">{done}/{topics.length} · {pct}%</span>
        </div>
        <div className="progress mt-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${done} of ${topics.length} topics complete`}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <p className="muted mt-2">{topics.length === 0 ? "No topics added yet." : done === topics.length ? "Syllabus complete — nice work." : `${topics.length - done} topic${topics.length - done === 1 ? "" : "s"} remaining.`}</p>
        {canEdit && (
          <form onSubmit={add} className="mt-3.5 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="nt" className="sr-only">New topic title</label>
            <input id="nt" className="input flex-1" placeholder="New topic, e.g. Unit 5: Transactions"
              value={newTopic} onChange={(e) => setNewTopic(e.target.value)} />
            <button className="btn-primary sm:w-auto" disabled={addMutation.isPending || newTopic.trim().length < 2}>
              <IconPlus />{addMutation.isPending ? "Adding…" : "Add"}
            </button>
          </form>
        )}
      </div>

      {topics.length === 0 ? (
        <EmptyState icon={<IconBook className="h-6 w-6" />} title="No topics yet"
          sub={canEdit ? "Add units or chapters above to track syllabus progress." : "Your teacher has not published the course outline yet."} />
      ) : (
        <ul className="space-y-2" role="list" aria-label="Course topics">
          {topics.map((t, i) => (
            <li key={t.id} className="card flex items-center gap-3 p-3.5">
              <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold ${t.isComplete ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"}`}>
                {t.isComplete ? <IconCheck /> : <span className="text-[13px]">{i + 1}</span>}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-[15px] font-semibold">{t.title}</p>
                <p className="text-[13px] font-medium text-slate-500">
                  {t.isComplete ? <span className="text-emerald-700">✓ Complete</span> : <span>○ Not started</span>}
                </p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => toggle(t)} disabled={toggleMutation.isPending && toggleMutation.variables?.id === t.id}
                    aria-label={`Mark “${t.title}” ${t.isComplete ? "not started" : "complete"}`}
                    className="btn-secondary btn-sm !min-h-[40px] disabled:opacity-50">
                    {t.isComplete ? "Reopen" : "Done ✓"}
                  </button>
                  <button onClick={() => setDeleting(t)} aria-label={`Remove “${t.title}”`} title="Remove topic"
                    className="icon-btn !min-h-[40px] !min-w-[40px] text-slate-400 hover:text-rose-700"><IconX /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {deleting && (
        <Dialog
          title="Remove topic?"
          onClose={() => setDeleting(null)}
          actions={<>
            <button className="btn-secondary" onClick={() => setDeleting(null)}>Keep it</button>
            <button className="btn-danger" onClick={remove} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Removing…" : "Remove topic"}
            </button>
          </>}
        >
          <p className="muted">“{deleting.title}” will be removed from the course outline. This cannot be undone.</p>
        </Dialog>
      )}
    </section>
  );
}

/* ============================== PAGE ============================== */

export default function SubjectPage() {
  const { id } = useParams() as { id: string };
  const [tab, setTab] = useState<Tab>("attendance");
  const { show, el } = useToast();

  const session = useSession();
  const me = session.data?.user ?? null;
  const subjectQuery = useSubject(id, session.isFetched);
  const subject = subjectQuery.data?.subject ?? null;

  if (session.isPending || subjectQuery.isPending) {
    return <div className="mx-auto w-full max-w-3xl"><SkeletonList rows={3} /></div>;
  }
  if (subjectQuery.isError || !subject) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <Link href="/courses" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-700"><IconBack />All courses</Link>
        <ErrorState
          message={subjectQuery.error instanceof Error ? subjectQuery.error.message : "Could not load this subject."}
          onRetry={() => subjectQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      {el}
      <Link href="/courses" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-700">
        <IconBack />All courses
      </Link>

      <div className="card card-pad">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-blue">Sem {subject.semester}</span>
          <span className="font-mono text-xs font-semibold text-slate-500">{subject.code}</span>
          <AnonBadge />
        </div>
        <h1 className="page-title mt-1.5">{subject.name}</h1>
        {subject.description && <p className="muted mt-1">{subject.description}</p>}
        {me?.role === "STUDENT" && <p className="notice-info mt-3"><IconBook className="mt-0.5 h-4 w-4 shrink-0" />You are viewing your records — only teachers and admins can make changes.</p>}
        {subjectQuery.isFetching && !subjectQuery.isPending && (
          <p className="tiny mt-2" aria-live="polite">Updating…</p>
        )}
      </div>

      <div className="sticky top-[60px] z-20 -mx-4 bg-slate-100/95 px-4 py-1 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="tabs card !rounded-[14px] px-2" role="tablist" aria-label="Subject sections">
          {(["attendance", "assignments", "status"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="capitalize">
              {t === "status" ? "Course Status" : t}
            </button>
          ))}
        </div>
      </div>

      {tab === "attendance" && <AttendanceTab subjectId={id} me={me} show={show} />}
      {tab === "assignments" && <AssignmentsTab subjectId={id} me={me} show={show} />}
      {tab === "status" && <StatusTab subjectId={id} me={me} subject={subject} show={show} />}
    </div>
  );
}
