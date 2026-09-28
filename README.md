# CSIT Butwal — Campus Platform

Serving **Butwal Multiple Campus (BMC), Golpark, Butwal** exclusively. Next.js App Router + TypeScript + MongoDB + Prisma, with an **anonymous-by-design** discussion board and TanStack Query data layer.

## Quick start

```bash
npm install
cp .env.example .env   # then fill MONGODB_URI + SESSION_SECRET
npx prisma db push
npm run db:seed        # dev seed (BMC campus, users, posts)
npm run dev            # http://localhost:3000
```

Production build: `npm run build && npm start`.

## Data layer (TanStack Query v5)

All client server-state goes through `@tanstack/react-query` (`components/providers.tsx` mounts a single shared `QueryClient`; devtools load lazily in development only).

- **Keys:** shared factory in `lib/query-keys.ts` (`qk.session`, `qk.feed(sort)`, `qk.post(id)`, `qk.attendance(subject, year, month)`, …). Keys carry only non-sensitive scope params — never PINs, passwords, or tokens.
- **Transport:** `lib/api-client.ts` (`apiRequest`, `ApiError` with `validation` / `unauthorized` / `forbidden` / `not-found` / `conflict` / `rate-limited` / `server` / `network` codes). Server messages are shown as-is (no stack traces); auth/permission/missing responses are never retried.
- **Cache policy:** reference data caches longest (campuses 10 min, subjects 2 min), volatile data shortest (attendance 20 s, reports 20 s, feed/post 30 s); default `staleTime` 30 s, `gcTime` 5 min, refetch on window focus + reconnect.
- **Mutations:** votes, topic toggles, and submission toggles apply **optimistic updates with rollback**; everything else invalidates only the affected queries (e.g. saving attendance invalidates that subject's attendance months, creating an assignment invalidates that subject's list).
- **Feed** uses `useInfiniteQuery` cursor pagination. **Logout** clears the whole cache so a shared device never leaks the previous account's data. Cached data never grants access — every API route still enforces server-side authorization.

## Environment

| Var | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (include db name, e.g. `.../csitbmc`) |
| `SESSION_SECRET` | ≥32-char random secret for session JWT + vote HMAC |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | Optional dev-seed admin override (never set in production) |

`.env.example` documents all variables. Secrets stay in env — never committed.

## First admin (secure — no default production password)

```bash
ADMIN_USERNAME=principal ADMIN_PASSWORD='<strong-10+-chars>' ADMIN_CAMPUS_CODE=BMC npm run create-admin
```

`ADMIN_CAMPUS_CODE` must match an existing campus `code`. The seed script's `admin / Admin@12345` is **dev-only**; change it immediately or seed with `SEED_ADMIN_*` env vars.

## Student credential provisioning (PIN flow)

Roll numbers alone are not credentials, so:

1. Admin creates the student: Admin console → Students → roll number + semester + **initial PIN** (bcrypt-hashed at rest).
2. Admin shares the PIN out-of-band (in person / sealed letter).
3. Student signs in with campus + semester + roll number + PIN, then changes the PIN under **Profile** (verified against the current PIN).
4. Admins can reset a forgotten PIN (Reset PIN button) — again shared out-of-band.
5. Logins are rate-limited (8 failures → 10-minute lockout per IP+account) and sessions are httpOnly cookies expiring in 7 days.

## Teacher accounts

Created by admins only (Admin console → Teachers) with username + password (min 8). Teachers are assigned to subjects; the API enforces assignment scoping on every read/write — UI hiding is not the authorization.

## Nepali (Bikram Sambat) calendar handling

- Dates are **stored as UTC midnight `DateTime`** in MongoDB (`AttendanceRecord.date`, `Assignment.dueDate`).
- Display/conversion uses `nepali-date-converter` (`lib/nepali.ts`):
  - `adToBs` / `formatBs` for display ("Ashwin 12, 2083 BS").
  - `bsMonthAdRange(bsYear, bsMonth)` converts a full BS month to an **AD half-open range** `[start, end)`, so month/year boundaries (e.g. Chaitra → Baisakh year rollover) filter correctly.
- Attendance filter takes `bsYear` + `bsMonth` (1–12) and queries the AD range; the mark-date input uses AD dates (HTML date input) normalized to start-of-day UTC.

## Privacy boundary (anonymous discussion)

- `Post` / `Comment` have **no author columns** (no authorId, username, role, IP, user-agent) — enforced in `prisma/schema.prisma`.
- API `select`s never include author data (there is none); admin screens and logs show content + counts only.
- Duplicate-vote prevention uses a separate `Vote` collection keyed by `voterKey = HMAC_SHA256(SESSION_SECRET, userId + postId)` — no plaintext userId stored; the app only exposes `hasVoted` for the caller and aggregate counts.
- Reports store reason + counts only, no reporter identity.
- **Limitation (stated in-app at `/privacy`):** anonymity holds against users, teachers and admins *through the application*. It does **not** cover infrastructure/network operators (MongoDB host, network logs), who could observe traffic and database contents.

## Roles & key routes

- `/login` — Student (campus/semester/roll/PIN) or Teacher (campus/username/password); `/admin/login` — admin.
- `/` — campus-scoped anonymous feed (newest/top, upvote toggle, load-more, report).
- `/create`, `/posts/[id]`, `/courses`, `/courses/[id]` (Attendance / Assignments / Course Status tabs), `/profile`, `/admin` (campuses, students, teachers, subjects, moderation), `/privacy`.

## Limitations

- Rate limiting is in-memory (resets on redeploy; use Redis for multi-instance production).
- Seed data uses a shared dev PIN `1234` for sample students — rotate before any real use.
- No file uploads: assignments support an optional attachment **link** (paste a Drive/URL).
