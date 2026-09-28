"use client";
// Central TanStack Query hooks: one place for keys, fetchers, cache updates.
// UI-only state (dialogs, drafts, tabs) stays in component React state.

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { del, get, patch, post } from "./api-client";
import { errorMessage, isUnauthorized } from "./api-client";
import { STALE, qk, type FeedSort } from "./query-keys";

export { errorMessage, isUnauthorized };
export type { FeedSort };

/* ------------------------------- types ------------------------------- */

export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export interface SessionUser {
  id: string;
  role: Role;
  campusId: string;
  rollNumber?: string | null;
  semester?: number | null;
  username?: string | null;
  name?: string | null;
  campus?: { name: string; code: string };
}

export interface PostItem {
  id: string;
  title: string;
  body: string;
  upvoteCount: number;
  commentCount: number;
  createdAt: string;
}

export interface FeedPage {
  posts: PostItem[];
  nextCursor: string | null;
  votedByMe: string[];
}

export interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
}

export interface PostDetailData {
  post: PostItem & { hidden?: boolean };
  comments: CommentItem[];
  hasVoted: boolean;
}

/** Toast + redirect-on-401 handler shared by all mutation call sites. */
export function reportError(
  show: (text: string, ok?: boolean) => void,
  err: unknown,
  router?: { push: (url: string) => void }
) {
  show(errorMessage(err), false);
  if (isUnauthorized(err)) router?.push("/login");
}

/* ------------------------------- session ------------------------------ */

export function useSession() {
  return useQuery({
    queryKey: qk.session,
    queryFn: () => get<{ user: SessionUser | null }>("/api/auth/session"),
    staleTime: STALE.session,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => del<{ ok: boolean }>("/api/auth/session"),
    onSuccess: () => {
      // Drop all cached user-scoped data so the next person on a shared
      // device never sees the previous account's records.
      qc.clear();
      qc.setQueryData(qk.session, { user: null });
    },
  });
}

export function useLogin(kind: "student" | "teacher" | "admin") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      post<{ ok: boolean; mustChangePw?: boolean }>(`/api/auth/${kind}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.session });
    },
  });
}

/* ------------------------------- campuses ----------------------------- */

export interface CampusItem {
  id: string;
  code: string;
  name: string;
  address?: string;
  active?: boolean;
}

export function useCampuses() {
  return useQuery({
    queryKey: qk.campuses,
    queryFn: () => get<{ campuses: CampusItem[] }>("/api/campuses"),
    staleTime: STALE.campuses,
  });
}

/* ------------------------------ discussion ---------------------------- */

const FEED_LIMIT = 10;

export function useFeed(sort: FeedSort, enabled = true) {
  return useInfiniteQuery<FeedPage>({
    queryKey: qk.feed(sort),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      get<FeedPage>(
        `/api/posts?sort=${sort}&limit=${FEED_LIMIT}${pageParam ? `&cursor=${pageParam}` : ""}`
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: STALE.feed,
    enabled,
  });
}

function applyVoteToFeedCache(
  qc: ReturnType<typeof useQueryClient>,
  postId: string,
  voted: boolean, // state AFTER the toggle
  delta: number
) {
  const entries = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ["posts", "feed"] });
  for (const [key, data] of entries) {
    if (!data) continue;
    qc.setQueryData<InfiniteData<FeedPage>>(key, {
      ...data,
      pages: data.pages.map((pg) => ({
        ...pg,
        posts: pg.posts.map((p) =>
          p.id === postId ? { ...p, upvoteCount: p.upvoteCount + delta } : p
        ),
        votedByMe: voted
          ? Array.from(new Set([...pg.votedByMe, postId]))
          : pg.votedByMe.filter((id) => id !== postId),
      })),
    });
  }
  return entries;
}

export function useVotePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => post<{ voted: boolean }>(`/api/posts/${postId}/vote`),
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: ["posts"] });
      const feedPrev = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ["posts", "feed"] });
      const detailPrev = qc.getQueryData<PostDetailData>(qk.post(postId));
      let voted = detailPrev?.hasVoted ?? false;
      if (!detailPrev) {
        for (const [, d] of feedPrev) {
          if (d?.pages.some((pg) => pg.votedByMe.includes(postId))) {
            voted = true;
            break;
          }
        }
      }
      const next = !voted;
      applyVoteToFeedCache(qc, postId, next, next ? 1 : -1);
      if (detailPrev) {
        qc.setQueryData<PostDetailData>(qk.post(postId), {
          ...detailPrev,
          hasVoted: next,
          post: { ...detailPrev.post, upvoteCount: detailPrev.post.upvoteCount + (next ? 1 : -1) },
        });
      }
      return { feedPrev, detailPrev };
    },
    onError: (_err, postId, ctx) => {
      ctx?.feedPrev.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.detailPrev) qc.setQueryData(qk.post(postId), ctx.detailPrev);
    },
    onSettled: (_data, _err, postId) => {
      qc.invalidateQueries({ queryKey: ["posts", "feed"] });
      qc.invalidateQueries({ queryKey: qk.post(postId) });
    },
  });
}

export function usePost(id: string, enabled = true) {
  return useQuery({
    queryKey: qk.post(id),
    queryFn: () => get<PostDetailData>(`/api/posts/${id}`),
    staleTime: STALE.post,
    enabled: enabled && id.length > 0,
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      post<{ comment: CommentItem }>(`/api/posts/${postId}/comments`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.post(postId) });
      qc.invalidateQueries({ queryKey: ["posts", "feed"] }); // commentCount
    },
  });
}

export function useReport() {
  return useMutation({
    mutationFn: (input: { postId?: string; commentId?: string; reason: string }) =>
      post<{ ok: boolean }>("/api/reports", input),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; body: string }) =>
      post<{ post: PostItem }>("/api/posts", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
  });
}

export function useHidePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => del<{ ok: boolean }>(`/api/posts/${postId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts", "feed"] });
      qc.invalidateQueries({ queryKey: qk.reports });
    },
  });
}

/* ------------------------------- courses ------------------------------ */

export interface SubjectItem {
  id: string;
  code: string;
  name: string;
  semester: number;
  description?: string;
  campus?: { name: string; code: string };
  topics?: TopicItem[];
  assignments?: AssignmentItem[];
  _count?: { topics: number; assignments: number };
}

/** Student's own semester list. */
export function useMySubjects(enabled = true) {
  return useQuery({
    queryKey: qk.subjects("mine"),
    queryFn: () => get<{ subjects: SubjectItem[] }>("/api/subjects"),
    staleTime: STALE.subjects,
    enabled,
  });
}

/** Teacher/admin semester browser. */
export function useSemesterSubjects(semester: string, enabled = true) {
  return useQuery({
    queryKey: qk.subjects(`semester:${semester}`),
    queryFn: () => get<{ subjects: SubjectItem[] }>(`/api/subjects?semester=${semester}`),
    staleTime: STALE.subjects,
    enabled,
  });
}

export function useSubject(id: string, enabled = true) {
  return useQuery({
    queryKey: qk.subject(id),
    queryFn: () => get<{ subject: SubjectItem; myAttendance?: AttendanceRecord[] }>(`/api/subjects/${id}`),
    staleTime: STALE.subject,
    enabled: enabled && id.length > 0,
  });
}

export interface TopicItem {
  id: string;
  subjectId: string;
  title: string;
  order: number;
  isComplete: boolean;
}

export function useToggleTopic(subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; isComplete: boolean }) =>
      patch<{ topic: TopicItem }>(`/api/topics/${input.id}`, { isComplete: input.isComplete }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.subject(subjectId) });
      const prev = qc.getQueryData<{ subject: SubjectItem }>(qk.subject(subjectId));
      if (prev?.subject.topics) {
        qc.setQueryData(qk.subject(subjectId), {
          ...prev,
          subject: {
            ...prev.subject,
            topics: prev.subject.topics.map((t) =>
              t.id === input.id ? { ...t, isComplete: input.isComplete } : t
            ),
          },
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.subject(subjectId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.subject(subjectId) });
    },
  });
}

export function useAddTopic(subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) =>
      post<{ topic: TopicItem }>(`/api/subjects/${subjectId}/topics`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.subject(subjectId) }),
  });
}

export function useDeleteTopic(subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topicId: string) => del<{ ok: boolean }>(`/api/topics/${topicId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.subject(subjectId) }),
  });
}

/* ------------------------------ attendance ---------------------------- */

export interface AttendanceRecord {
  id?: string;
  date: string;
  status: "P" | "A";
  studentId?: string;
  student?: { rollNumber: string };
  rollNumber?: string;
}

export interface AttendanceData {
  mine?: AttendanceRecord[];
  roster?: { date: string; status: "P" | "A"; rollNumber: string }[];
  students?: { id: string; rollNumber: string; name: string }[];
  records?: AttendanceRecord[];
}

export function useAttendance(subjectId: string, bsYear: string, bsMonth: string, enabled = true) {
  const valid = /^\d{4}$/.test(bsYear) && Number(bsMonth) >= 1 && Number(bsMonth) <= 12;
  return useQuery({
    queryKey: qk.attendance(subjectId, bsYear, bsMonth),
    queryFn: () =>
      get<AttendanceData>(`/api/attendance?subjectId=${subjectId}&bsYear=${bsYear}&bsMonth=${bsMonth}`),
    staleTime: STALE.attendance,
    enabled: enabled && valid && subjectId.length > 0,
  });
}

export function useMarkAttendance(subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { date: string; marks: { studentId: string; status: "P" | "A" }[] }) =>
      post<{ ok: boolean }>("/api/attendance", { subjectId, ...input }),
    onSuccess: () => {
      // Month filter may differ from the marking date; refresh all months.
      qc.invalidateQueries({ queryKey: ["attendance", subjectId] });
    },
  });
}

/* ------------------------------ assignments --------------------------- */

export interface SubmissionItem {
  id: string;
  studentId?: string;
  isComplete: boolean;
  student?: { rollNumber: string; name?: string; id?: string };
}

export interface AssignmentItem {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  dueDate: string;
  link?: string;
  submissions?: SubmissionItem[];
}

export function useAssignments(subjectId: string, enabled = true) {
  return useQuery({
    queryKey: qk.assignments(subjectId),
    queryFn: () => get<{ assignments: AssignmentItem[] }>(`/api/assignments?subjectId=${subjectId}`),
    staleTime: STALE.assignments,
    enabled: enabled && subjectId.length > 0,
  });
}

export function useCreateAssignment(subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; description: string; dueDate: string; link: string }) =>
      post<{ assignment: AssignmentItem }>("/api/assignments", { subjectId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.assignments(subjectId) }),
  });
}

export function useToggleSubmission(subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { assignmentId: string; studentId: string; isComplete: boolean }) =>
      patch<{ submission: SubmissionItem }>("/api/submissions", input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.assignments(subjectId) });
      const prev = qc.getQueryData<{ assignments: AssignmentItem[] }>(qk.assignments(subjectId));
      if (prev) {
        qc.setQueryData(qk.assignments(subjectId), {
          assignments: prev.assignments.map((a) =>
            a.id === input.assignmentId
              ? {
                  ...a,
                  submissions: (a.submissions ?? []).map((s) =>
                    (s.studentId ?? s.student?.id) === input.studentId
                      ? { ...s, isComplete: input.isComplete }
                      : s
                  ),
                }
              : a
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.assignments(subjectId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.assignments(subjectId) });
    },
  });
}

/* -------------------------------- profile ------------------------------ */

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: qk.profile,
    queryFn: () => get<{ user: SessionUser; subjects?: SubjectItem[] }>("/api/profile"),
    staleTime: STALE.profile,
    enabled,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; currentPassword?: string; newPassword?: string }) =>
      patch<{ user: SessionUser }>("/api/profile", input),
    onSuccess: (data) => {
      qc.setQueryData<{ user: SessionUser }>(qk.profile, (old) =>
        old ? { ...old, user: data.user } : { user: data.user }
      );
      qc.invalidateQueries({ queryKey: qk.session }); // name shown in Nav
    },
  });
}

/* --------------------------------- admin ------------------------------- */

export interface AdminStudent {
  id: string;
  rollNumber: string;
  semester: number;
  name: string;
  active: boolean;
}

export interface AdminTeacher {
  id: string;
  username: string;
  name: string;
  active: boolean;
}

export function useAdminCampuses(enabled = true) {
  return useQuery({
    queryKey: qk.adminCampuses,
    queryFn: () => get<{ campuses: CampusItem[] }>("/api/admin/campuses"),
    staleTime: STALE.admin,
    enabled,
  });
}

export function useAdminStudents(campusId: string, enabled = true) {
  return useQuery({
    queryKey: qk.adminStudents(campusId),
    queryFn: () => get<{ students: AdminStudent[] }>(`/api/admin/students?campusId=${campusId}`),
    staleTime: STALE.admin,
    enabled: enabled && campusId.length > 0,
  });
}

export function useAdminTeachers(campusId: string, enabled = true) {
  return useQuery({
    queryKey: qk.adminTeachers(campusId),
    queryFn: () =>
      get<{ teachers: AdminTeacher[]; assignments: { teacherId: string; subject: SubjectItem }[] }>(
        `/api/admin/teachers?campusId=${campusId}`
      ),
    staleTime: STALE.admin,
    enabled: enabled && campusId.length > 0,
  });
}

export function useReports(enabled = true) {
  return useQuery({
    queryKey: qk.reports,
    queryFn: () =>
      get<{ posts: (PostItem & { reportCount: number })[]; comments: { id: string; body: string; reportCount: number; postId: string }[] }>(
        "/api/reports"
      ),
    staleTime: STALE.reports,
    enabled,
  });
}

function invalidateAdmin(qc: ReturnType<typeof useQueryClient>, campusId: string) {
  qc.invalidateQueries({ queryKey: qk.adminStudents(campusId) });
  qc.invalidateQueries({ queryKey: qk.adminTeachers(campusId) });
  qc.invalidateQueries({ queryKey: qk.adminCampuses });
}

export function useCreateStudent(campusId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { rollNumber: string; semester: number; name: string; pin: string }) =>
      post<{ student: AdminStudent }>("/api/admin/students", { campusId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminStudents(campusId) }),
  });
}

export function usePatchStudent(campusId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; patch: Record<string, unknown> }) =>
      patch<{ student: AdminStudent }>(`/api/admin/students/${input.id}`, input.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminStudents(campusId) }),
  });
}

export function useDeactivateStudent(campusId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<{ ok: boolean }>(`/api/admin/students/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminStudents(campusId) }),
  });
}

export function useCreateTeacher(campusId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { username: string; name: string; password: string }) =>
      post<{ teacher: AdminTeacher }>("/api/admin/teachers", { campusId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminTeachers(campusId) }),
  });
}

export function usePatchTeacher(campusId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; patch: Record<string, unknown> }) =>
      patch<{ ok: boolean }>(`/api/admin/teachers/${input.id}`, input.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminTeachers(campusId) }),
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { campusId: string; semester: number; code: string; name: string }) =>
      post<{ subject: SubjectItem }>("/api/subjects", input),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.subjects(`semester:${vars.semester}`) });
      invalidateAdmin(qc, vars.campusId);
    },
  });
}

export function useCreateCampus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { code: string; name: string; address: string }) =>
      post<{ campus: CampusItem }>("/api/admin/campuses", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminCampuses });
      qc.invalidateQueries({ queryKey: qk.campuses });
    },
  });
}
