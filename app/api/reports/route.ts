import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, err, httpStatus } from "@/lib/api";

const schema = z.object({
  postId: z.string().optional(),
  commentId: z.string().optional(),
  reason: z.string().trim().min(3).max(500),
});

export async function POST(req: Request) {
  try {
    const s = await requireSession();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success || (!parsed.data.postId && !parsed.data.commentId)) return err("A valid report reason is required.", 400);
    // Reports are anonymous: reporter identity is never stored.
    if (parsed.data.postId) {
      const p = await prisma.post.findFirst({ where: { id: parsed.data.postId, campusId: s.campusId } });
      if (!p) return err("Post not found.", 404);
      await prisma.report.create({ data: { postId: parsed.data.postId, reason: parsed.data.reason } });
      await prisma.post.update({ where: { id: parsed.data.postId }, data: { reportCount: { increment: 1 } } });
    } else {
      await prisma.report.create({ data: { commentId: parsed.data.commentId, reason: parsed.data.reason } });
      await prisma.comment.update({ where: { id: parsed.data.commentId! }, data: { reportCount: { increment: 1 } } });
    }
    return ok({ ok: true }, 201);
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

export async function GET() {
  try {
    const s = await requireSession(["ADMIN"]);
    const [posts, comments] = await Promise.all([
      prisma.post.findMany({ where: { campusId: s.campusId, reportCount: { gt: 0 }, hidden: false }, orderBy: { reportCount: "desc" }, take: 30, select: { id: true, title: true, body: true, reportCount: true, createdAt: true } }),
      prisma.comment.findMany({ where: { reportCount: { gt: 0 }, hidden: false }, orderBy: { reportCount: "desc" }, take: 30, select: { id: true, body: true, reportCount: true, postId: true } }),
    ]);
    return ok({ posts, comments });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
