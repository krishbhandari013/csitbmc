"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Field, PasswordInput, Segmented } from "@/components/ui";
import { IconAlert, IconBook, IconShield, IconUser } from "@/components/icons";
import { errorMessage, useCampuses, useLogin } from "@/lib/hooks";

type Role = "student" | "teacher";

export default function LoginPage() {
  const [tab, setTab] = useState<Role>("student");
  const [campusId, setCampusId] = useState("");
  const [semester, setSemester] = useState("3");
  const [rollNumber, setRollNumber] = useState("");
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const router = useRouter();

  const campusesQuery = useCampuses();
  const campuses = campusesQuery.data?.campuses ?? [];
  const loginStudent = useLogin("student");
  const loginTeacher = useLogin("teacher");
  const busy = loginStudent.isPending || loginTeacher.isPending;

  useEffect(() => {
    if (campuses.length > 0 && !campusId) setCampusId(campuses[0].id);
  }, [campuses, campusId]);

  useEffect(() => {
    if (campusesQuery.isError) {
      setFormError("Could not load campuses. Check your connection and retry.");
    }
  }, [campusesQuery.isError]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!campusId) e.campus = "Choose your campus.";
    if (tab === "student") {
      if (rollNumber.trim().length < 2) e.roll = "Enter the roll number issued by your campus.";
      if (pin.length < 4) e.pin = "PIN must be at least 4 characters.";
    } else {
      if (username.trim().length < 2) e.username = "Enter your teacher username.";
      if (!password) e.password = "Enter your password.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError("");
    if (!validate() || busy) return;
    try {
      if (tab === "student") {
        await loginStudent.mutateAsync({ campusId, semester: Number(semester), rollNumber: rollNumber.trim(), pin });
      } else {
        await loginTeacher.mutateAsync({ campusId, username: username.trim(), password });
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-5 text-center sm:mb-6">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-xl font-bold text-white" aria-hidden>C</span>
        <h1 className="page-title mt-3">Welcome to CSIT Butwal</h1>
        <p className="muted mt-1">One platform for classes, attendance and anonymous campus discussion.</p>
      </div>

      <div className="card card-pad">
        <Segmented<Role>
          label="I am a"
          value={tab}
          onChange={(v) => { setTab(v); setErrors({}); setFormError(""); }}
          size="full"
          options={[{ value: "student", label: "Student" }, { value: "teacher", label: "Teacher" }]}
        />
        <p className="hint mt-2 flex items-center gap-1.5">
          {tab === "student" ? <><IconBook className="h-4 w-4 shrink-0" />Sign in with your campus, semester, roll number and admin-issued PIN.</>
            : <><IconUser className="h-4 w-4 shrink-0" />Sign in with your campus, teacher username and password.</>}
        </p>

        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          <Field label="Campus" htmlFor="campus" error={errors.campus}>
            <select id="campus" className={`input ${errors.campus ? "input-invalid" : ""}`} required value={campusId}
              onChange={(e) => { setCampusId(e.target.value); setErrors((p) => ({ ...p, campus: "" })); }}>
              <option value="">Select campus…</option>
              {campuses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </Field>

          {tab === "student" ? (
            <>
              <div>
                <span className="label" id="sem-label">Semester</span>
                <div className="segmented w-full" role="radiogroup" aria-labelledby="sem-label">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={semester === String(n)} onClick={() => setSemester(String(n))}>{n}</button>
                  ))}
                </div>
              </div>
              <Field label="Roll number" htmlFor="roll" error={errors.roll} hint="As printed on your campus ID, e.g. BMC-2079-0301.">
                <input id="roll" className={`input ${errors.roll ? "input-invalid" : ""}`} autoComplete="username"
                  placeholder="e.g. BMC-2079-0301" value={rollNumber}
                  onChange={(e) => { setRollNumber(e.target.value); setErrors((p) => ({ ...p, roll: "" })); }} />
              </Field>
              <Field label="PIN" htmlFor="pin" error={errors.pin} hint="Issued by your campus admin office. You can change it later under Profile.">
                <PasswordInput id="pin" autoComplete="current-password" placeholder="Enter your PIN"
                  value={pin} onChange={(e) => { setPin(e.target.value); setErrors((p) => ({ ...p, pin: "" })); }}
                  className={errors.pin ? "input-invalid" : ""} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Username" htmlFor="uname" error={errors.username}>
                <input id="uname" className={`input ${errors.username ? "input-invalid" : ""}`} autoComplete="username"
                  placeholder="e.g. teacher1.bmc" value={username}
                  onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, username: "" })); }} />
              </Field>
              <Field label="Password" htmlFor="pw" error={errors.password} hint="Teacher accounts are created by an administrator.">
                <PasswordInput id="pw" autoComplete="current-password" placeholder="Enter your password"
                  value={password} onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                  className={errors.password ? "input-invalid" : ""} />
              </Field>
            </>
          )}

          {formError && (
            <p className="form-error" role="alert">
              <IconAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <span className="flex-1">{formError}</span>
              {campusesQuery.isError && (
                <button type="button" onClick={() => { setFormError(""); campusesQuery.refetch(); }} className="shrink-0 font-bold underline">
                  Retry
                </button>
              )}
            </p>
          )}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : `Sign in as ${tab}`}
          </button>
        </form>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[13px] text-slate-500">
        <IconShield className="h-4 w-4" />
        Campus administrator? <Link className="font-semibold text-brand-700 underline-offset-2 hover:underline" href="/admin/login">Admin sign-in</Link>
      </p>
    </div>
  );
}
