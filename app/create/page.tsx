"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/client";
import { Field } from "@/components/ui";
import { IconBack, IconInfo, IconMask } from "@/components/icons";
import { reportError, useCreatePost } from "@/lib/hooks";

const TITLE_MAX = 140;
const BODY_MAX = 4000;

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { show, el } = useToast();
  const router = useRouter();
  const createPost = useCreatePost();

  const titleLen = title.trim().length;
  const bodyLen = body.trim().length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (titleLen < 3) er.title = "Give your post a title of at least 3 characters.";
    if (bodyLen < 3) er.body = "Write at least 3 characters so others can respond helpfully.";
    setErrors(er);
    if (Object.keys(er).length || createPost.isPending) return;
    try {
      const d = await createPost.mutateAsync({ title: title.trim(), body: body.trim() });
      show("Posted anonymously.");
      router.push(`/posts/${d.post.id}`);
    } catch (err) {
      reportError(show, err, router);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {el}
      <Link href="/" className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-700">
        <IconBack />Back to feed
      </Link>

      <div className="card card-pad">
        <h1 className="page-title">New anonymous post</h1>
        <div className="notice-info mt-3">
          <IconMask className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
          <p>Your name, role and account are <strong>not stored</strong> with this post and never shown — not even to admins.
            Avoid names, phone numbers or roll numbers in the text.</p>
        </div>

        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          <Field label="Title" htmlFor="t" error={errors.title}>
            <input id="t" className={`input ${errors.title ? "input-invalid" : ""}`} maxLength={TITLE_MAX}
              placeholder="What do you want to discuss?" value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: "" })); }} />
            <p className="hint" aria-live="polite">{titleLen}/{TITLE_MAX} · minimum 3</p>
          </Field>

          <Field label="Details" htmlFor="b" error={errors.body}>
            <textarea id="b" className={`input min-h-[180px] ${errors.body ? "input-invalid" : ""}`} maxLength={BODY_MAX}
              placeholder="Share context: which subject, semester or situation is this about?" value={body}
              onChange={(e) => { setBody(e.target.value); setErrors((p) => ({ ...p, body: "" })); }} />
            <p className="hint flex items-center justify-between" aria-live="polite">
              <span>{bodyLen}/{BODY_MAX} · minimum 3</span>
              {bodyLen > BODY_MAX - 200 && <span className="font-semibold text-amber-800">Almost at the limit</span>}
            </p>
          </Field>

          <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:justify-end">
            <Link href="/" className="btn-secondary">Cancel</Link>
            <button className="btn-primary sm:min-w-[180px]" disabled={createPost.isPending}>
              {createPost.isPending ? "Publishing…" : "Post anonymously"}
            </button>
          </div>
        </form>
      </div>

      <p className="mt-4 flex items-start gap-1.5 text-[13px] text-slate-500">
        <IconInfo className="mt-0.5 h-4 w-4 shrink-0" />
        Be kind: no harassment, no personal information, no exam malpractice. Posts that break the rules can be reported and hidden.
      </p>
    </div>
  );
}
