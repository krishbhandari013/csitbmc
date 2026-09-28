import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { voterKey } from "@/lib/security";
import { ok, err, httpStatus } from "@/lib/api";

const createSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(3).max(4000),
});

export async function GET(req: Request) {
  try {
    const s = await requireSession();
    const url = new URL(req.url);
    const sort = url.searchParams.get("sort") === "top" ? "top" : "new";
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10"), 25);
    // Campus-scoped feed; hidden posts excluded (moderation)
    const where: any = { campusId: s.campusId, hidden: false };
    const orderBy = sort === "top" ? [{ upvoteCount: "desc" as const }, { createdAt: "desc" as const }] : [{ createdAt: "desc" as const }];
    const posts = await prisma.post.findMany({
      where, orderBy, take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, title: true, body: true, upvoteCount: true, commentCount: true, createdAt: true },
    });
    // NOTE: no author fields exist on Post — nothing to strip. Verify schema if auditing.
    let nextCursor: string | null = null;
    if (posts.length > limit) { nextCursor = posts[limit - 1].id; posts.length = limit; }
    else if (posts.length === limit && posts.length > 0) nextCursor = posts[posts.length - 1].id;
    // Which of these posts has the caller upvoted? (single batched lookup; votes stay anonymous)
    const keys = posts.map((p) => voterKey(s.uid, p.id));
    const mine = keys.length
      ? await prisma.vote.findMany({ where: { voterKey: { in: keys } }, select: { voterKey: true } })
      : [];
    const votedByMe = new Set(mine.map((v) => v.voterKey));
    const keyOf = (id: string) => voterKey(s.uid, id);
    return ok({ posts, nextCursor, votedByMe: posts.filter((p) => votedByMe.has(keyOf(p.id))).map((p) => p.id) });
  } catch (e: any) { return err(e.message ?? "Failed to load feed", httpStatus(e, 500)); }
}

export async function POST(req: Request) {
  try {
    const s = await requireSession();
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid post.", 400);
    // Author identity is NEVER stored — only campus scope + content.
    const post = await prisma.post.create({
      data: { campusId: s.campusId, title: parsed.data.title, body: parsed.data.body },
      select: { id: true, title: true, body: true, upvoteCount: true, commentCount: true, createdAt: true },
    });
    return ok({ post }, 201);
  } catch (e: any) { return err(e.message ?? "Failed to create post", httpStatus(e, 500)); }
}
