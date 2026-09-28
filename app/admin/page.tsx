"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/client";
import { Dialog, EmptyState, ErrorState, Field, PasswordInput, SearchInput, Segmented, SkeletonList, StatusBadge } from "@/components/ui";
import { IconAlert, IconCheck, IconPlus, IconRefresh, IconShield, IconX } from "@/components/icons";
import {
  reportError,
  useAdminCampuses,
  useAdminStudents,
  useAdminTeachers,
  useCreateCampus,
  useCreateStudent,
  useCreateSubject,
  useCreateTeacher,
  useDeactivateStudent,
  useHidePost,
  usePatchStudent,
  usePatchTeacher,
  useReports,
  useSemesterSubjects,
  useSession,
  type AdminStudent,
  type AdminTeacher,
  type CampusItem,
  type SubjectItem,
} from "@/lib/hooks";
import { useRouter } from "next/navigation";

type Tab = "students" | "teachers" | "subjects" | "campuses" | "moderation";
type Show = (text: string, ok?: boolean) => void;
const SEMS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: `Sem ${n}` }));

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("students");
  const [campusId, setCampusId] = useState("");
  const [sem, setSem] = useState("3");
  const { show, el } = useToast();
  const qc = useQueryClient();

  const session = useSession();
  const me = session.data?.user ?? null;
  const isAdmin = me?.role === "ADMIN";

  useEffect(() => {
    if (me && !campusId) setCampusId(me.campusId);
  }, [me, campusId]);

  const campusesQuery = useAdminCampuses(!!isAdmin);
  const campuses = campusesQuery.data?.campuses ?? [];
  const reportsQuery = useReports(!!isAdmin && !!campusId);
  const reportCount = (reportsQuery.data?.posts.length ?? 0) + (reportsQuery.data?.comments.length ?? 0);

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["subjects"] });
    qc.invalidateQueries({ queryKey: ["campuses"] });
  }

  if (session.isPending || (isAdmin && !campusId)) {
    return <div className="mx-auto w-full max-w-3xl"><SkeletonList rows={4} /></div>;
  }
  if (!me || !isAdmin) {
    return (
      <div className="mx-auto w-full max-w-md">
        <EmptyState
          icon={<IconShield className="h-6 w-6" />}
          title="Admins only"
          sub="This console is restricted to campus administrators."
          action={<Link href="/admin/login" className="btn-primary">Admin sign-in</Link>}
        />
      </div>
    );
  }

  const campusName = campuses.find((c) => c.id === campusId)?.name ?? "";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      {el}
      <div className="card card-pad">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="page-title">Admin console</h1>
          <span className="badge-blue">{campusName}</span>
          <button className="btn-secondary btn-sm ml-auto" onClick={refreshAll} aria-label="Refresh admin data">
            <IconRefresh />Refresh
          </button>
        </div>
        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="acampus">Campus</label>
            <select id="acampus" className="input" value={campusId} onChange={(e) => setCampusId(e.target.value)}>
              {campuses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <span className="label" id="asem">Semester scope</span>
            <Segmented label="Semester scope" value={sem} onChange={setSem} options={SEMS} />
          </div>
        </div>
      </div>

      <div className="tabs card !rounded-[14px] px-2" role="tablist" aria-label="Admin sections">
        {(["students", "teachers", "subjects", "campuses", "moderation"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="capitalize">
            {t}{t === "moderation" && reportCount > 0 && (
              <span className="badge-red ml-1.5">{reportCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "students" && <StudentsTab campusId={campusId} show={show} />}
      {tab === "teachers" && <TeachersTab campusId={campusId} sem={sem} show={show} />}
      {tab === "subjects" && <SubjectsTab campusId={campusId} sem={sem} show={show} />}
      {tab === "campuses" && <CampusesTab show={show} />}
      {tab === "moderation" && <ModerationTab show={show} />}
    </div>
  );
}

/* ================================ STUDENTS ================================ */

function StudentsTab({ campusId, show }: { campusId: string; show: Show }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ rollNumber: "", semester: "3", name: "", pin: "" });
  const [formError, setFormError] = useState("");
  const [pinFor, setPinFor] = useState<AdminStudent | null>(null);
  const [newPin, setNewPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [moveFor, setMoveFor] = useState<AdminStudent | null>(null);
  const [moveSem, setMoveSem] = useState("3");
  const [deactFor, setDeactFor] = useState<AdminStudent | null>(null);
  const router = useRouter();

  const list = useAdminStudents(campusId, !!campusId);
  const createMutation = useCreateStudent(campusId);
  const patchMutation = usePatchStudent(campusId);
  const deactivateMutation = useDeactivateStudent(campusId);
  const students = list.data?.students ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((s) => (s.rollNumber ?? "").toLowerCase().includes(needle) || (s.name ?? "").toLowerCase().includes(needle));
  }, [students, q]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (f.rollNumber.trim().length < 2) { setFormError("Roll number is required."); return; }
    if (f.pin.length < 4) { setFormError("Initial PIN must be at least 4 characters."); return; }
    setFormError("");
    try {
      await createMutation.mutateAsync({ rollNumber: f.rollNumber.trim(), semester: Number(f.semester), name: f.name.trim(), pin: f.pin });
      setF({ rollNumber: "", semester: "3", name: "", pin: "" });
      setAdding(false);
      show("Student created — share the PIN with them securely, in person.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the student.");
    }
  }

  async function resetPin() {
    if (!pinFor || newPin.length < 4 || pinBusy) return;
    setPinBusy(true);
    try {
      await patchMutation.mutateAsync({ id: pinFor.id, patch: { resetPin: newPin } });
      show(`PIN reset for ${pinFor.rollNumber} — share it securely, in person.`);
      setPinFor(null); setNewPin("");
    } catch (err) {
      reportError(show, err, router);
    } finally {
      setPinBusy(false);
    }
  }

  async function move() {
    if (!moveFor || patchMutation.isPending) return;
    try {
      await patchMutation.mutateAsync({ id: moveFor.id, patch: { semester: Number(moveSem) } });
      show(`${moveFor.rollNumber} moved to semester ${moveSem}.`);
      setMoveFor(null);
    } catch (err) {
      reportError(show, err, router);
    }
  }

  async function deactivate() {
    if (!deactFor || deactivateMutation.isPending) return;
    try {
      await deactivateMutation.mutateAsync(deactFor.id);
      show(`${deactFor.rollNumber} deactivated.`);
      setDeactFor(null);
    } catch (err) {
      reportError(show, err, router);
    }
  }

  if (list.isPending) return <SkeletonList rows={3} />;
  if (list.isError) {
    return <ErrorState message={list.error instanceof Error ? list.error.message : "Could not load students."} onRetry={() => list.refetch()} />;
  }

  return (
    <section aria-label="Students" className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><SearchInput value={q} onChange={setQ} label="Search students" placeholder="Search roll number or name…" /></div>
        <button className="btn-primary sm:w-auto" onClick={() => { setAdding(true); setFormError(""); }}><IconPlus />Add student</button>
      </div>
      <p className="tiny" aria-live="polite">
        {filtered.length} of {students.length} students · roll numbers are unique per campus + semester
        {list.isFetching && !list.isPending ? " · Updating…" : ""}
      </p>

      {filtered.length === 0 && (
        <EmptyState title={q ? "No matching students" : "No students yet"} sub={q ? "Try a different roll number or name." : "Add the first student account for this campus."} />
      )}

      <ul className="space-y-2" role="list">
        {filtered.map((s) => (
          <li key={s.id} className="card p-3.5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-bold">{s.rollNumber}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="badge-blue">Sem {s.semester}</span>
                  {s.active
                    ? <StatusBadge tone="green" icon={<IconCheck className="h-3.5 w-3.5" />}>Active</StatusBadge>
                    : <StatusBadge tone="slate" icon={<IconX className="h-3.5 w-3.5" />}>Inactive</StatusBadge>}
                  {s.name && <span className="truncate text-[13px] text-slate-500">{s.name}</span>}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
              <button className="btn-secondary btn-sm" onClick={() => { setPinFor(s); setNewPin(""); }}>Reset PIN</button>
              <button className="btn-secondary btn-sm" onClick={() => { setMoveFor(s); setMoveSem(String(s.semester)); }}>Move semester</button>
              <button className="btn-ghost btn-sm !text-rose-700" onClick={() => setDeactFor(s)}>Deactivate</button>
            </div>
          </li>
        ))}
      </ul>

      {adding && (
        <Dialog title="Add student" onClose={() => setAdding(false)}
          actions={<>
            <button className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn-primary" onClick={add} disabled={createMutation.isPending}>{createMutation.isPending ? "Adding…" : "Add student"}</button>
          </>}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Roll number" htmlFor="ns-roll" hint="Must be unique within this campus + semester.">
              <input id="ns-roll" className="input font-mono" required placeholder="e.g. BMC-2079-0301"
                value={f.rollNumber} onChange={(e) => setF({ ...f, rollNumber: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Semester" htmlFor="ns-sem">
                <select id="ns-sem" className="input" value={f.semester} onChange={(e) => setF({ ...f, semester: e.target.value })}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Sem {n}</option>)}
                </select>
              </Field>
              <Field label="Name" htmlFor="ns-name" optional>
                <input id="ns-name" className="input" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </Field>
            </div>
            <Field label="Initial PIN" htmlFor="ns-pin" hint="Share it with the student in person. They can change it under Profile.">
              <PasswordInput id="ns-pin" required minLength={4} placeholder="Minimum 4 characters"
                value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value })} />
            </Field>
            {formError && <p className="form-error" role="alert"><IconAlert className="mt-0.5 h-5 w-5 shrink-0" />{formError}</p>}
          </form>
        </Dialog>
      )}

      {pinFor && (
        <Dialog title={`Reset PIN — ${pinFor.rollNumber}`} onClose={() => setPinFor(null)}
          actions={<>
            <button className="btn-secondary" onClick={() => setPinFor(null)}>Cancel</button>
            <button className="btn-primary" onClick={resetPin} disabled={newPin.length < 4 || pinBusy}>{pinBusy ? "Setting…" : "Set new PIN"}</button>
          </>}>
          <Field label="New PIN" htmlFor="rp" hint="Minimum 4 characters. The student must change it after signing in.">
            <PasswordInput id="rp" minLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value)} />
          </Field>
        </Dialog>
      )}

      {moveFor && (
        <Dialog title={`Move ${moveFor.rollNumber}`} onClose={() => setMoveFor(null)}
          actions={<>
            <button className="btn-secondary" onClick={() => setMoveFor(null)}>Cancel</button>
            <button className="btn-primary" onClick={move} disabled={patchMutation.isPending}>Move to Sem {moveSem}</button>
          </>}>
          <Field label="New semester" htmlFor="ms">
            <select id="ms" className="input" value={moveSem} onChange={(e) => setMoveSem(e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Semester {n}</option>)}
            </select>
          </Field>
        </Dialog>
      )}

      {deactFor && (
        <Dialog title={`Deactivate ${deactFor.rollNumber}?`} onClose={() => setDeactFor(null)}
          actions={<>
            <button className="btn-secondary" onClick={() => setDeactFor(null)}>Keep active</button>
            <button className="btn-danger" onClick={deactivate} disabled={deactivateMutation.isPending}>
              {deactivateMutation.isPending ? "Deactivating…" : "Deactivate"}
            </button>
          </>}>
          <p className="muted">They will no longer be able to sign in, but their academic records are kept.</p>
        </Dialog>
      )}
    </section>
  );
}

/* ================================ TEACHERS ================================ */

function TeachersTab({ campusId, sem, show }: {
  campusId: string; sem: string; show: Show;
}) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ username: "", name: "", password: "" });
  const [formError, setFormError] = useState("");
  const [pwFor, setPwFor] = useState<AdminTeacher | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [assignFor, setAssignFor] = useState<AdminTeacher | null>(null);
  const [assignSem, setAssignSem] = useState(sem);
  const [assignId, setAssignId] = useState("");
  const [toggleFor, setToggleFor] = useState<AdminTeacher | null>(null);
  const router = useRouter();

  const list = useAdminTeachers(campusId, !!campusId);
  const createMutation = useCreateTeacher(campusId);
  const patchMutation = usePatchTeacher(campusId);
  const teachers = list.data?.teachers ?? [];
  const assignments = list.data?.assignments ?? [];

  // Subject picker inside the assign dialog is itself a cached query —
  // switching semesters reuses cached semester lists instead of refetching.
  const assignSubjects = useSemesterSubjects(assignSem, !!assignFor);
  useEffect(() => {
    if (assignFor) {
      setAssignSem(sem);
      setAssignId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignFor?.id]);

  const byTeacher = useMemo(() => {
    const m: Record<string, SubjectItem[]> = {};
    for (const a of assignments) (m[a.teacherId] ??= []).push(a.subject);
    return m;
  }, [assignments]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return teachers;
    return teachers.filter((t) => (t.username ?? "").toLowerCase().includes(needle) || (t.name ?? "").toLowerCase().includes(needle));
  }, [teachers, q]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (f.username.trim().length < 3) { setFormError("Username needs at least 3 characters."); return; }
    if (f.name.trim().length < 2) { setFormError("Full name is required."); return; }
    if (f.password.length < 8) { setFormError("Password must be at least 8 characters."); return; }
    setFormError("");
    try {
      await createMutation.mutateAsync({ username: f.username.trim(), name: f.name.trim(), password: f.password });
      setF({ username: "", name: "", password: "" });
      setAdding(false);
      show("Teacher account created.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the teacher.");
    }
  }

  async function resetPw() {
    if (!pwFor || newPw.length < 8 || pwBusy) return;
    setPwBusy(true);
    try {
      await patchMutation.mutateAsync({ id: pwFor.id, patch: { newPassword: newPw } });
      show(`Password reset for ${pwFor.username}.`);
      setPwFor(null); setNewPw("");
    } catch (err) {
      reportError(show, err, router);
    } finally {
      setPwBusy(false);
    }
  }

  async function assign() {
    if (!assignFor || !assignId || patchMutation.isPending) return;
    try {
      await patchMutation.mutateAsync({ id: assignFor.id, patch: { assignSubjectId: assignId } });
      show("Subject assigned.");
      setAssignId("");
    } catch (err) {
      reportError(show, err, router);
    }
  }

  async function unassign(subjectId: string) {
    if (!assignFor || patchMutation.isPending) return;
    try {
      await patchMutation.mutateAsync({ id: assignFor.id, patch: { unassignSubjectId: subjectId } });
      show("Subject unassigned.");
    } catch (err) {
      reportError(show, err, router);
    }
  }

  async function toggleActive() {
    if (!toggleFor || patchMutation.isPending) return;
    try {
      await patchMutation.mutateAsync({ id: toggleFor.id, patch: { active: !toggleFor.active } });
      setToggleFor(null);
    } catch (err) {
      reportError(show, err, router);
    }
  }

  if (list.isPending) return <SkeletonList rows={3} />;
  if (list.isError) {
    return <ErrorState message={list.error instanceof Error ? list.error.message : "Could not load teachers."} onRetry={() => list.refetch()} />;
  }

  return (
    <section aria-label="Teachers" className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><SearchInput value={q} onChange={setQ} label="Search teachers" placeholder="Search username or name…" /></div>
        <button className="btn-primary sm:w-auto" onClick={() => { setAdding(true); setFormError(""); }}><IconPlus />Add teacher</button>
      </div>
      <p className="tiny" aria-live="polite">
        {filtered.length} of {teachers.length} teachers · teachers only manage assigned subjects
        {list.isFetching && !list.isPending ? " · Updating…" : ""}
      </p>

      {filtered.length === 0 && <EmptyState title={q ? "No matching teachers" : "No teachers yet"} sub={q ? "Try a different username or name." : "Add the first teacher account for this campus."} />}

      <ul className="space-y-2" role="list">
        {filtered.map((t) => (
          <li key={t.id} className="card p-3.5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700" aria-hidden>
                {(t.name ?? t.username ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{t.name}</p>
                <p className="truncate font-mono text-[13px] text-slate-500">{t.username}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5">
                  {t.active
                    ? <StatusBadge tone="green" icon={<IconCheck className="h-3.5 w-3.5" />}>Active</StatusBadge>
                    : <StatusBadge tone="slate" icon={<IconX className="h-3.5 w-3.5" />}>Inactive</StatusBadge>}
                  <span className="badge-slate">{byTeacher[t.id]?.length ?? 0} subjects</span>
                </p>
              </div>
            </div>
            {(byTeacher[t.id]?.length ?? 0) > 0 && (
              <p className="muted mt-2 truncate">Teaching: {byTeacher[t.id].map((s) => s.code).join(", ")}</p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
              <button className="btn-secondary btn-sm" onClick={() => { setPwFor(t); setNewPw(""); }}>Reset password</button>
              <button className="btn-secondary btn-sm" onClick={() => setAssignFor(t)}>Subjects</button>
              <button className="btn-ghost btn-sm !text-rose-700" onClick={() => setToggleFor(t)}>{t.active ? "Deactivate" : "Activate"}</button>
            </div>
          </li>
        ))}
      </ul>

      {adding && (
        <Dialog title="Add teacher" onClose={() => setAdding(false)}
          actions={<>
            <button className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn-primary" onClick={add} disabled={createMutation.isPending}>{createMutation.isPending ? "Adding…" : "Add teacher"}</button>
          </>}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Username" htmlFor="nt-u" hint="Unique across the platform, e.g. teacher1.bmc.">
              <input id="nt-u" className="input" required minLength={3} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
            </Field>
            <Field label="Full name" htmlFor="nt-n">
              <input id="nt-n" className="input" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </Field>
            <Field label="Temporary password" htmlFor="nt-p" hint="At least 8 characters. Share it securely; they can change it under Profile.">
              <PasswordInput id="nt-p" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            </Field>
            {formError && <p className="form-error" role="alert"><IconAlert className="mt-0.5 h-5 w-5 shrink-0" />{formError}</p>}
          </form>
        </Dialog>
      )}

      {pwFor && (
        <Dialog title={`Reset password — ${pwFor.username}`} onClose={() => setPwFor(null)}
          actions={<>
            <button className="btn-secondary" onClick={() => setPwFor(null)}>Cancel</button>
            <button className="btn-primary" onClick={resetPw} disabled={newPw.length < 8 || pwBusy}>{pwBusy ? "Setting…" : "Set new password"}</button>
          </>}>
          <Field label="New password" htmlFor="tp" hint="At least 8 characters.">
            <PasswordInput id="tp" minLength={8} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </Field>
        </Dialog>
      )}

      {assignFor && (
        <Dialog title={`Subjects — ${assignFor.username}`} wide onClose={() => setAssignFor(null)}
          actions={<button className="btn-primary" onClick={() => setAssignFor(null)}>Done</button>}>
          <p className="tiny font-semibold uppercase tracking-wide">Currently assigned</p>
          {(byTeacher[assignFor.id]?.length ?? 0) === 0 && <p className="muted mt-1">No subjects assigned yet.</p>}
          <ul className="mt-1.5 space-y-1.5" role="list">
            {(byTeacher[assignFor.id] ?? []).map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-[10px] bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-100">
                <span className="min-w-0 flex-1 truncate"><strong className="font-mono">{s.code}</strong> — {s.name} <span className="text-slate-500">(Sem {s.semester})</span></span>
                <button className="btn-ghost btn-sm shrink-0 !text-rose-700" onClick={() => unassign(s.id)} disabled={patchMutation.isPending}>Remove</button>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="tiny font-semibold uppercase tracking-wide">Assign another</p>
            <Segmented label="Subject semester" value={assignSem} onChange={(v) => { setAssignSem(v); setAssignId(""); }} options={SEMS} />
            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="asub" className="sr-only">Choose subject</label>
              <select id="asub" className="input flex-1" value={assignId} onChange={(e) => setAssignId(e.target.value)}>
                <option value="">Choose a subject…</option>
                {(assignSubjects.data?.subjects ?? []).map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
              <button className="btn-secondary sm:w-auto" onClick={assign} disabled={!assignId || patchMutation.isPending}>
                {assignSubjects.isPending ? "Loading…" : "Assign"}
              </button>
            </div>
            {assignSubjects.isError && (
              <p className="field-error" role="alert">Could not load subjects. <button className="underline" onClick={() => assignSubjects.refetch()}>Retry</button></p>
            )}
          </div>
        </Dialog>
      )}

      {toggleFor && (
        <Dialog title={`${toggleFor.active ? "Deactivate" : "Activate"} ${toggleFor.username}?`} onClose={() => setToggleFor(null)}
          actions={<>
            <button className="btn-secondary" onClick={() => setToggleFor(null)}>Cancel</button>
            <button className={toggleFor.active ? "btn-danger" : "btn-primary"} onClick={toggleActive} disabled={patchMutation.isPending}>
              {toggleFor.active ? "Deactivate" : "Activate"}
            </button>
          </>}>
          <p className="muted">{toggleFor.active ? "They will no longer be able to sign in." : "They will be able to sign in again."}</p>
        </Dialog>
      )}
    </section>
  );
}

/* ================================ SUBJECTS ================================ */

function SubjectsTab({ campusId, sem, show }: {
  campusId: string; sem: string; show: Show;
}) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ semester: sem, code: "", name: "" });
  const [formError, setFormError] = useState("");

  const list = useSemesterSubjects(sem, true);
  const createMutation = useCreateSubject();
  const subjects = list.data?.subjects ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return subjects;
    return subjects.filter((s) => (s.code ?? "").toLowerCase().includes(needle) || (s.name ?? "").toLowerCase().includes(needle));
  }, [subjects, q]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (f.code.trim().length < 2 || f.name.trim().length < 2) { setFormError("Code and name are required."); return; }
    setFormError("");
    try {
      await createMutation.mutateAsync({ campusId, semester: Number(f.semester), code: f.code.trim(), name: f.name.trim() });
      setF({ semester: sem, code: "", name: "" });
      setAdding(false);
      show("Subject created.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the subject.");
    }
  }

  if (list.isPending) return <SkeletonList rows={3} />;
  if (list.isError) {
    return <ErrorState message={list.error instanceof Error ? list.error.message : "Could not load subjects."} onRetry={() => list.refetch()} />;
  }

  return (
    <section aria-label="Subjects" className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><SearchInput value={q} onChange={setQ} label="Search subjects" placeholder="Search code or name…" /></div>
        <button className="btn-primary sm:w-auto" onClick={() => { setAdding(true); setF((p) => ({ ...p, semester: sem })); setFormError(""); }}><IconPlus />Add subject</button>
      </div>
      <p className="tiny" aria-live="polite">
        {filtered.length} subjects · semester {sem}
        {list.isFetching && !list.isPending ? " · Updating…" : ""}
      </p>

      {filtered.length === 0 && <EmptyState title={q ? "No matching subjects" : "No subjects in this semester"} sub={q ? "Try a different code or name." : "Add subjects so teachers and students can use them."} />}

      <ul className="space-y-2" role="list">
        {filtered.map((s) => (
          <li key={s.id} className="card flex items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{s.name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="badge-blue">{s.code}</span>
                <span className="badge-slate">Sem {s.semester}</span>
                <span className="tiny">{s._count?.topics ?? 0} topics · {s._count?.assignments ?? 0} assignments</span>
              </p>
            </div>
            <Link href={`/courses/${s.id}`} className="btn-secondary btn-sm shrink-0">Open</Link>
          </li>
        ))}
      </ul>

      {adding && (
        <Dialog title="Add subject" onClose={() => setAdding(false)}
          actions={<>
            <button className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn-primary" onClick={add} disabled={createMutation.isPending}>{createMutation.isPending ? "Adding…" : "Add subject"}</button>
          </>}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Semester" htmlFor="nsj-s">
              <select id="nsj-s" className="input" value={f.semester} onChange={(e) => setF({ ...f, semester: e.target.value })}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Semester {n}</option>)}
              </select>
            </Field>
            <Field label="Subject code" htmlFor="nsj-c">
              <input id="nsj-c" className="input font-mono" required placeholder="e.g. CSC220" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
            </Field>
            <Field label="Subject name" htmlFor="nsj-n">
              <input id="nsj-n" className="input" required placeholder="e.g. Data Structures & Algorithms" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </Field>
            {formError && <p className="form-error" role="alert"><IconAlert className="mt-0.5 h-5 w-5 shrink-0" />{formError}</p>}
          </form>
        </Dialog>
      )}
    </section>
  );
}

/* ================================ CAMPUSES ================================ */

function CampusesTab({ show }: { show: Show }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ code: "", name: "", address: "" });
  const [formError, setFormError] = useState("");

  const list = useAdminCampuses(true);
  const createMutation = useCreateCampus();
  const campuses: CampusItem[] = list.data?.campuses ?? [];

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (f.code.trim().length < 2 || f.name.trim().length < 2) { setFormError("Code and name are required."); return; }
    setFormError("");
    try {
      await createMutation.mutateAsync({ code: f.code.trim(), name: f.name.trim(), address: f.address.trim() });
      setF({ code: "", name: "", address: "" });
      setAdding(false);
      show("Campus added.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add the campus.");
    }
  }

  if (list.isPending) return <SkeletonList rows={2} />;
  if (list.isError) {
    return <ErrorState message={list.error instanceof Error ? list.error.message : "Could not load campuses."} onRetry={() => list.refetch()} />;
  }

  return (
    <section aria-label="Campuses" className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="tiny">{campuses.length} campuses</p>
        <button className="btn-primary btn-sm ml-auto" onClick={() => { setAdding(true); setFormError(""); }}><IconPlus />Add campus</button>
      </div>
      <ul className="space-y-2" role="list">
        {campuses.map((c) => (
          <li key={c.id} className="card p-3.5">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold">{c.name} <span className="badge-blue">{c.code}</span></p>
            {c.address && <p className="muted mt-0.5">{c.address}</p>}
          </li>
        ))}
      </ul>

      {adding && (
        <Dialog title="Add campus" onClose={() => setAdding(false)}
          actions={<>
            <button className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn-primary" onClick={add} disabled={createMutation.isPending}>{createMutation.isPending ? "Adding…" : "Add campus"}</button>
          </>}>
          <form onSubmit={add} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code" htmlFor="nc-c" hint="Short, e.g. BMC.">
                <input id="nc-c" className="input font-mono" required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
              </Field>
              <Field label="Name" htmlFor="nc-n">
                <input id="nc-n" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </Field>
            </div>
            <Field label="Address" htmlFor="nc-a" optional>
              <input id="nc-a" className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
            </Field>
            {formError && <p className="form-error" role="alert"><IconAlert className="mt-0.5 h-5 w-5 shrink-0" />{formError}</p>}
          </form>
        </Dialog>
      )}
    </section>
  );
}

/* =============================== MODERATION =============================== */

function ModerationTab({ show }: { show: Show }) {
  const [hiding, setHiding] = useState<{ id: string; title: string } | null>(null);
  const router = useRouter();

  const list = useReports(true);
  const hideMutation = useHidePost();
  const reports = list.data ?? null;

  async function hide() {
    if (!hiding || hideMutation.isPending) return;
    try {
      await hideMutation.mutateAsync(hiding.id);
      setHiding(null);
      show("Post hidden. The author was never identified.");
    } catch (err) {
      reportError(show, err, router);
    }
  }

  if (list.isPending) return <SkeletonList rows={3} />;
  if (list.isError) {
    return <ErrorState message={list.error instanceof Error ? list.error.message : "Could not load reports."} onRetry={() => list.refetch()} />;
  }
  if (!reports || (reports.posts.length === 0 && reports.comments.length === 0)) {
    return <EmptyState title="Nothing to review" sub="No reports have been filed on your campus." />;
  }

  return (
    <section aria-label="Moderation" className="space-y-4">
      <p className="notice-info"><IconShield className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />Moderation is anonymous — reports and posts never reveal authors, not even here.</p>

      <div>
        <h2 className="section-title">Reported posts <span className="font-medium text-slate-500">· {reports.posts.length}</span></h2>
        {reports.posts.length === 0 && <p className="muted mt-1.5">No reported posts. The feed is quiet.</p>}
        <ul className="mt-2.5 space-y-2" role="list">
          {reports.posts.map((p) => (
            <li key={p.id} className="card p-3.5">
              <p className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.title}</span>
                <StatusBadge tone="amber" icon={<IconAlert className="h-3.5 w-3.5" />}>{p.reportCount} reports</StatusBadge>
              </p>
              <p className="muted mt-1 line-clamp-2 break-words">{p.body?.slice(0, 200)}</p>
              <div className="mt-2.5 flex gap-2">
                <Link href={`/posts/${p.id}`} className="btn-secondary btn-sm">View thread</Link>
                <button className="btn-secondary btn-sm !text-rose-700" onClick={() => setHiding({ id: p.id, title: p.title })}>Hide post</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="section-title">Reported comments <span className="font-medium text-slate-500">· {reports.comments.length}</span></h2>
        {reports.comments.length === 0 && <p className="muted mt-1.5">No reported comments.</p>}
        <ul className="mt-2.5 space-y-2" role="list">
          {reports.comments.map((c) => (
            <li key={c.id} className="card p-3.5">
              <p className="break-words text-sm">{c.body?.slice(0, 200)}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge tone="amber" icon={<IconAlert className="h-3.5 w-3.5" />}>{c.reportCount} reports</StatusBadge>
                <Link href={`/posts/${c.postId}`} className="text-[13px] font-semibold text-brand-700 underline-offset-2 hover:underline">Open thread</Link>
              </p>
            </li>
          ))}
        </ul>
      </div>

      {hiding && (
        <Dialog title="Hide this post?" onClose={() => setHiding(null)}
          actions={<>
            <button className="btn-secondary" onClick={() => setHiding(null)}>Keep visible</button>
            <button className="btn-danger" onClick={hide} disabled={hideMutation.isPending}>{hideMutation.isPending ? "Hiding…" : "Hide post"}</button>
          </>}>
          <p className="muted">“{hiding.title}” will disappear from the feed for everyone. The author is unknown and stays unknown — this only hides the content.</p>
        </Dialog>
      )}
    </section>
  );
}
