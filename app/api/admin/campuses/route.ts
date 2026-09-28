import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, err, httpStatus } from "@/lib/api";

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });
    return ok({ campuses });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

export async function POST(req: Request) {
  try {
    await requireSession(["ADMIN"]);
    const parsed = z.object({ code: z.string().min(2).max(12), name: z.string().min(2).max(120), address: z.string().max(200).default("") }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Code and name are required.", 400);
    const c = await prisma.campus.create({ data: parsed.data });
    return ok({ campus: c }, 201);
  } catch (e: any) {
    if (String(e.message).includes("Unique")) return err("Campus code already exists.", 409);
    return err(e.message ?? "Failed", httpStatus(e, 500));
  }
}
