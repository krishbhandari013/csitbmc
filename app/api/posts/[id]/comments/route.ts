import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, err, httpStatus } from "@/lib/api";

const schema = z.object({ body: z.string().trim().min(1).max(1500) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Comment must be 1–1500 characters.", 400);
    const post = await prisma.post.findFirst({ where: { id: params.id, campusId: s.campusId } });
    if (!post || post.hidden) return err("Post not found.", 404);
    // No author stored on comment.
    const comment = await prisma.comment.create({
      data: { postId: params.id, body: parsed.data.body },
      select: { id: true, body: true, createdAt: true },
    });
    await prisma.post.update({ where: { id: params.id }, data: { commentCount: { increment: 1 } } });
    return ok({ comment }, 201);
  } catch (e: any) { return err(e.message ?? "Failed", httpStatus(e, 500)); }
}
