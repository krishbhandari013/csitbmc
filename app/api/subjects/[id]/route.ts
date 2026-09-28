import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { teacherSubjectIds } from "@/lib/permissions";
import { ok, err, httpStatus } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession();
    const subject = await prisma.subject.findUnique({
      where: { id: params.id },
      include: { topics: { orderBy: { order: "asc" } }, assignments: { orderBy: { dueDate: "asc" } }, campus: { select: { name: true, code: true } } },
    });
    if (!subject || subject.campusId !== s.campusId) return err("Subject not found.", 404);
    if (s.role === "STUDENT" && subject.semester !== s.user.semester) return err("Forbidden.", 403);
    if (s.role === "TEACHER") {
      const ids = await teacherSubjectIds(prisma, s.uid);
      if (!ids.includes(subject.id)) return err("Not assigned to this subject.", 403);
    }
    let myAttendance: any[] = [];
    if (s.role === "STUDENT") {
      myAttendance = await prisma.attendanceRecord.findMany({ where: { subjectId: subject.id, studentId: s.uid }, orderBy: { date: "desc" }, take: 60 });
    }
    return ok({ subject, myAttendance });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession(["ADMIN"]);
    await prisma.subject.deleteMany({ where: { id: params.id, campusId: s.campusId } });
    return ok({ ok: true });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
