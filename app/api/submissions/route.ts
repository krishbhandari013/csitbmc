import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { teacherSubjectIds } from "@/lib/permissions";
import { ok, err, httpStatus } from "@/lib/api";

export async function PATCH(req: Request) {
  try {
    const s = await requireSession(["TEACHER", "ADMIN"]);
    const parsed = z.object({ assignmentId: z.string(), studentId: z.string(), isComplete: z.boolean() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Invalid payload.", 400);
    const a = await prisma.assignment.findUnique({ where: { id: parsed.data.assignmentId }, include: { subject: true } });
    if (!a || a.subject.campusId !== s.campusId) return err("Not found.", 404);
    if (s.role === "TEACHER" && !(await teacherSubjectIds(prisma, s.uid)).includes(a.subjectId)) return err("Forbidden.", 403);
    const sub = await prisma.submissionStatus.upsert({
      where: { assignmentId_studentId: { assignmentId: a.id, studentId: parsed.data.studentId } },
      update: { isComplete: parsed.data.isComplete },
      create: { assignmentId: a.id, studentId: parsed.data.studentId, isComplete: parsed.data.isComplete },
    });
    return ok({ submission: sub });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
