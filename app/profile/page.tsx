"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/client";
import { Field, PasswordInput, SkeletonList, StatusBadge } from "@/components/ui";
import { IconAlert, IconBook, IconCheck, IconShield, IconUser } from "@/components/icons";
import { reportError, useProfile, useUpdateProfile, type SessionUser } from "@/lib/hooks";

function initials(u: SessionUser) {
  return ((u.name ?? u.username ?? u.rollNumber ?? u.role) ?? "?").slice(0, 1).toUpperCase();
}

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [nameInit, setNameInit] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const { show, el } = useToast();
  const router = useRouter();

  const profile = useProfile();
  const update = useUpdateProfile();
  const data = profile.data ?? null;

  useEffect(() => {
    if (data && !nameInit) {
      setName(data.user.name ?? "");
      setNameInit(true);
    }
  }, [data, nameInit]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2 || update.isPending) return;
    try {
      await update.mutateAsync({ name: name.trim() });
      show("Display name updated.");
    } catch (err) {
      reportError(show, err, router);
    }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.current || pw.next.length < 4 || update.isPending) return;
    try {
      await update.mutateAsync({ currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "" });
      show("Credential updated. Use it next time you sign in.");
    } catch (err) {
      reportError(show, err, router);
    }
  }

  if (profile.isPending) return <div className="mx-auto w-full max-w-xl"><SkeletonList rows={3} /></div>;
  if (profile.isError || data === null) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-3">
        <p className="form-error" role="alert">
          <IconAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="flex-1">
            {profile.error instanceof Error ? profile.error.message : "Could not load your profile."}{" "}
            <a className="font-bold underline" href="/login">Sign in again</a>.
          </span>
          <button onClick={() => profile.refetch()} className="shrink-0 font-bold underline">Retry</button>
        </p>
      </div>
    );
  }

  const u = data.user;
  const credLabel = u.role === "STUDENT" ? "PIN" : "password";
  const facts: [string, string][] = [
    ["Role", u.role],
    ["Campus", `${u.campus?.name ?? "—"}${u.campus?.code ? ` (${u.campus.code})` : ""}`],
    ...(u.role === "STUDENT" ? [["Semester", String(u.semester ?? "—")], ["Roll number", u.rollNumber ?? "—"]] as [string, string][] : []),
    ...((u.role === "TEACHER" || u.role === "ADMIN") && u.username ? [["Username", u.username]] as [string, string][] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-xl space-y-3.5">
      {el}
      <div className="card card-pad">
        <div className="flex items-center gap-3.5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-600 text-xl font-bold text-white" aria-hidden>
            {initials(u)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">{u.name ?? u.username ?? u.rollNumber}</h1>
            <p className="mt-1"><StatusBadge tone="blue" icon={u.role === "ADMIN" ? <IconShield className="h-3.5 w-3.5" /> : <IconUser className="h-3.5 w-3.5" />}>{u.role}</StatusBadge></p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0 rounded-[10px] bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-100">
              <dt className="tiny font-semibold uppercase tracking-wide">{k}</dt>
              <dd className="mt-0.5 truncate text-sm font-bold" title={v}>{v}</dd>
            </div>
          ))}
        </dl>
        {(data.subjects ?? []).length > 0 && (
          <div className="mt-3">
            <p className="tiny font-semibold uppercase tracking-wide">Assigned subjects</p>
            <ul className="mt-1.5 space-y-1.5" role="list">
              {(data.subjects ?? []).map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <IconBook className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 truncate"><strong className="font-mono">{s.code}</strong> — {s.name} <span className="text-slate-500">(Sem {s.semester})</span></span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="hint mt-3">Role, campus, semester and roll number are managed by your administrator and cannot be changed here.</p>
      </div>

      <div className="card card-pad">
        <h2 className="section-title">Display name</h2>
        <form onSubmit={saveName} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="n" className="sr-only">Display name</label>
          <input id="n" className="input flex-1" minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary sm:w-auto" disabled={update.isPending || name.trim().length < 2}>
            {update.isPending ? "Saving…" : "Save"}
          </button>
        </form>
      </div>

      <div className="card card-pad">
        <h2 className="section-title">Change {credLabel}</h2>
        <form onSubmit={changePw} className="mt-3 space-y-4">
          <Field label={`Current ${credLabel}`} htmlFor="c">
            <PasswordInput id="c" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </Field>
          <Field label={`New ${credLabel}`} htmlFor="np" hint={u.role === "STUDENT" ? "At least 4 characters. Do not share it." : "Choose a strong password you do not reuse elsewhere."}>
            <PasswordInput id="np" autoComplete="new-password" minLength={4} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </Field>
          <button className="btn-secondary w-full sm:w-auto" disabled={update.isPending || !pw.current || pw.next.length < 4}>
            {update.isPending ? "Updating…" : `Update ${credLabel}`}
          </button>
        </form>
      </div>

      <p className="tiny flex items-center gap-1.5"><IconCheck className="h-4 w-4 text-emerald-700" />Discussion posts and comments never show your name — they are anonymous by design.</p>
    </div>
  );
}
