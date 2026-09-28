// Shared TanStack Query key factory + per-domain cache policy.
// Keys contain only non-sensitive scope params (sort, ids, semester, month).
// Never put PINs, passwords, or tokens in query keys.

export type FeedSort = "new" | "top";

export const qk = {
  session: ["session"] as const,
  campuses: ["campuses"] as const,
  feed: (sort: FeedSort) => ["posts", "feed", sort] as const,
  post: (id: string) => ["posts", "detail", id] as const,
  subjects: (scope: string) => ["subjects", "list", scope] as const,
  subject: (id: string) => ["subjects", "detail", id] as const,
  attendance: (subjectId: string, bsYear: string, bsMonth: string) =>
    ["attendance", subjectId, bsYear, bsMonth] as const,
  assignments: (subjectId: string) => ["assignments", subjectId] as const,
  profile: ["profile"] as const,
  adminCampuses: ["admin", "campuses"] as const,
  adminStudents: (campusId: string) => ["admin", "students", campusId] as const,
  adminTeachers: (campusId: string) => ["admin", "teachers", campusId] as const,
  reports: ["admin", "reports"] as const,
};

/** staleTime per domain (ms). Slow-changing reference data caches longer. */
export const STALE = {
  session: 60_000,
  campuses: 10 * 60_000,
  feed: 30_000,
  post: 30_000,
  subjects: 2 * 60_000,
  subject: 30_000,
  attendance: 20_000,
  assignments: 30_000,
  profile: 60_000,
  admin: 30_000,
  reports: 20_000,
} as const;
