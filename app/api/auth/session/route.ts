import { getSession, clearSession } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function GET() {
  const s = await getSession();
  if (!s) return ok({ user: null });
  const { user } = s;
  // Never leak password hash
  const { passwordHash, ...safe } = user;
  return ok({ user: safe });
}

export async function DELETE() {
  clearSession();
  return ok({ ok: true });
}
