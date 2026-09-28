import Link from "next/link";
import { IconBack, IconCheck, IconMask, IconShield, IconX } from "@/components/icons";

const POINTS = [
  {
    title: "Posts and comments are anonymous",
    body: "They store only campus scope, text and timestamps. There is no author ID, username, role, IP address or user-agent column — enforced in the database schema, not just hidden in the interface.",
    good: true,
  },
  {
    title: "Admins see the same anonymous feed",
    body: "Moderation works by hiding reported content. Administrators cannot reveal authors because the link does not exist in the database.",
    good: true,
  },
  {
    title: "Votes stay private",
    body: "To prevent duplicate votes, the app stores a one-way HMAC (voterKey = HMAC(secret, userId + postId)) in a separate collection. The app never shows who voted, and votes carry no link to anything you wrote — authorship itself is never recorded.",
    good: true,
  },
  {
    title: "Reports are anonymous too",
    body: "Abuse reports store only the reason and counts. No reporter identity is attached.",
    good: true,
  },
  {
    title: "Academic records are NOT anonymous",
    body: "Attendance and assignments are identified by roll number by design — teachers need to know who was present and who submitted.",
    good: false,
  },
  {
    title: "No protection against infrastructure operators",
    body: "No app can promise anonymity against network or database operators (hosting provider, network logs). The guarantee here holds against other users, teachers and admins using the application.",
    good: false,
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-3.5">
      <Link href="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-700">
        <IconBack />Back to feed
      </Link>
      <div className="card card-pad">
        <p className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700" aria-hidden><IconMask /></span>
          <span className="badge-blue">Privacy boundary</span>
        </p>
        <h1 className="page-title mt-2">How anonymity works</h1>
        <p className="muted mt-1">Plain-language promises about what the discussion board hides — and what it does not.</p>
      </div>

      <ul className="space-y-2.5" role="list">
        {POINTS.map((p) => (
          <li key={p.title} className="card flex gap-3 p-4">
            <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${p.good ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
              {p.good ? <IconCheck /> : <IconShield className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold">{p.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="notice-warn">
        <IconX className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Safety tip:</strong> do not post names, phone numbers or exact roll numbers if you want to stay anonymous — the words you write are visible to everyone on your campus.</p>
      </div>
    </div>
  );
}
