"use client";
import { useState } from "react";
// NOTE: server-state fetching lives in lib/api-client.ts + lib/hooks.ts
// (TanStack Query). This module keeps UI-only helpers.
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  function show(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  }
  const el = msg ? (
    <div role="status" aria-live="polite" className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${msg.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>{msg.text}</div>
  ) : null;
  return { show, el };
}
export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
