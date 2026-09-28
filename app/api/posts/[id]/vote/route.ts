import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { voterKey } from "@/lib/security";
import { ok, err, httpStatus } from "@/lib/api";

// Toggle upvote. Vote rows store only an HMAC key — no plaintext user id.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession();
    const post = await prisma.post.findFirst({ where: { id: params.id, campusId: s.campusId } });
    if (!post || post.hidden) return err("Post not found.", 404);
    const key = voterKey(s.uid, params.id);
    const existing = await prisma.vote.findUnique({ where: { voterKey: key } });
    if (existing) {
      await prisma.vote.delete({ where: { voterKey: key } });
      await prisma.post.update({ where: { id: params.id }, data: { upvoteCount: { decrement: 1 } } });
      return ok({ voted: false });
    }
    await prisma.vote.create({ data: { voterKey: key, postId: params.id } });
    await prisma.post.update({ where: { id: params.id }, data: { upvoteCount: { increment: 1 } } });
    return ok({ voted: true });
  } catch (e: any) { return err(e.message ?? "Vote failed", httpStatus(e, 500)); }
}
