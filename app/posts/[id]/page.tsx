"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { timeAgo, useToast } from "@/components/client";
import { AnonBadge, Dialog, EmptyState, ErrorState, Field, SkeletonList, StatusBadge } from "@/components/ui";
import { IconArrowUp, IconBack, IconChat, IconFlag } from "@/components/icons";
import { reportError, useAddComment, usePost, useReport, useVotePost } from "@/lib/hooks";

const REPORT_REASONS = ["Spam or misleading", "Harassment or hate", "Personal information", "Off-topic for campus", "Other"];

export default function PostDetail() {
  const { id } = useParams() as { id: string };
  const [comment, setComment] = useState("");
  const [reportingComment, setReportingComment] = useState<string | null>(null);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const { show, el } = useToast();
  const router = useRouter();

  const postQuery = usePost(id);
  const voteMutation = useVotePost();
  const commentMutation = useAddComment(id);
  const reportMutation = useReport();

  const data = postQuery.data ?? null;

  async function vote() {
    try {
      await voteMutation.mutateAsync(id);
    } catch (err) {
      reportError(show, err, router);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || commentMutation.isPending) return;
    try {
      await commentMutation.mutateAsync(comment.trim());
      setComment("");
      show("Comment posted anonymously.");
    } catch (err) {
      reportError(show, err, router);
    }
  }

  async function sendReport() {
    if (!reportingComment || reportMutation.isPending) return;
    try {
      await reportMutation.mutateAsync({ commentId: reportingComment, reason });
      setReportingComment(null);
      show("Report sent anonymously. Thank you.");
    } catch (err) {
      reportError(show, err, router);
    }
  }

  if (postQuery.isPending) return <div className="mx-auto w-full max-w-2xl"><SkeletonList rows={2} /></div>;
  if (postQuery.isError || !data) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-3">
        <Link href="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-700"><IconBack />Back to feed</Link>
        <ErrorState
          message={postQuery.error instanceof Error ? postQuery.error.message : "Could not load this post."}
          onRetry={() => postQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3.5">
      {el}
      <Link href="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-700">
        <IconBack />Back to feed
      </Link>

      <article className="card card-pad">
        <div className="flex flex-wrap items-center gap-2">
          <AnonBadge />
          <span className="tiny">· {timeAgo(data.post.createdAt)}</span>
          <StatusBadge tone="sky" icon={<IconChat className="h-3.5 w-3.5" />}>{data.post.commentCount} comments</StatusBadge>
        </div>
        <h1 className="mt-2 break-words text-xl font-bold tracking-tight sm:text-2xl">{data.post.title}</h1>
        <p className="mt-2.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-700">{data.post.body}</p>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button onClick={vote} disabled={voteMutation.isPending} aria-pressed={data.hasVoted}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-[10px] px-4 text-sm font-bold transition-colors disabled:opacity-50 ${data.hasVoted ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
            <IconArrowUp />{data.hasVoted ? `Upvoted · ${data.post.upvoteCount}` : `Upvote · ${data.post.upvoteCount}`}
          </button>
          <span className="tiny ml-3 hidden sm:inline">Tap again to remove your upvote.</span>
        </div>
      </article>

      <section className="card card-pad" aria-label="Comments">
        <h2 className="section-title">Discussion <span className="font-medium text-slate-500">· all anonymous</span></h2>
        <form onSubmit={send} className="mt-3.5 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="c" className="sr-only">Add an anonymous comment</label>
          <input id="c" className="input flex-1" placeholder="Share your thoughts anonymously…" maxLength={1500}
            value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn-primary sm:w-auto" disabled={commentMutation.isPending || !comment.trim()}>
            {commentMutation.isPending ? "Replying…" : "Reply"}
          </button>
        </form>

        {data.comments.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<IconChat className="h-6 w-6" />}
              title="No replies yet"
              sub="Be the first to help — your reply stays anonymous too."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {data.comments.map((c: any) => (
              <li key={c.id} className="rounded-[12px] bg-slate-50 p-3.5 ring-1 ring-slate-100">
                <p className="flex flex-wrap items-center gap-2">
                  <AnonBadge />
                  <span className="tiny">{timeAgo(c.createdAt)}</span>
                  <button onClick={() => { setReportingComment(c.id); setReason(REPORT_REASONS[0]); }}
                    aria-label="Report this comment" title="Report"
                    className="ml-auto inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-200/70 hover:text-slate-600">
                    <IconFlag className="h-4 w-4" />
                  </button>
                </p>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reportingComment && (
        <Dialog
          title="Report comment"
          onClose={() => setReportingComment(null)}
          actions={<>
            <button className="btn-secondary" onClick={() => setReportingComment(null)}>Cancel</button>
            <button className="btn-primary" onClick={sendReport} disabled={reportMutation.isPending}>{reportMutation.isPending ? "Sending…" : "Send report"}</button>
          </>}
        >
          <Field label="Reason" htmlFor="crep">
            <select id="crep" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <p className="hint mt-3">Reports are anonymous — your identity is not attached.</p>
        </Dialog>
      )}
    </div>
  );
}
