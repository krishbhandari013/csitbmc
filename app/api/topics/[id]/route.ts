import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { teacherSubjectIds } from "@/lib/permissions";
import { ok, err, httpStatus } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession(["TEACHER", "ADMIN"]);
    const topic = await prisma.courseTopic.findUnique({ where: { id: params.id }, include: { subject: true } });
    if (!topic || topic.subject.campusId !== s.campusId) return err("Not found.", 404);
    if (s.role === "TEACHER" && !(await teacherSubjectIds(prisma, s.uid)).includes(topic.subjectId)) return err("Forbidden.", 403);
    const parsed = z.object({ isComplete: z.boolean() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Invalid status.", 400);
    const updated = await prisma.courseTopic.update({ where: { id: params.id }, data: { isComplete: parsed.data.isComplete } });
    return ok({ topic: updated });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession(["TEACHER", "ADMIN"]);
    const topic = await prisma.courseTopic.findUnique({ where: { id: params.id }, include: { subject: true } });
    if (!topic || topic.subject.campusId !== s.campusId) return err("Not found.", 404);
    if (s.role === "TEACHER" && !(await teacherSubjectIds(prisma, s.uid)).includes(topic.subjectId)) return err("Forbidden.", 403);
    await prisma.courseTopic.delete({ where: { id: params.id } });
    return ok({ ok: true });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
