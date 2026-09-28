import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, err, httpStatus } from "@/lib/api";

// PATCH /api/admin/students/:id  { semester?, active?, resetPin? }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSession(["ADMIN"]);
    const parsed = z.object({
      semester: z.number().int().min(1).max(8).optional(),
      active: z.boolean().optional(),
      resetPin: z.string().min(4).max(32).optional(),
      name: z.string().max(80).optional(),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Invalid payload.", 400);
    const data: any = {};
    if (parsed.data.semester) data.semester = parsed.data.semester;
    if (typeof parsed.data.active === "boolean") data.active = parsed.data.active;
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.resetPin) { data.passwordHash = await bcrypt.hash(parsed.data.resetPin, 12); data.mustChangePw = true; }
    const updated = await prisma.user.update({ where: { id: params.id }, data, select: { id: true, rollNumber: true, semester: true, name: true, active: true } });
    return ok({ student: updated });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSession(["ADMIN"]);
    await prisma.user.update({ where: { id: params.id }, data: { active: false } });
    return ok({ ok: true });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
