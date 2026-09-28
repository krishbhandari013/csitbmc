"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, PasswordInput } from "@/components/ui";
import { IconAlert, IconBack, IconShield } from "@/components/icons";
import { errorMessage, useLogin } from "@/lib/hooks";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const router = useRouter();
  const login = useLogin("admin");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (username.trim().length < 2) er.username = "Enter your admin username.";
    if (!password) er.password = "Enter your password.";
    setErrors(er);
    if (Object.keys(er).length || login.isPending) return;
    setFormError("");
    try {
      await login.mutateAsync({ username: username.trim(), password });
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Link href="/login" className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-700">
        <IconBack />Back to sign-in
      </Link>
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-800 text-white" aria-hidden><IconShield /></span>
        <h1 className="page-title mt-3">Admin sign-in</h1>
        <p className="muted mt-1">Restricted area. No default production password — see the README for first-admin setup.</p>
      </div>

      <div className="card card-pad mt-5">
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="Username" htmlFor="au" error={errors.username}>
            <input id="au" className={`input ${errors.username ? "input-invalid" : ""}`} autoComplete="username"
              value={username} onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, username: "" })); }} />
          </Field>
          <Field label="Password" htmlFor="ap" error={errors.password}>
            <PasswordInput id="ap" autoComplete="current-password" value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
              className={errors.password ? "input-invalid" : ""} />
          </Field>
          {formError && <p className="form-error" role="alert"><IconAlert className="mt-0.5 h-5 w-5 shrink-0" />{formError}</p>}
          <button className="btn-primary w-full" disabled={login.isPending}>{login.isPending ? "Signing in…" : "Sign in as admin"}</button>
        </form>
      </div>
    </div>
  );
}
