import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { voterKey } from "@/lib/security";
import { ok, err, httpStatus } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession();
    const post = await prisma.post.findFirst({
      where: { id: params.id, campusId: s.campusId },
      select: { id: true, title: true, body: true, upvoteCount: true, commentCount: true, createdAt: true, hidden: true },
    });
    if (!post || post.hidden) return err("Post not found.", 404);
    const comments = await prisma.comment.findMany({
      where: { postId: params.id, hidden: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, body: true, createdAt: true },
    });
    const hasVoted = !!(await prisma.vote.findUnique({ where: { voterKey: voterKey(s.uid, params.id) } }));
    return ok({ post, comments, hasVoted });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession(["ADMIN"]);
    // Admin moderation: hide only — authorship is unknown even here.
    await prisma.post.updateMany({ where: { id: params.id, campusId: s.campusId }, data: { hidden: true } });
    return ok({ ok: true });
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
