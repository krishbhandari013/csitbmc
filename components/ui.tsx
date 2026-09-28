"use client";
import { useEffect, useId, useRef, useState } from "react";
import { IconAlert, IconCheck, IconX } from "./icons";

/* ---------- Form field wrapper: label + control + hint + error ---------- */
export function Field({ label, htmlFor, hint, error, children, optional }: {
  label: string; htmlFor: string; hint?: string; error?: string; children: React.ReactNode; optional?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label} {optional && <span className="font-normal text-slate-400">(optional)</span>}
      </label>
      {children}
      {error ? <p className="field-error" role="alert"><IconAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>
        : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

/* ---------- Password / PIN input with show/hide ---------- */
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={shown ? "text" : "password"} className={`${props.className ?? ""} input pr-12`} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
      >
        {shown
          ? <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden><path d="M4 4l16 16" /><path d="M10 6c.7-.1 1.3-.2 2-.2 6.5 0 10 6.2 10 6.2a17 17 0 0 1-3 3.4M6 8A16 16 0 0 0 2 12s3.5 7 10 7c1.5 0 2.9-.3 4.1-.9" /></svg>
          : <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>}
      </button>
    </div>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({ options, value, onChange, label, size }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; size?: "full" | "auto";
}) {
  return (
    <div className={`segmented ${size === "full" ? "w-full" : ""}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

/* ---------- Status badge with icon + text (never color alone) ---------- */
export function StatusBadge({ tone, icon, children }: {
  tone: "slate" | "blue" | "green" | "red" | "amber" | "sky"; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return <span className={`badge-${tone}`}>{icon}{children}</span>;
}

export function PresentBadge() {
  return <StatusBadge tone="green" icon={<IconCheck className="h-3.5 w-3.5" />}>Present · P</StatusBadge>;
}
export function AbsentBadge() {
  return <StatusBadge tone="red" icon={<IconX className="h-3.5 w-3.5" />}>Absent · A</StatusBadge>;
}
export function AnonBadge() {
  return (
    <span className="badge-slate" title="Author identity is not stored and is never shown">
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="0.6" fill="currentColor" /><circle cx="15" cy="10" r="0.6" fill="currentColor" /><path d="M8.5 15.5c2-1.2 5-1.2 7 0" /></svg>
      Anonymous
    </span>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({ title, sub, action }: { title: string; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="page-title">{title}</h1>
        {sub && <div className="muted mt-1">{sub}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/* ---------- States ---------- */
export function EmptyState({ icon, title, sub, action }: { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      {icon && <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">{icon}</span>}
      <p className="font-bold">{title}</p>
      {sub && <p className="max-w-sm text-sm text-slate-600">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="form-error" role="alert">
      <IconAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">{message}</div>
      {onRetry && <button onClick={onRetry} className="shrink-0 font-bold underline">Retry</button>}
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading" role="status">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card card-pad space-y-2">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      ))}
      <span className="sr-only">Loading content…</span>
    </div>
  );
}

/* ---------- Stat ---------- */
export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card card-pad min-w-0">
      <p className="tiny font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold">{value}</p>
      {sub && <p className="tiny mt-0.5">{sub}</p>}
    </div>
  );
}

/* ---------- Accessible dialog (replaces window.confirm / prompt) ---------- */
export function Dialog({ title, children, onClose, actions, wide }: {
  title: string; children: React.ReactNode; onClose: () => void; actions?: React.ReactNode; wide?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  // Latest onClose in a ref so the mount-only effect below never goes stale
  // and never re-runs (re-running would steal focus on every keystroke).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} className={`dialog ${wide ? "sm:max-w-lg" : ""}`}>
        <h2 id={`${id}-t`} className="section-title">{title}</h2>
        <div className="mt-3">{children}</div>
        {actions && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------- Search input ---------- */
export function SearchInput({ value, onChange, label, placeholder }: {
  value: string; onChange: (v: string) => void; label: string; placeholder?: string;
}) {
  return (
    <div className="relative">
      <label htmlFor={`search-${label}`} className="sr-only">{label}</label>
      <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input
        id={`search-${label}`} type="search" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search…"} className="input pl-10"
      />
    </div>
  );
}
