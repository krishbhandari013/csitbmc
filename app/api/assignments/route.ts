import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { teacherSubjectIds } from "@/lib/permissions";
import { ok, err, httpStatus } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const s = await requireSession();
    const subjectId = new URL(req.url).searchParams.get("subjectId");
    if (!subjectId) return err("subjectId is required.", 400);
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.campusId !== s.campusId) return err("Subject not found.", 404);
    if (s.role === "STUDENT" && subject.semester !== s.user.semester) return err("Forbidden.", 403);
    if (s.role === "TEACHER" && !(await teacherSubjectIds(prisma, s.uid)).includes(subjectId)) return err("Forbidden.", 403);
    const assignments = await prisma.assignment.findMany({
      where: { subjectId }, orderBy: { dueDate: "asc" },
      include: s.role === "STUDENT"
        ? { submissions: { where: { studentId: s.uid } } }
        : { submissions: { include: { student: { select: { rollNumber: true, name: true } } } } },
    });
    return ok({ assignments });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

const schema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(3).max(140),
  description: z.string().max(2000).default(""),
  dueDate: z.string().min(8),
  link: z.string().max(500).default(""),
});

export async function POST(req: Request) {
  try {
    const s = await requireSession(["TEACHER", "ADMIN"]);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Title and due date are required.", 400);
    const subject = await prisma.subject.findUnique({ where: { id: parsed.data.subjectId } });
    if (!subject || subject.campusId !== s.campusId) return err("Subject not found.", 404);
    if (s.role === "TEACHER" && !(await teacherSubjectIds(prisma, s.uid)).includes(subject.id)) return err("Forbidden.", 403);
    const dueDate = new Date(parsed.data.dueDate);
    if (isNaN(dueDate.getTime())) return err("Invalid due date.", 400);
    const a = await prisma.assignment.create({ data: { subjectId: subject.id, title: parsed.data.title, description: parsed.data.description, dueDate, link: parsed.data.link } });
    // Pre-create incomplete submission rows for all semester students
    const students = await prisma.user.findMany({ where: { role: "STUDENT", campusId: s.campusId, semester: subject.semester, active: true }, select: { id: true } });
    await Promise.all(students.map((st) => prisma.submissionStatus.upsert({
      where: { assignmentId_studentId: { assignmentId: a.id, studentId: st.id } },
      update: {}, create: { assignmentId: a.id, studentId: st.id, isComplete: false },
    })));
    return ok({ assignment: a }, 201);
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
