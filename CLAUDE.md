@AGENTS.md

# CS Masterclass — project notes & progress log

Website + admin/student dashboards for a Computer Science teacher (Cambridge IGCSE/O Level
0478/2210, Class 9–12, Cambridge & Edexcel) who coaches at **Mirpur Academia** and **Uttara QED**
(Dhaka) and sells their own books. Owner's name is a placeholder ("Your Name" in `lib/site.ts`) and
must **never appear on the Home page**.

**Keep this file current:** when a task is finished, update "Status" and "Next up" below.

## Stack

- **Next.js 16.4 (App Router, Turbopack)** with `cacheComponents: true` + `partialPrefetching: true`.
  This is NOT the Next.js in training data — read `node_modules/next/dist/docs/` before using an API.
- React 19, TypeScript, **Tailwind CSS v4** (tokens in `app/globals.css` `@theme inline`).
- **Motion** (`motion/react`) for animation, **Lenis** smooth scroll, `lucide-react` icons.
- **Firebase** (client SDK v13): Auth (email/password + Google), Firestore, Analytics.
  **Storage** enabled 2026-10-14 (bucket `cs-masterclass.firebasestorage.app`, rules deployed from `storage.rules`).
- Font: **Roboto only** (user's choice). Light/dark theme toggle (`data-theme` on `<html>`, saved in localStorage).

## Run / build / deploy

- Dev server: `npm run dev` — the user wants it **kept running in a Terminal tab** until they say stop
  (the Browser-pane preview server gets killed when idle). Local: http://localhost:3000.
- **Never run `npm run build` while the dev server is running** (Turbopack font errors). Stop it, `rm -rf .next`, build, restart.
- If styles/fonts look stale: stop server, `rm -rf .next`, restart.
- Checks: `npx tsc --noEmit` and `npx eslint .` (both must be clean).
- Firestore rules: edit `firestore.rules`, validate with
  `npx firebase-tools deploy --only firestore:rules --project cs-masterclass --dry-run`, then deploy without `--dry-run`.
  CLI is logged in as the owner. `.firebaserc` default project = `cs-masterclass`.
- Config: `.env.local` (git-ignored) holds the Firebase web config; `apphosting.yaml` has the same for Firebase App Hosting.
- Git: `site-build` was merged (fast-forward) into **`main`** on 2026-10-13; both point to the same commit.
  No remote is configured. Commit only when the user asks.

## Conventions (follow these)

- Route groups: `app/(site)` public pages (navbar+footer), `app/(auth)` login/signup/forgot-password
  (split layout with inspirational side panel — no books there), `app/admin/*` admin dashboard,
  `app/dashboard/*` student dashboard.
- Auth-gated client pages: every page + layout under `/admin` and `/dashboard` exports
  `export const instant = false;` (otherwise Next 16 "instant-unrendered-segment" dev error).
- Pages using `useSearchParams` are wrapped in `<Suspense>`.
- Never pass icon components/functions from a server page to a client component (look them up client-side).
- Redirects belong in `next.config.ts` `redirects()` (e.g. `/account → /dashboard/profile`), not in a page.
- Shared dashboard chrome: `components/dashboard/frame.tsx` (`DashboardFrame`). Nav configs:
  `components/admin/nav.ts`, `components/dashboard/student-nav.ts` (`soon: true` → placeholder page via `[section]`).
- Admin UI primitives: `components/admin/ui.tsx` (PageHeader, Drawer/DrawerBody/DrawerFooter, Field, Segmented, buttons, EmptyState).
- All clickable elements get `cursor: pointer` globally (base layer in globals.css).
- Charts: plain SVG in `components/admin/charts.tsx`, following the dataviz skill. Series colours are
  validated tokens `--series-1..4` (green, ember, blue, gold; separate dark values). Re-run the palette
  validator before changing them. Every chart has a table view + tooltip.
- After writes that affect public cached pages call server actions in `app/actions.ts`
  (`refreshBooks()` → tag `books`, `refreshCoaching()` → tag `coaching`).

## Admin access

- Owner admin account: **admin@cs-masterclass.com** (always admin by email — `lib/admins.ts` + `isAdmin()` in rules).
- Anyone else becomes admin by setting `users/{uid}.role = "admin"` (or the toggle in Admin → Students).
- After sign-in: admins → `/admin`, students → `/dashboard` (unless `?next=`).

## Firestore data model (see `firestore.rules`)

| Collection | Purpose | Access |
|---|---|---|
| `users/{uid}` | profile: name, email, phone, **phoneKey** (8801…, used to sign in), **authEmail**, **parentPhone**, classLevel, locationId, batchId (= confirmed batch), role, **booksOwned** (book slugs ticked by admin) | own read; students may update only name/parentPhone/photoURL; created by server on confirm (or admin) |
| `locations` | coaching centres | public read, admin write |
| `batches` | classLevel, locationId, name, board, `sessions[{day,start,end}]` (per-day times), seats, **fee** (BDT/month), status, notes | public read, admin write |
| `enrollments` | registrations (`uid: ""`, source signup, phoneKey, parentPhone — server-written) and batch-change requests (source profile): pending → confirmed/waitlisted/rejected/cancelled | students create own `profile` requests only; admin decides (registrations via server) |
| `enrollmentSecrets/{id}` | scrypt hash of the password chosen at registration, until first sign-in | server only |
| `attendance/{batchId}_{YYYY-MM-DD}` | register: `records{uid: present/late/absent/excused}`, note | admin only |
| `studentAttendance/{uid}` | student's own copy: `records{sessionId: {batchId,date,start,end,mark}}`, written with each register save | own read; admin write |
| `tests/{id}` | title, type (class-test/mock/quiz), paper, date, maxMarks, batchIds, `marks{uid: number\|"absent"}`, published | admin only |
| `studentResults/{uid}` | `results{testId: {title,type,paper,date,max,score(null=absent),classAverage,highest}}` — synced by `syncResults()` in `lib/tests.ts` on publish/unpublish/save/delete | own read; admin write |
| `homework/{id}` | title, instructions, link, batchIds, dueDate, maxMarks (null = feedback only), visible, **audienceKeys** (`batch:<id>`, empty when hidden) | students of those batches read; admin write |
| `homework/{id}/submissions/{uid}` | link, note, file (Storage `homework/{id}/{uid}/…`), submittedAt; admin adds mark, feedback, markedAt | own read/write until marked; admin all |
| `syllabusProgress/{uid}` | `topics{topicId: {confidence 1-3}}` — topics defined in `lib/syllabus.ts` (0478/2210 for 9–10, 9618 AS/A2 for 11–12) | own read/write; admin read |
| `pastPapers/{uid}` | `papers{"2024-s-12": {score, max, at}}` — catalogue in `lib/past-papers.ts` | own read/write; admin read |
| `pushSubscriptions/{uid}` | `subs{key: {endpoint, keys, device}}` web-push subscriptions | own write; admin read/write |
| `parentReports/{YYYY-MM}_{uid}` | month, uid, comment, sentAt (WhatsApp report log) | admin only |
| `announcements` | title, body, category, priority, audienceType/Values, pinned, status, expiresOn | published readable by signed-in users; admin write |
| `payments` | tuition/book/admission/other, month, amount (BDT), method, reference, receivedOn | own + admin; admin write |
| `resources` | study materials: title, description, kind (pdf/doc/image/video/link), url **or** file{path,name,size,contentType} (Storage `resources/{id}/…`), audienceType/Values, **audienceKeys** (`all`, `class:10`, `batch:<id>`, `location:<id>`; empty when hidden), visible | students read only docs whose audienceKeys match their profile (query must be `array-contains-any` of exactly their keys); admin write. Same check in `storage.rules` |
| `books` | book catalogue (falls back to `lib/seed-books.ts` when empty); **forClasses** `{"9": "must"\|"optional"}` (missing → built-in plan by slug); **level** `o-level`\|`a-level` | public read, admin write |
| `messages`, `subscribers` | contact form, newsletter | public create, admin read |

## Status — completed

**Public site:** Home (motion hero with an animated CS "machine" — CPU chip + live pseudocode, logic gate, binary and bubble-sort cards in `components/sections/hero-machine.tsx`, velocity marquee, stats (1,200+ students, 90% A/A*, book count live), pinned horizontal book
showcase with O Level / AS & A Level toggle (`book.level`, editable in Admin → Books), bundle offer, Batches & locations
(`batches-locations.tsx`: shared `CentreCards` + live `BatchSchedule`), pseudocode card, testimonials, newsletter), Teaching (coaching centres,
live batch timetable from Firestore with "Join this batch", benefits, Edexcel note), Success, Books
(+ detail page with 3D flip front/back covers, editions & prices, bundle), About (unlisted in nav/footer),
Contact, 404. Favicon, dark/light toggle, Roboto font, pointer cursors.

**Books & prices** (`lib/seed-books.ts`; covers rendered from `book-cover pages/` PDFs, stored in Firebase Storage
`covers/<slug>-front|back.jpg` (public read) and referenced with `coverImage()` in `lib/books.ts` — no local copies):
Handbook 499/1499 BDT, Topical Question Bank 399/999, Past Paper QP 399/999, Topical Notes 150/chapter
or 1200 combined, Mock Exam 449/1399, **AS Computer Science Handbook (9618)** — price not set yet; Bundle (the five
0478/2210 books in `bundle.slugs`, not the AS book) 1999 soft / 4500 hard (savings computed by `bundleTiers()`).
- **Per-class book lists** (`suggestBooks()` in `lib/books.ts`, editable per book in Admin → Books → "Suggested on student dashboards"):
  Class 9 must = Handbook + Topical QB, optional = Topical Notes; Class 10 must = Handbook + Topical QB + Past Paper + Mock,
  optional = Topical Notes; Class 11 must = AS Handbook; Class 12 none (sees the whole library).
- Admin → Students → student → **Books bought** ticks (`users.booksOwned`) hide those books from the student's suggestions.
- **Bundle popup** (`components/sections/bundle-popup.tsx`, in `app/(site)/layout.tsx`): 400×300, opens 2.5 s into a visit on
  public pages, once per browser session (sessionStorage `bundle-popup-seen`).

**Auth (students get a login only when an admin confirms them — no Google sign-in):**
- `/signup` = "Register for a batch": class → centre → batch + name, mobile (required), email (optional), parent phone,
  password → server action `registerStudent` writes `enrollments/{id}` (status pending, `uid: ""`) + `enrollmentSecrets/{id}`
  (scrypt hash, no client access). Nothing in Firebase Auth yet.
- Admin → Enrollments → Confirm → `decideRegistration` (server, checks admin ID token) creates the Auth user (uid = enrollment
  id, random password; phone-only students get `8801…@phone.cs-masterclass.invalid` as Auth email) + `users/{uid}`.
  Waitlist and Decline keep the hash (a declined student signing in sees "wasn't accepted" + the admin's note);
  it's deleted on confirm→first sign-in, admin password reset, or when that phone registers again.
- Sign-in takes email **or** mobile (`signIn` in `lib/auth.ts`). Phone → server `lookupLogin` finds the account and checks the
  password via Identity Toolkit REST. First sign-in after confirmation: `lookupLogin` verifies against the hash, sets it as the
  real Firebase password, deletes the hash. Pending/waitlisted registrations get a clear message.
- Forgot password: email reset link; phone-only students → Admin → Students → "Set a new password" (`setStudentPassword`).
- Server code: `app/student-actions.ts` ("use server", every function re-checks its caller), `lib/server/*` (firebase-admin,
  scrypt). Credentials: `service-account.json` in project root (git-ignored) or `FIREBASE_SERVICE_ACCOUNT_KEY`, else host ADC.

**Student dashboard (`/dashboard`):** Overview (next-class countdown, batch + seat status, centre,
week timetable, latest announcements, books, attendance % + latest result), Schedule, Announcements, Attendance (rate, counts,
per-month list), Progress (stat tiles, score trend chart, results vs class average, approx. grade from `approxGrade()`), Homework (submit link/file,
see mark + feedback; nav badge for to-do), Syllabus (rate topics Need help/Getting there/Confident), Past papers (grid by session,
log score), App & notifications (Profile; install card on Overview), Study materials (filter by type, YouTube plays in a lightbox), Books, Payments, Profile
(change batch → new enrollment request). 

**Admin dashboard (`/admin`):** Overview, Batches (per-day times, fee, seats, student counts),
Locations, Students (search/filter/edit/admin toggle/books bought/CSV), Enrollments (confirm/waitlist/decline,
capacity, bulk), Attendance (take register, history grid, rates, CSV), Tests & marks (create test for batches,
enter marks with absent toggle, publish/unpublish), Homework (set for batches, submissions, mark + feedback, WhatsApp
reminder), Revision (per-batch syllabus weak topics + past-paper practice table), Parent reports (month picker, per-student attendance/tests/fee summary,
comment, one-tap WhatsApp send, sent tracking + "Next" flow),
Books, Resources (upload PDF/Word/PPT/Excel/image up to 50 MB, or video/other links; target class/batch/centre; hide/show), Announcements (targeted by class/batch/centre, pin, expiry, preview), Messages, Subscribers,
Payments (monthly dues, record payments, WhatsApp reminders, WhatsApp receipts to parents after recording + send icon in ledger, ledger, CSV), Reports (KPIs + charts).
Soon: Orders, Settings.

**Installable app + push (PWA):** `app/manifest.ts` (start_url /dashboard, icons in `public/icons/` made from `app/icon.svg`
with sharp), `public/sw.js` (push + notificationclick only, no caching; no-cache headers in next.config), registered by
`useAppSetup()` in the student shell. Push = standard web-push with VAPID keys in `.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`); `app/push-actions.ts` `sendPush` (admin-checked, only known push-service hosts), `components/admin/notify.ts`
`notifyStudents()` fires on: announcement published, resource shared, test results published, homework set (toggle).
iPhone: notifications only work after "Add to Home Screen" (iOS 16.4+).

## Next up / open items

- **Orders** and **Settings** sections in admin (Settings could hold WhatsApp number, payment instructions, prices).
- `site.whatsapp` in `lib/site.ts` is empty → "Order" buttons fall back to /contact. Ask the user for the number.
- Payment instructions for students (bKash/Nagad numbers) not provided yet.
- **AS Computer Science Handbook prices** — ask the user (soft/hard BDT); the book shows without a price until then.
- Idea: recording a book payment in Admin → Payments could auto-tick that book in the student's "Books bought" (not built).
- Uploading files to Storage from the CLI: the firebase CLI login works (script used on 2026-10-14 got a token via
  firebase-tools' `lib/auth.js` `getAccessToken` and POSTed to the GCS JSON API). Admin → Books cover upload works in the browser.
- **Needs `service-account.json`** (Firebase console → Project settings → Service accounts → Generate new private key, saved in
  the project root) before registration / confirming / phone sign-in work locally. Restart the dev server after adding it.
- Before deploying to App Hosting: its service account needs Firebase Auth admin + Firestore access (check roles).
- Batch change requests keep the student in their confirmed batch until an admin confirms (`requestSeat` only cancels
  pending/waitlisted; `decideEnrollment` confirm closes the old confirmed seat). Old "Sync existing students" button removed.
- Manual end-to-end testing without touching live data: copy the project (`cp -Rc`), give the copy a `.env.local` with
  `NEXT_PUBLIC_FIREBASE_EMULATORS=1`, project id `demo-cs`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8181`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9399`,
  run `npx firebase-tools@13.35.1 emulators:start --only auth,firestore,storage --project demo-cs` there (ports in firebase.json), seed with
  firebase-admin, and `next dev --port 3100`. Tested 2026-10-13: register → pending msg → confirm/waitlist/decline → phone & email sign-in →
  materials per batch → batch change → password reset → tampering blocked (all passed).
- Flow/rules tests: run against emulators (Auth + Firestore + Storage) with firebase-admin pointed at them. Emulator needs Java 21 for current firebase-tools (Mac has 17) → use `npx firebase-tools@13.35.1`; port 8080 is taken by Docker.
- **Deploying**: add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to apphosting.yaml and `VAPID_PRIVATE_KEY` as an App Hosting secret; push
  needs HTTPS (works on the live site, not on plain http://localhost from a phone).
- Push delivery to a real phone is untested (the test browser blocks notification permission) — test on a phone after deploy.
- Placeholder content to replace: testimonials, results, milestones, recognitions (`lib/content.ts`), owner name/email/socials (`lib/site.ts`).
- Printable payment receipts (suggested, not built).
- Automatic SMS receipts (needs a BD bulk-SMS account, e.g. BulkSMSBD/Alpha SMS, + server-side API key) — WhatsApp version is built (`receiptMessage` in `lib/payments.ts`).
- Decide whether to add a GitHub remote (ask the user).
