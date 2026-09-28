import { createHmac } from "crypto";

// One-way vote key: prevents duplicate votes without storing a plaintext userId in the vote row.
export function voterKey(userId: string, postId: string) {
  const s = process.env.SESSION_SECRET ?? "dev-secret";
  return createHmac("sha256", s).update(`${userId}:post:${postId}`).digest("hex");
}

// ---- brute-force protection (in-memory, per instance) ----
const attempts = new Map<string, { count: number; until: number }>();
export function checkRateLimit(key: string, max = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (rec && rec.until > now) return false; // locked
  if (rec && rec.until <= now) attempts.delete(key);
  return true;
}
export function recordFailedLogin(key: string, max = 8, lockMs = 10 * 60 * 1000) {
  const now = Date.now();
  const rec = attempts.get(key) ?? { count: 0, until: 0 };
  rec.count += 1;
  if (rec.count >= max) { rec.until = now + lockMs; rec.count = 0; }
  attempts.set(key, rec);
}
export function clearLoginAttempts(key: string) { attempts.delete(key); }
