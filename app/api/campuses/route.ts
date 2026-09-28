import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
export async function GET() {
  const campuses = await prisma.campus.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } });
  return ok({ campuses });
}
