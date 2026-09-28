"use client";
import Link from "next/link";
import { useState } from "react";
import { timeAgo, useToast } from "@/components/client";
import { AnonBadge, Dialog, EmptyState, ErrorState, Field, Segmented, SkeletonList } from "@/components/ui";
import { IconArrowUp, IconChat, IconFlag, IconMask, IconPlus } from "@/components/icons";
import {
  reportError,
  useAddComment,
  useFeed,
  usePost,
  useReport,
  useSession,
  useVotePost,
  type FeedSort,
  type PostItem,
} from "@/lib/hooks";
import { useRouter } from "next/navigation";

const REPORT_REASONS = ["Spam or misleading", "Harassment or hate", "Personal information", "Off-topic for campus", "Other"];

function ReportDialog({ target, onClose, onDone }: { target: { kind: "post" | "comment"; id: string; title?: string }; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const report = useReport();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const payload = target.kind === "post"
        ? { postId: target.id, reason: detail.trim() ? `${reason} — ${detail.trim()}` : reason }
        : { commentId: target.id, reason: detail.trim() ? `${reason} — ${detail.trim()}` : reason };
      await report.mutateAsync(payload);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the report.");
    }
  }
  return (
    <Dialog
      title={`Report ${target.kind}`}
      onClose={onClose}
      actions={<>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={report.isPending}>{report.isPending ? "Sending…" : "Send report"}</button>
      </>}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="muted">Reports are anonymous — your identity is not attached. Moderators only see the content and the reason.</p>
        <Field label="Reason" htmlFor="rep-reason">
          <select id="rep-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Details" htmlFor="rep-detail" optional>
          <textarea id="rep-detail" className="input min-h-[80px]" maxLength={500} placeholder="Anything that helps a moderator decide…"
            value={detail} onChange={(e) => setDetail(e.target.value)} />
        </Field>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Dialog>
  );
}

function PostCard({ post, voted, onVote, voting, onReport, expanded, onToggleComments, onReportComment }: {
  post: PostItem; voted: boolean; voting: boolean; onVote: () => void; onReport: () => void;
  expanded: boolean; onToggleComments: () => void; onReportComment: (commentId: string) => void;
}) {
  return (
    <article className="card card-pad card-hover">
      <div className="flex items-center gap-2">
        <AnonBadge />
        <span className="tiny">· {timeAgo(post.createdAt)}</span>
      </div>
      <Link href={`/posts/${post.id}`} className="mt-1.5 block min-w-0">
        <h2 className="truncate text-[16px] font-bold tracking-tight hover:text-brand-700 sm:text-lg">{post.title}</h2>
        <p className="mt-1 line-clamp-3 break-words text-sm leading-relaxed text-slate-600">{post.body}</p>
      </Link>
      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2.5">
        <button
          onClick={onVote} disabled={voting}
          aria-pressed={voted} aria-label={voted ? `Remove upvote from ${post.title}` : `Upvote ${post.title}`}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-3 text-sm font-bold transition-colors disabled:opacity-50 ${voted ? "bg-brand-600 text-white hover:bg-brand-700" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <IconArrowUp />{post.upvoteCount}
        </button>
        <button
          onClick={onToggleComments} aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Show"} ${post.commentCount} comments on ${post.title}`}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold transition-colors ${expanded ? "bg-slate-200/70 text-slate-900" : "text-slate-600 hover:bg-slate-100"}`}>
          <IconChat />{post.commentCount}
        </button>
        <span className="flex-1" />
        <button onClick={onReport} aria-label={`Report ${post.title}`} title="Report"
          className="icon-btn !min-h-[40px] !min-w-[44px] text-slate-400 hover:text-slate-600">
          <IconFlag />
        </button>
      </div>
      {expanded && <InlineComments postId={post.id} onReportComment={onReportComment} />}
    </article>
  );
}

/* Facebook-style inline thread: avatar bubbles + inline composer, still fully anonymous. */
function InlineComments({ postId, onReportComment }: { postId: string; onReportComment: (commentId: string) => void }) {
  const [draft, setDraft] = useState("");
  const { show } = useToast();
  const router = useRouter();
  const detail = usePost(postId, true);
  const addComment = useAddComment(postId);
  const comments = detail.data?.comments ?? [];

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || addComment.isPending) return;
    try {
      await addComment.mutateAsync(draft.trim());
      setDraft("");
      show("Comment posted anonymously.");
    } catch (err) {
      reportError(show, err, router);
    }
  }

  return (
    <div className="mt-1 border-t border-slate-100 pt-3" aria-label="Comments">
      {/* composer first, like Facebook */}
      <form onSubmit={send} className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-500" aria-hidden>
          <IconMask className="h-4 w-4" />
        </span>
        <label htmlFor={`c-${postId}`} className="sr-only">Write an anonymous comment</label>
        <input
          id={`c-${postId}`}
          className="input !min-h-[40px] !rounded-full !py-2"
          placeholder="Write an anonymous comment…"
          maxLength={1500}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="submit"
          disabled={addComment.isPending || !draft.trim()}
          aria-label="Post comment"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
        >
          {addComment.isPending
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
            : <svg className="h-[18px] w-[18px] -translate-x-[1px] translate-y-[1px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M3.5 20.5 21 12 3.5 3.5l-.01 6.53L14 12 3.49 13.97l.01 6.53Z" /></svg>}
        </button>
      </form>

      {detail.isPending && (
        <div className="mt-3 space-y-2" role="status" aria-label="Loading comments">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="skeleton h-8 w-8 !rounded-full" />
              <div className="skeleton h-12 flex-1 !rounded-2xl" />
            </div>
          ))}
          <span className="sr-only">Loading comments…</span>
        </div>
      )}
      {!detail.isPending && detail.isError && (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          Could not load comments. <button className="font-bold underline" onClick={() => detail.refetch()}>Retry</button>
        </p>
      )}
      {!detail.isPending && !detail.isError && comments.length === 0 && (
        <p className="tiny mt-3">No comments yet — start the discussion above.</p>
      )}
      {!detail.isPending && !detail.isError && comments.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-500" aria-hidden>
                <IconMask className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="inline-block max-w-full rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2">
                  <p className="text-[11px] font-bold text-slate-500">Anonymous</p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{c.body}</p>
                </div>
                <p className="mt-1 flex items-center gap-2.5 pl-3.5 text-xs text-slate-500">
                  <span>{timeAgo(c.createdAt)}</span>
                  <button
                    onClick={() => onReportComment(c.id)}
                    className="min-h-[28px] font-semibold hover:text-slate-700 hover:underline"
                  >
                    Report
                  </button>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/posts/${postId}`}
        className="mt-2.5 inline-flex min-h-[36px] items-center text-[13px] font-semibold text-brand-700 underline-offset-2 hover:underline"
      >
        Open full discussion →
      </Link>
    </div>
  );
}

export default function HomePage() {
  const [sort, setSort] = useState<FeedSort>("new");
  const [reporting, setReporting] = useState<{ kind: "post" | "comment"; id: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { show, el } = useToast();
  const router = useRouter();

  const session = useSession();
  const me = session.data?.user ?? null;

  const feed = useFeed(sort, !!me);
  const voteMutation = useVotePost();

  const pages = feed.data?.pages ?? [];
  const posts = pages.flatMap((p) => p.posts);
  const votedIds = new Set(pages.flatMap((p) => p.votedByMe));

  const loading = session.isPending || (me !== null && feed.isPending);
  const error = feed.isError ? feed.error : null;

  async function vote(post: PostItem) {
    try {
      await voteMutation.mutateAsync(post.id);
    } catch (err) {
      reportError(show, err, router);
    }
  }

  if (session.isPending) return <SkeletonList rows={3} />;
  if (me === null) {
    return (
      <div className="mx-auto max-w-lg py-6 text-center sm:py-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-2xl font-bold text-white" aria-hidden>C</span>
        <h1 className="page-title mt-4">CSIT Campus Platform — Butwal</h1>
        <p className="muted mx-auto mt-2 max-w-sm">Courses, attendance, assignments and an anonymous discussion board for your campus.</p>
        <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Link href="/login" className="btn-primary">Sign in to continue</Link>
          <Link href="/privacy" className="btn-secondary">How anonymity works</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3.5">
      {el}
      <div className="card card-pad">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="page-title">Campus discussion</h1>
            <p className="muted mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="inline-flex items-center gap-1"><IconMask className="h-4 w-4" />Anonymous to everyone — even admins.</span>
              <Link className="font-semibold text-brand-700 underline-offset-2 hover:underline" href="/privacy">Learn more</Link>
            </p>
          </div>
          <Link href="/create" className="btn-primary btn-sm hidden !min-h-[44px] sm:inline-flex">
            <IconPlus />New post
          </Link>
        </div>
        <div className="mt-3.5 flex items-center gap-3">
          <Segmented<FeedSort>
            label="Sort posts"
            value={sort}
            onChange={setSort}
            options={[{ value: "new", label: "Newest" }, { value: "top", label: "Most upvoted" }]}
          />
          <span className="tiny ml-auto hidden shrink-0 sm:block" aria-live="polite">
            {feed.isFetching && !feed.isPending ? "Updating…" : `${posts.length} shown`}
          </span>
        </div>
      </div>

      {loading && <SkeletonList rows={3} />}
      {!loading && error && (
        <ErrorState
          message={error instanceof Error ? error.message : "Could not load the feed."}
          onRetry={() => feed.refetch()}
        />
      )}
      {!loading && !error && posts.length === 0 && (
        <EmptyState
          icon={<IconChat className="h-6 w-6" />}
          title="No posts yet on your campus"
          sub="Be the first to ask a question or start a discussion. Everything is anonymous."
          action={<Link href="/create" className="btn-primary"><IconPlus />Create the first post</Link>}
        />
      )}

      {!loading && !error && posts.map((p) => (
        <PostCard key={p.id} post={p} voted={votedIds.has(p.id)} voting={voteMutation.isPending && voteMutation.variables === p.id}
          onVote={() => vote(p)} onReport={() => setReporting({ kind: "post", id: p.id })}
          expanded={expandedId === p.id}
          onToggleComments={() => setExpandedId((cur) => (cur === p.id ? null : p.id))}
          onReportComment={(commentId) => setReporting({ kind: "comment", id: commentId })} />
      ))}

      {!loading && !error && feed.hasNextPage && (
        <button className="btn-secondary w-full" disabled={feed.isFetchingNextPage} onClick={() => feed.fetchNextPage()}>
          {feed.isFetchingNextPage ? "Loading…" : "Load more posts"}
        </button>
      )}

      <Link href="/create" className="fab" aria-label="Create a new anonymous post">
        <IconPlus />Post
      </Link>

      {reporting && (
        <ReportDialog target={reporting} onClose={() => setReporting(null)}
          onDone={() => { setReporting(null); show("Report sent anonymously. Thank you."); }} />
      )}
    </div>
  );
}
