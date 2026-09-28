import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, err, httpStatus } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const s = await requireSession(["ADMIN"]);
    const campusId = new URL(req.url).searchParams.get("campusId") ?? s.campusId;
    const students = await prisma.user.findMany({
      where: { role: "STUDENT", campusId }, orderBy: [{ semester: "asc" }, { rollNumber: "asc" }],
      select: { id: true, rollNumber: true, semester: true, name: true, active: true, campusId: true },
    });
    return ok({ students });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

const createSchema = z.object({
  campusId: z.string().min(1),
  rollNumber: z.string().min(2).max(40),
  semester: z.number().int().min(1).max(8),
  name: z.string().max(80).default(""),
  pin: z.string().min(4).max(32),
});

export async function POST(req: Request) {
  try {
    await requireSession(["ADMIN"]);
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Campus, roll number, semester and initial PIN are required.", 400);
    const { campusId, rollNumber, semester, name, pin } = parsed.data;
    // Prevent duplicate roll numbers within campus+semester scope
    const dup = await prisma.user.findFirst({ where: { role: "STUDENT", campusId, semester, rollNumber } });
    if (dup) return err("Roll number already exists for this campus and semester.", 409);
    const st = await prisma.user.create({
      data: { role: "STUDENT", campusId, rollNumber, semester, name, passwordHash: await bcrypt.hash(pin, 12), mustChangePw: true },
      select: { id: true, rollNumber: true, semester: true, name: true, active: true },
    });
    return ok({ student: st }, 201);
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
