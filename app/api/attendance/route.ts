import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { teacherSubjectIds } from "@/lib/permissions";
import { bsMonthAdRange, startOfDay } from "@/lib/nepali";
import { ok, err, httpStatus } from "@/lib/api";

// GET ?subjectId=&bsYear=&bsMonth=  (BS month filter; defaults to current BS month)
export async function GET(req: Request) {
  try {
    const s = await requireSession();
    const url = new URL(req.url);
    const subjectId = url.searchParams.get("subjectId");
    if (!subjectId) return err("subjectId is required.", 400);
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.campusId !== s.campusId) return err("Subject not found.", 404);
    if (s.role === "STUDENT" && subject.semester !== s.user.semester) return err("Forbidden.", 403);
    if (s.role === "TEACHER" && !(await teacherSubjectIds(prisma, s.uid)).includes(subjectId)) return err("Forbidden.", 403);

    const bsYear = parseInt(url.searchParams.get("bsYear") ?? "0");
    const bsMonth = parseInt(url.searchParams.get("bsMonth") ?? "0");
    let where: any = { subjectId };
    if (bsYear > 2000 && bsMonth >= 1 && bsMonth <= 12) {
      const { start, end } = bsMonthAdRange(bsYear, bsMonth);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return err("Invalid BS year/month.", 400);
      where.date = { gte: startOfDay(start), lt: startOfDay(end) };
    }
    if (s.role === "STUDENT") {
      // Students see own records + roll-number list for the subject (no edit)
      const mine = await prisma.attendanceRecord.findMany({ where: { ...where, studentId: s.uid }, orderBy: { date: "desc" } });
      const roster = await prisma.attendanceRecord.findMany({
        where, orderBy: [{ date: "desc" }],
        include: { student: { select: { rollNumber: true } } }, take: 500,
      });
      return ok({ mine, roster: roster.map((r) => ({ date: r.date, status: r.status, rollNumber: r.student.rollNumber })) });
    }
    // Teacher/admin: full roll-number grid
    const students = await prisma.user.findMany({ where: { role: "STUDENT", campusId: s.campusId, semester: subject.semester, active: true }, orderBy: { rollNumber: "asc" }, select: { id: true, rollNumber: true, name: true } });
    const records = await prisma.attendanceRecord.findMany({ where, include: { student: { select: { rollNumber: true } } }, orderBy: { date: "asc" }, take: 2000 });
    return ok({ students, records });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

const markSchema = z.object({
  subjectId: z.string().min(1),
  date: z.string().min(8), // ISO date
  marks: z.array(z.object({ studentId: z.string(), status: z.enum(["P", "A"]) })).min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const s = await requireSession(["TEACHER", "ADMIN"]);
    const parsed = markSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Invalid attendance payload.", 400);
    const subject = await prisma.subject.findUnique({ where: { id: parsed.data.subjectId } });
    if (!subject || subject.campusId !== s.campusId) return err("Subject not found.", 404);
    if (s.role === "TEACHER" && !(await teacherSubjectIds(prisma, s.uid)).includes(subject.id)) return err("Forbidden.", 403);
    const date = startOfDay(new Date(parsed.data.date));
    if (isNaN(date.getTime())) return err("Invalid date.", 400);
    // Confirm students belong to same campus/semester
    for (const m of parsed.data.marks) {
      await prisma.attendanceRecord.upsert({
        where: { subjectId_studentId_date: { subjectId: subject.id, studentId: m.studentId, date } },
        update: { status: m.status },
        create: { subjectId: subject.id, studentId: m.studentId, date, status: m.status },
      });
    }
    return ok({ ok: true, date });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
