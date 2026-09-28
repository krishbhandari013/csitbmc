"use client";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, ErrorState, PageHeader, Segmented, SkeletonList, StatusBadge } from "@/components/ui";
import { IconBook, IconCalendar, IconChat } from "@/components/icons";
import { useMySubjects, useSemesterSubjects, useSession, type SubjectItem } from "@/lib/hooks";

function SubjectCard({ s }: { s: SubjectItem }) {
  return (
    <Link href={`/courses/${s.id}`} className="card card-pad card-hover group block min-w-0" aria-label={`${s.code} ${s.name}`}>
      <div className="flex items-center gap-2">
        <span className="badge-blue">Sem {s.semester}</span>
        <span className="truncate font-mono text-xs font-semibold text-slate-500">{s.code}</span>
      </div>
      <h2 className="mt-1.5 truncate text-[16px] font-bold tracking-tight group-hover:text-brand-700">{s.name}</h2>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><IconBook className="h-4 w-4" />{s._count?.topics ?? 0} topics</span>
        <span className="inline-flex items-center gap-1.5"><IconChat className="h-4 w-4" />{s._count?.assignments ?? 0} assignments</span>
      </div>
    </Link>
  );
}

export default function CoursesPage() {
  const [sem, setSem] = useState("3");
  const session = useSession();
  const me = session.data?.user ?? null;
  const isStudent = me?.role === "STUDENT";

  const mine = useMySubjects(!!me && isStudent);
  const bySem = useSemesterSubjects(sem, !!me && !isStudent);
  const active = isStudent ? mine : bySem;
  const subjects = active.data?.subjects ?? [];

  if (session.isPending) return <SkeletonList rows={4} />;
  if (me === null) {
    return (
      <EmptyState
        icon={<IconBook className="h-6 w-6" />}
        title="Sign in to see your courses"
        sub="Students see their semester subjects; teachers see the subjects assigned to them."
        action={<Link href="/login" className="btn-primary">Sign in</Link>}
      />
    );
  }

  const loading = active.isPending;
  const error = active.isError ? active.error : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="card card-pad">
        <PageHeader
          title="Courses"
          sub={isStudent
            ? <span>Semester {me.semester} · {me.campus?.name} <StatusBadge tone="slate">{subjects.length} subjects</StatusBadge></span>
            : <span>{me.campus?.name} · choose a semester to browse its subjects</span>}
        />
        {!isStudent && (
          <div className="mt-3.5">
            <Segmented
              label="Semester" size="full" value={sem}
              onChange={setSem}
              options={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: `Sem ${n}` }))}
            />
            {active.isFetching && !active.isPending && (
              <p className="tiny mt-2" aria-live="polite">Updating…</p>
            )}
          </div>
        )}
      </div>

      {loading && <SkeletonList rows={4} />}
      {!loading && error && (
        <ErrorState
          message={error instanceof Error ? error.message : "Could not load subjects."}
          onRetry={() => active.refetch()}
        />
      )}
      {!loading && !error && subjects.length === 0 && (
        <EmptyState
          icon={<IconBook className="h-6 w-6" />}
          title="No subjects found"
          sub={me.role === "TEACHER" ? "No subjects are assigned to you for this semester yet. Contact your campus admin." : "Your campus admin has not added subjects for this semester yet."}
        />
      )}

      {!loading && !error && subjects.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2" role="list">
          {subjects.map((s) => <SubjectCard key={s.id} s={s} />)}
        </div>
      )}

      {!loading && !error && isStudent && subjects.length > 0 && (
        <p className="tiny flex items-center gap-1.5"><IconCalendar className="h-4 w-4" />Open a subject to see attendance, assignments and course progress.</p>
      )}
    </div>
  );
}
