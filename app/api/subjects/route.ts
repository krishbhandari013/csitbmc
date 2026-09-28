import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { teacherSubjectIds } from "@/lib/permissions";
import { ok, err, httpStatus } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const s = await requireSession();
    const url = new URL(req.url);
    if (s.role === "STUDENT") {
      const subjects = await prisma.subject.findMany({
        where: { campusId: s.campusId, semester: s.user.semester },
        orderBy: { code: "asc" },
        include: { _count: { select: { topics: true, assignments: true } } },
      });
      return ok({ subjects });
    }
    const sem = parseInt(url.searchParams.get("semester") ?? "0");
    const where: any = { campusId: s.campusId };
    if (sem >= 1 && sem <= 8) where.semester = sem;
    let subjects = await prisma.subject.findMany({ where, orderBy: [{ semester: "asc" }, { code: "asc" }], include: { _count: { select: { topics: true, assignments: true } } } });
    if (s.role === "TEACHER") {
      const ids = new Set(await teacherSubjectIds(prisma, s.uid));
      subjects = subjects.filter((x) => ids.has(x.id));
    }
    return ok({ subjects });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

const createSchema = z.object({
  campusId: z.string().optional(),
  semester: z.number().int().min(1).max(8),
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).default(""),
});

export async function POST(req: Request) {
  try {
    const s = await requireSession(["ADMIN"]);
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Valid semester, code and name are required.", 400);
    const subject = await prisma.subject.create({ data: {
      campusId: parsed.data.campusId ?? s.campusId,
      semester: parsed.data.semester, code: parsed.data.code, name: parsed.data.name, description: parsed.data.description,
    }});
    return ok({ subject }, 201);
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
