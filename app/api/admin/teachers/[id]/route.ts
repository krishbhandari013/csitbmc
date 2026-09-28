import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, err, httpStatus } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSession(["ADMIN"]);
    const parsed = z.object({
      active: z.boolean().optional(), newPassword: z.string().min(8).max(128).optional(),
      assignSubjectId: z.string().optional(), unassignSubjectId: z.string().optional(),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Invalid payload.", 400);
    if (typeof parsed.data.active === "boolean")
      await prisma.user.update({ where: { id: params.id }, data: { active: parsed.data.active } });
    if (parsed.data.newPassword)
      await prisma.user.update({ where: { id: params.id }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), mustChangePw: true } });
    if (parsed.data.assignSubjectId)
      await prisma.teacherAssignment.upsert({
        where: { teacherId_subjectId: { teacherId: params.id, subjectId: parsed.data.assignSubjectId } },
        update: {}, create: { teacherId: params.id, subjectId: parsed.data.assignSubjectId },
      });
    if (parsed.data.unassignSubjectId)
      await prisma.teacherAssignment.deleteMany({ where: { teacherId: params.id, subjectId: parsed.data.unassignSubjectId } });
    return ok({ ok: true });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
