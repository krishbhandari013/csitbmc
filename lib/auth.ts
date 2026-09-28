import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE = "csit_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (>=32 chars). See .env.example");
  return new TextEncoder().encode(s);
}

export type SessionPayload = { uid: string; role: string; campusId: string; exp?: number };

export async function createSession(uid: string, role: string, campusId: string) {
  const token = await new SignJWT({ uid, role, campusId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  cookies().set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: MAX_AGE,
  });
}

export function clearSession() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSession(): Promise<(SessionPayload & { user: any }) | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const uid = payload.uid as string;
    const user = await prisma.user.findUnique({ where: { id: uid }, include: { campus: true } });
    if (!user || !user.active) return null;
    return { uid, role: payload.role as string, campusId: payload.campusId as string, user };
  } catch { return null; }
}

export async function requireSession(roles?: string[]) {
  const s = await getSession();
  if (!s) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  if (roles && !roles.includes(s.role)) throw Object.assign(new Error("Forbidden"), { status: 403 });
  return s;
}
