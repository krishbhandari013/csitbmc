import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { checkRateLimit, recordFailedLogin, clearLoginAttempts } from "@/lib/security";
import { ok, err } from "@/lib/api";

const schema = z.object({
  campusId: z.string().min(1),
  username: z.string().min(2).max(60),
  password: z.string().min(4).max(128),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Campus, username and password are required.", 400);
  const { campusId, username, password } = parsed.data;
  const key = `teacher:${ip}:${username}`;
  if (!checkRateLimit(key)) return err("Too many attempts. Try again in 10 minutes.", 429);
  const user = await prisma.user.findFirst({ where: { role: "TEACHER", campusId, username } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    recordFailedLogin(key);
    return err("Invalid credentials.", 401);
  }
  clearLoginAttempts(key);
  await createSession(user.id, user.role, user.campusId);
  return ok({ ok: true, mustChangePw: user.mustChangePw });
}
