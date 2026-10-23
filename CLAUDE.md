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
- **Firebase** (client SDK v13): Auth (**admins only**), Firestore, Storage, Analytics. Students have **no Firebase Auth** —
  see "Student accounts" below.
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
- Config: `.env.local` (git-ignored) holds the Firebase web config, `SESSION_SECRET` and the VAPID keys.
- **Hosting: Firebase App Hosting**, backend **`csmasterclass`** in **`us-east4`**, created 2026-10-23 in the console and connected
  to GitHub `F-ferdous/csmasterclass`, branch `main`, root `/`. **Every push to `main` deploys automatically.**
  **Custom domain `cs-masterclass.com`** live 2026-10-23 (= `site.url`). The old App Hosting address
  csmasterclass--cs-masterclass.us-east4.hosted.app 308-redirects to it (`next.config.ts` redirects, host match guarded by
  x-forwarded-host). `www.cs-masterclass.com` resolves but returned 404 — add it in App Hosting → Domains as a redirect to the apex.
  `apphosting.yaml` holds the public `NEXT_PUBLIC_*` values (BUILD + RUNTIME) and references the Secret Manager secrets
  `SESSION_SECRET` (random, never change — signs every student out) and `VAPID_PRIVATE_KEY` (same as `.env.local`); the backend
  was granted access with `apphosting:secrets:grantaccess --backend csmasterclass --location us-east4`. Leave the console's
  env/secrets section empty — everything lives in `apphosting.yaml`. Server credentials = the App Hosting compute service account
  (`firebase.sdkAdminServiceAgent`). Earlier attempts (2026-10-22: CLI-created App Hosting backend, Firebase Hosting web frameworks)
  were removed; `cs-masterclass.web.app` is disabled. The hosted.app address is in Firebase Auth → Authorized domains (added 2026-10-23,
  cs-masterclass.com too). Firebase Hosting's web-frameworks mode only supports Next ≤ 16.0.
- Git: work on **`main`** (`site-build` is an old branch at the same commit as of 2026-10-23). Remote `origin` =
  https://github.com/F-ferdous/csmasterclass (**public** repo); `main` tracks `origin/main`. Commit and push only when the
  user asks. Never commit `.env*` (except `.env.example`) or `service-account*.json` — both are git-ignored.

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
- After writes that affect public cached pages call `refreshBooks()` / `refreshCoaching()` from `components/admin/refresh.ts`
  (they pass the admin's ID token to the admin-checked server actions in `app/actions.ts` → tags `books` / `coaching`).
- Student data hooks (`useStudentData`) only fetch once `useStudentSession()` has a student — never call student Server
  Functions for signed-out visitors. Modules the server imports (`app/student-data.ts`) must not be marked `"use client"`.
- SEO files: `app/robots.ts`, `app/sitemap.ts` (books from `getBooks()`; /about only once `ownerName` is set),
  `app/opengraph-image.tsx` (default share preview). All absolute URLs come from `site.url`.
- **SEO (added 2026-10-23):** every public page exports `pageMetadata({ title, description, path })` from `lib/seo.ts` (canonical link,
  Open Graph/Twitter card; setting openGraph drops the file-based OG image, so the helper names `/opengraph-image` itself).
  Structured data via `<JsonLd>` (`components/seo/json-ld.tsx`) + builders in `lib/seo.ts`: Home = EducationalOrganization (centres
  as Places) + WebSite + FAQPage; course pages = Course + Breadcrumb + FAQPage; /books = ItemList; book pages = Book(+Product with
  BDT offers when priced). FAQ section component `components/sections/faq.tsx` (Home FAQs in `lib/content.ts` `faqs`).
  Course guide pages `/o-level-computer-science` and `/a-level-computer-science` (content in `lib/courses.ts`, layout
  `components/sections/course-page.tsx`, linked from Teaching + footer "Courses"). Login/forgot-password and placeholder About are noindex.
  `site.googleVerification` (lib/site.ts) = optional Search Console HTML-tag code.

## Admin access

- Owner admin account: **admin@cs-masterclass.com** (always admin by email — `lib/admins.ts` + `isAdmin()` in rules).
- Anyone else becomes admin by creating them in Firebase Auth and setting `users/{uid}.role = "admin"` (console). `users` holds admins only.
- After sign-in: admins → `/admin`, students → `/dashboard` (unless `?next=`).

## Firestore data model (see `firestore.rules`)

| Collection | Purpose | Access |
|---|---|---|
| `users/{uid}` | **admin** profiles only (Firebase Auth uid) | own read; admin write |
| `students/{id}` | id = registration id. name, email, phone, **phoneKey** (8801…, sign-in), parentPhone, classLevel, locationId, batchId (= confirmed batch), photoURL, **booksOwned**, status (active/disabled), **sessionVersion** | admin read/write; students go through the server |
| `students/{id}/private/auth` | scrypt `passwordHash` + `salt` | **server only** (no browser, not even admins) |
| `loginAttempts/{sha256(studentId or identifier)}` | failed sign-in count / lock until | server only |
| `locations` | coaching centres | public read, admin write |
| `batches` | classLevel, locationId, name, board, `sessions[{day,start,end}]` (per-day times), seats, **fee** (BDT/month), status, notes | public read, admin write |
| `enrollments` | registrations (`uid: ""`, source signup, phoneKey, parentPhone — server-written) and batch-change requests (source profile): pending → confirmed/waitlisted/rejected/cancelled | students create own `profile` requests only; admin decides (registrations via server) |
| `enrollmentSecrets/{id}` | scrypt hash of the password chosen at registration, until an admin confirms (then moved to `students/{id}/private/auth`) | server only |
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
| `orders/{id}` | ref (`CS-YYMMDD-XXXX`), uid (linked student or ""), name, phone, email, address, note, `items[{slug ("bundle" for the bundle), title, kind, price, qty}]`, subtotal, deliveryFee, discount, status (new/confirmed/sent/delivered/cancelled), source (website/whatsapp/phone/in-person), paymentStatus, paymentMethod, paymentRef, paidOn, **paymentId** (matching `payments` doc, type book, `orderId`), adminNote — helpers in `lib/orders.ts` | public create of a well-formed new/unpaid/website order only (`validWebOrder`); own read; admin all |
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
- Admin → Students → student → **Books bought** ticks (`students.booksOwned`) hide those books from the student's suggestions.
- **Bundle popup** (`components/sections/bundle-popup.tsx`, in `app/(site)/layout.tsx`): 400×300, opens 2.5 s into a visit on
  public pages, once per browser session (sessionStorage `bundle-popup-seen`).

**Student accounts (since 2026-10-14 — students get a login only when an admin confirms them; no Firebase Auth):**
- `/signup` → `registerStudent` (`app/student-actions.ts`) writes `enrollments/{id}` (pending, `uid: ""`) + `enrollmentSecrets/{id}`.
- Admin → Enrollments → Confirm → `decideRegistration` (checks admin ID token) creates `students/{id}` + `students/{id}/private/auth`
  (hash moved from enrollmentSecrets) and sets the enrollment's uid. Waitlist/Decline keep the hash (declined student sees the note).
- Sign-in (`signIn` in `lib/auth.ts`): `signInStudent` checks phone/email + scrypt and sets a **signed HttpOnly cookie** `__session`
  (HMAC with `SESSION_SECRET`, 30 days, `lib/server/session.ts`) + readable flag `cs_student=1`. Emails that aren't a student →
  `try-admin` → Firebase Auth (admins). 5 wrong passwords lock the account 10 min (`loginAttempts`).
- `sessionVersion` on the student: password change (`changeMyPassword`, Profile) and admin reset (`setStudentPassword`) bump it →
  every older cookie stops working. Forgot password = ask the teacher (admins still get an email link).
- Current student: `currentStudent()` / `requireStudent()` in `lib/server/students.ts`. Browser: `StudentSessionProvider` /
  `useStudentSession()` (`components/auth/student-session.tsx`, in the root layout); admins: `useAuth()`.
- **All student data goes through the server**: `app/student-data.ts` (reads + saves, each starts with `requireStudent()`), cached in
  the browser by `useStudentData()` (`components/dashboard/use-student-data.ts`, refetch on focus + every 60 s; `setStudentData` /
  `refreshStudentData` after saves; cleared on sign-out). Files: `/api/student/files/{resource|homework}/{id}` (audience-checked,
  `no-store`). Homework uploads go via a Server Function (bodySizeLimit 26mb in next.config).
- Rules: every student collection is admin-only from the browser; Storage `resources/` and `homework/` are admin-read only.
- Server credentials: `service-account.json` (project root, git-ignored) or `FIREBASE_SERVICE_ACCOUNT_KEY`, else host ADC.
  `SESSION_SECRET` in `.env.local` (git-ignored). Dev logs don't print Server Function args (`logging.serverFunctions: false`).
- Migration 2026-10-14: the one existing student (Fahim Ferdous) moved from `users` + Firebase Auth to `students` (password kept).

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
Orders (`orders-manager.tsx`: Open/New/Confirmed/Sent/Delivered/Cancelled tabs, stats, search, CSV; drawer with status, customer,
student link (auto-suggested by phone), items editor, delivery charge + discount, mark paid → writes/updates/deletes the matching
book payment, Delivered + linked student → ticks `booksOwned`, WhatsApp confirm/paid/sent messages; New order for WhatsApp/phone/
in-person; sidebar badge = new orders), Payments (monthly dues, record payments, WhatsApp reminders, WhatsApp receipts to parents after recording + send icon in ledger, ledger, CSV), Reports (KPIs + charts).
Soon: Settings.

**Installable app + push (PWA):** `app/manifest.ts` (start_url /dashboard, icons in `public/icons/` made from `app/icon.svg`
with sharp), `public/sw.js` (push + notificationclick only, no caching; no-cache headers in next.config), registered by
`useAppSetup()` in the student shell. Push = standard web-push with VAPID keys in `.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`); `app/push-actions.ts` `sendPush` (admin-checked, only known push-service hosts), `components/admin/notify.ts`
`notifyStudents()` fires on: announcement published, resource shared, test results published, homework set (toggle).
iPhone: notifications only work after "Add to Home Screen" (iOS 16.4+).

## Next up / open items

**Pre-launch check 2026-10-22** (tsc, eslint, build, every page, register → confirm → sign-in → dashboards on emulators).
Fixed: dashboard called student Server Functions while signed out (500s); enrollment/seat status never loaded
(`lib/enrollments.ts` was `"use client"`); `/\host` open redirect in `safeNext`; SVG/odd file types now download instead of
opening inline; cache-refresh actions were callable by anyone; bundle popup no longer covers `/order`; added robots, sitemap,
share image. Next.js upgraded 16.4.0 → **16.4.2** (critical image-optimizer RCE + Server Actions DoS advisories).
**Live on App Hosting since 2026-10-23** (see Run / build / deploy); custom domain cs-masterclass.com + SEO pass the same day.
**SEO to-do (owner):** verify cs-masterclass.com in Google Search Console (Domain property, DNS TXT) and submit
`https://cs-masterclass.com/sitemap.xml`; create a Google Business Profile (cs-masterclass.com was added to Firebase Auth →
Authorized domains on 2026-10-23 via the Identity Toolkit admin API); connect www.cs-masterclass.com in App Hosting (redirect to apex).
Real testimonials/results matter for rankings too (placeholders in `lib/content.ts`). Still to replace (needs the owner): owner name (About page says "Your Name"), contact email (hello@example.com), social links (point at youtube.com etc.),
`site.whatsapp`, placeholder testimonials/results in `lib/content.ts`. 

- **Settings** section in admin (WhatsApp number, payment instructions, prices). Orders is built (2026-10-14).
- Public **order form** `/order` (`components/books/order-form.tsx`): every "Order now"/"Get the bundle" button links to it via
  `orderLink()` in `lib/pricing.ts` (`?book=slug&kind=hard` or `?bundle=soft`). Payment details aren't shown to customers yet
  (needs the bKash/Nagad numbers) — the confirm message says "we'll share the payment details".
- Ideas not built: students seeing their orders in the dashboard (rules already allow own read); push/email alert to admin on a new order.
- `site.whatsapp` in `lib/site.ts` is empty → the order success page hides its "Message us on WhatsApp" button. Ask the user for the number.
- Payment instructions for students (bKash/Nagad numbers) not provided yet.
- **AS Computer Science Handbook prices** — ask the user (soft/hard BDT); the book shows without a price until then.
- Idea: recording a book payment in Admin → Payments could auto-tick that book in the student's "Books bought" (not built).
- Uploading files to Storage from the CLI: the firebase CLI login works (script used on 2026-10-14 got a token via
  firebase-tools' `lib/auth.js` `getAccessToken` and POSTed to the GCS JSON API). Admin → Books cover upload works in the browser.
- `service-account.json` is in place (added 2026-10-14) — the server needs it for registration, sign-in and all student data.
- Batch change requests keep the student in their confirmed batch until an admin confirms (`requestSeat` only cancels
  pending/waitlisted; `decideEnrollment` confirm closes the old confirmed seat). Old "Sync existing students" button removed.
- Manual end-to-end testing without touching live data: copy the project (`cp -Rc`), give the copy a `.env.local` with
  `NEXT_PUBLIC_FIREBASE_EMULATORS=1`, project id `demo-cs`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8181`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9399`,
  run `npx firebase-tools@13.35.1 emulators:start --only auth,firestore,storage --project demo-cs` there (ports in firebase.json), seed with
  firebase-admin, and `next dev --port 3100`. Tested 2026-10-13: register → pending msg → confirm/waitlist/decline → phone & email sign-in →
  materials per batch → batch change → password reset → tampering blocked (all passed).
- Flow/rules tests: run against emulators (Auth + Firestore + Storage) with firebase-admin pointed at them. Emulator needs Java 21 for current firebase-tools (Mac has 17) → use `npx firebase-tools@13.35.1`; port 8080 is taken by Docker.
- Push needs HTTPS (works on the live site, not on plain http://localhost from a phone).
- Push delivery to a real phone is untested (the test browser blocks notification permission) — test on a phone after deploy.
- Placeholder content to replace: testimonials, results, milestones, recognitions (`lib/content.ts`), owner name/email/socials (`lib/site.ts`).
- Printable payment receipts (suggested, not built).
- Automatic SMS receipts (needs a BD bulk-SMS account, e.g. BulkSMSBD/Alpha SMS, + server-side API key) — WhatsApp version is built (`receiptMessage` in `lib/payments.ts`).
