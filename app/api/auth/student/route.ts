import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { checkRateLimit, recordFailedLogin, clearLoginAttempts } from "@/lib/security";
import { ok, err } from "@/lib/api";

const schema = z.object({
  campusId: z.string().min(1),
  semester: z.number().int().min(1).max(8),
  rollNumber: z.string().min(2).max(40),
  pin: z.string().min(4).max(32),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Campus, semester (1–8), roll number and PIN are required.", 400);
  const { campusId, semester, rollNumber, pin } = parsed.data;
  const key = `student:${ip}:${campusId}:${rollNumber}`;
  if (!checkRateLimit(key)) return err("Too many attempts. Try again in 10 minutes.", 429);
  const user = await prisma.user.findFirst({ where: { role: "STUDENT", campusId, semester, rollNumber } });
  if (!user || !(await bcrypt.compare(pin, user.passwordHash))) {
    recordFailedLogin(key);
    return err("Invalid credentials.", 401);
  }
  clearLoginAttempts(key);
  await createSession(user.id, user.role, user.campusId);
  return ok({ ok: true });
}
