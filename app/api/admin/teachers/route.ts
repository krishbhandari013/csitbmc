import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, err, httpStatus } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const s = await requireSession(["ADMIN"]);
    const campusId = new URL(req.url).searchParams.get("campusId") ?? s.campusId;
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER", campusId }, orderBy: { name: "asc" },
      select: { id: true, username: true, name: true, active: true },
    });
    const assignments = await prisma.teacherAssignment.findMany({ include: { subject: { select: { id: true, code: true, name: true, semester: true } } } });
    return ok({ teachers, assignments: assignments.filter((a: any) => teachers.some((t) => t.id === a.teacherId)) });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

export async function POST(req: Request) {
  try {
    await requireSession(["ADMIN"]);
    const parsed = z.object({
      campusId: z.string().min(1), username: z.string().min(3).max(60),
      name: z.string().min(2).max(80), password: z.string().min(8).max(128),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Campus, username, name and password (min 8) are required.", 400);
    const dup = await prisma.user.findFirst({ where: { username: parsed.data.username } });
    if (dup) return err("Username already exists.", 409);
    const t = await prisma.user.create({
      data: { role: "TEACHER", campusId: parsed.data.campusId, username: parsed.data.username, name: parsed.data.name, passwordHash: await bcrypt.hash(parsed.data.password, 12), mustChangePw: true },
      select: { id: true, username: true, name: true, active: true },
    });
    return ok({ teacher: t }, 201);
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
