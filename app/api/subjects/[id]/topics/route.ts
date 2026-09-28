import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { teacherSubjectIds } from "@/lib/permissions";
import { ok, err, httpStatus } from "@/lib/api";

async function canEdit(s: any, subjectId: string) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject || subject.campusId !== s.campusId) return null;
  if (s.role === "ADMIN") return subject;
  if (s.role === "TEACHER" && (await teacherSubjectIds(prisma, s.uid)).includes(subjectId)) return subject;
  return null;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession(["TEACHER", "ADMIN"]);
    const subject = await canEdit(s, params.id);
    if (!subject) return err("Forbidden.", 403);
    const parsed = z.object({ title: z.string().min(2).max(200) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Topic title is required.", 400);
    const count = await prisma.courseTopic.count({ where: { subjectId: params.id } });
    const topic = await prisma.courseTopic.create({ data: { subjectId: params.id, title: parsed.data.title, order: count } });
    return ok({ topic }, 201);
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
