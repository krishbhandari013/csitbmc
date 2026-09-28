import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, err, httpStatus } from "@/lib/api";

export async function GET() {
  try {
    const s = await requireSession();
    const { passwordHash, ...safe } = s.user;
    let extra: any = {};
    if (s.role === "TEACHER") {
      const rows = await prisma.teacherAssignment.findMany({ where: { teacherId: s.uid }, include: { subject: { select: { id: true, code: true, name: true, semester: true } } } });
      extra.subjects = rows.map((r) => r.subject);
    }
    return ok({ user: safe, ...extra });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

export async function PATCH(req: Request) {
  try {
    const s = await requireSession();
    // Only safe self-editable fields: name, and password/PIN change with verification.
    const parsed = z.object({
      name: z.string().min(2).max(80).optional(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(4).max(128).optional(),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Invalid profile data.", 400);
    const data: any = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.newPassword) {
      if (!parsed.data.currentPassword) return err("Current PIN/password is required.", 400);
      const fresh = await prisma.user.findUnique({ where: { id: s.uid } });
      if (!fresh || !(await bcrypt.compare(parsed.data.currentPassword, fresh.passwordHash))) return err("Current credential is incorrect.", 401);
      data.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
      data.mustChangePw = false;
    }
    // role, campusId, semester, rollNumber are NEVER self-editable — ignored even if sent.
    const updated = await prisma.user.update({ where: { id: s.uid }, data });
    const { passwordHash, ...safe } = updated;
    return ok({ user: safe });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
