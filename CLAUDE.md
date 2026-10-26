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
- **Firebase** (client SDK v13): Auth (**admins only**, sign in at **/admin-login**), Firestore, Storage, Analytics. Students have
  **no Firebase Auth** — they sign in at **/login** with **email (username) + mobile number (password)**; see "Student accounts" below.
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
  csmasterclass--cs-masterclass.us-east4.hosted.app 308-redirects to it via `proxy.ts` (checks Host / X-Forwarded-Host /
  Forwarded; a next.config `has: host` redirect did NOT fire on App Hosting). `www.cs-masterclass.com` resolves but returned 404 — add it in App Hosting → Domains as a redirect to the apex.
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
- Shared dashboard chrome: `components/dashboard/frame.tsx` (`DashboardFrame`). The sidebar menu (`SidebarNav`) scrolls on short
  screens: compact spacing below 820px height, current page kept in view, "More" hint when links are hidden (2026-10-23 —
  on 768–900px-tall laptops Orders/Payments/Reports were below the fold with no hint). Content max width `max-w-7xl`. Nav configs:
  `components/admin/nav.ts`, `components/dashboard/student-nav.ts` (`soon: true` → placeholder page via `[section]`).
- Admin UI primitives: `components/admin/ui.tsx` (PageHeader, Drawer/DrawerBody/DrawerFooter, Field, Segmented, buttons, EmptyState).
- All clickable elements get `cursor: pointer` globally (base layer in globals.css).
- **Deploy version skew (2026-10-24):** a tab opened before a deploy calls Server Functions the new build doesn't have → server logs
  "Failed to find Server Action" (409) and the form shows a network error. `components/layout/update-watcher.tsx` (root layout) compares
  the build it started on with `/api/version` (reads `.next/BUILD_ID`; empty in dev = watcher off) when the tab comes back into view:
  reloads if nothing was typed (once per build), else shows a Refresh bar. Forms can call `checkForUpdate()` after a failed call.
  Not using `next.config` `deploymentId` (needs one id shared by build and runtime; App Hosting gives none).
- **Never use the bare `hidden` class with a breakpoint to show something** (`hidden lg:block`). Write `block max-lg:hidden`
  instead. Browser extensions inject `.hidden{display:none!important}`, which kept the dashboard sidebar hidden and squeezed the
  page into a 272px column on the owner's desktop (fixed 2026-10-23 across 23 places).
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

- Admins sign in at **/admin-login** (Firebase Auth email + password; `components/auth/admin-login-form.tsx`). `/admin` redirects
  signed-out visitors there. Admin password reset: /forgot-password (email link). Students never use Firebase Auth.
- Owner admin account: **admin@cs-masterclass.com** (always admin by email — `lib/admins.ts` + `isAdmin()` in rules).
- Anyone else becomes admin by creating them in Firebase Auth and setting `users/{uid}.role = "admin"` (console). `users` holds admins only.
- After sign-in: admins → `/admin`, students → `/dashboard` (unless `?next=`). An admin email typed on /login gets "this is an admin account".

## Firestore data model (see `firestore.rules`)

| Collection | Purpose | Access |
|---|---|---|
| `users/{uid}` | **admin** profiles only (Firebase Auth uid) | own read; admin write |
| `students/{id}` | id = registration id. name, **email** (lowercase, unique — the username), phone, **phoneKey** (8801… — the password is compared against this), parentPhone, classLevel, locationId, batchId (= confirmed batch), photoURL, **booksOwned**, status (active/disabled), **sessionVersion** | admin read/write; students go through the server |
| `students/{id}/private/auth` | old scrypt hashes from before 2026-10-23 — **no longer used** (left in place, not deleted) | **server only** |
| `loginAttempts/{sha256(studentId or email)}` | failed sign-in count / lock until | server only |
| `locations` | coaching centres | public read, admin write |
| `batches` | classLevel, locationId, name, board, `sessions[{day,start,end}]` (per-day times), seats, **fee** (BDT/month), status, notes | public read, admin write |
| `enrollments` | registrations (`uid: ""`, source signup, phoneKey, parentPhone — server-written) and batch-change requests (source profile): pending → confirmed/waitlisted/rejected/cancelled | students create own `profile` requests only; admin decides (registrations via server) |
| `enrollmentSecrets/{id}` | old: password hashes from registrations before 2026-10-23 — **no longer written**; deleted when that registration is confirmed | server only |
| `attendance/{batchId}_{YYYY-MM-DD}` | register: `records{uid: present/late/absent/excused}`, note | admin only |
| `studentAttendance/{uid}` | student's own copy: `records{sessionId: {batchId,date,start,end,mark}}`, written with each register save | own read; admin write |
| `tests/{id}` | title, type (class-test/mock/quiz), paper, date, maxMarks, batchIds, `marks{uid: number\|"absent"}`, published | admin only |
| `studentResults/{uid}` | `results{testId: {title,type,paper,date,max,score(null=absent),classAverage,highest}}` — synced by `syncResults()` in `lib/tests.ts` on publish/unpublish/save/delete | own read; admin write |
| `homework/{id}` | title, instructions, link, batchIds, dueDate, maxMarks (null = feedback only), visible, **audienceKeys** (`batch:<id>`, empty when hidden) | students of those batches read; admin write |
| `homework/{id}/submissions/{uid}` | link, note, file (Storage `homework/{id}/{uid}/…`), submittedAt; admin adds mark, feedback, markedAt | own read/write until marked; admin all |
| `syllabusProgress/{uid}` | `topics{topicId: {confidence 1-3}}` — topics defined in `lib/syllabus.ts` (0478/2210 for 9–10, 9618 AS/A2 for 11–12) | own read/write; admin read |
| `pastPapers/{uid}` | `papers{"2024-s-12": {score, max, at}}` — catalogue in `lib/past-papers.ts` | own read/write; admin read |
| `pushSubscriptions/{uid}` | `subs{key: {endpoint, keys, device}}` web-push subscriptions | own write; admin read/write |
| `adminPush/{admin uid}` | `subs{key: {endpoint, keys, device, at}}` — admin devices that turned on alerts | **server only** (saved via `saveAdminPush` with the admin's ID token) |
| `parentReports/{YYYY-MM}_{uid}` | month, uid, comment, sentAt (WhatsApp report log) | admin only |
| `announcements` | title, body, category, priority, audienceType/Values, pinned, status, expiresOn | published readable by signed-in users; admin write |
| `payments` | tuition/book/admission/other, month, amount (BDT), method, reference, receivedOn | own + admin; admin write |
| `resources` | study materials: title, description, kind (pdf/doc/image/video/link), url **or** file{path,name,size,contentType} (Storage `resources/{id}/…`), audienceType/Values, **audienceKeys** (`all`, `class:10`, `batch:<id>`, `location:<id>`; empty when hidden), visible | students read only docs whose audienceKeys match their profile (query must be `array-contains-any` of exactly their keys); admin write. Same check in `storage.rules` |
| `freeResources` | free material for /free-resources: title, description, kind, url **or** file + **fileUrl** (download link, Storage `free-resources/{id}/…`), **classes** `["9","10"…]`, visible — helpers `lib/free-resources.ts` | public read of visible docs only (query must filter `visible == true`); admin write |
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
  public pages, once per browser session (sessionStorage `bundle-popup-seen`); headline says "All five O Level books" + "O Level & IGCSE 0478 / 2210".

**Student accounts (no Firebase Auth; changed 2026-10-23 at the owner's request — username = email, password = mobile number):**
- `/signup` → `registerStudent` (`app/student-actions.ts`) writes `enrollments/{id}` (pending, `uid: ""`). **Email is required** (it's the
  username; lowercased; must not belong to another student, an admin, or another open registration). Name, email, mobile number and
  **parent's mobile number are all required** (form + server). No password fields anywhere. The parent's number must differ from the
  student's (compared by `phoneKey`; form, `registerStudent` and the student's own Profile edit — admins can still set anything; added 2026-10-24).
- Admin → Enrollments → Confirm → `decideRegistration` (checks admin ID token) creates `students/{id}`. A registration without an email
  can't be confirmed — the row shows "No email — add it in Review", and Review has an Email field (`placement.email`).
- Sign-in at **/login** (`signInStudentAccount` in `lib/auth.ts` → `signInStudent(email, phone)`): finds `students` by email and compares
  `phoneKey(phone)` (so 017…, +88017…, 017-… all work), then sets a **signed HttpOnly cookie** `__session` (HMAC with `SESSION_SECRET`,
  30 days, `lib/server/session.ts`) + readable flag `cs_student=1`. 5 wrong tries lock the account 10 min (`loginAttempts`). Unconfirmed
  registrations get pending / waitlisted / declined (+ note) messages; disabled students get the generic "don't match".
- Admin → Students: email and phone are editable (`signInProblem()` checks a valid email, unique among students, not an admin, and a valid
  BD mobile) and a "Sign-in details" box shows username + password (= mobile number). Student Profile shows "How you sign in"; only the
  teacher can change either. `changeMyPassword` / `setStudentPassword` / `lib/server/passwords.ts` were removed.
- Welcome WhatsApp message (`lib/welcome.ts`) lists "Email: …" and "Password: your mobile number (…)".
- Tested 2026-10-23: `e2e` script (puppeteer, emulator copy, prod build) — 33 checks × 3 fresh rounds, all passed (signup, duplicate email,
  pending, /admin-login, admin email on /login, confirm + welcome text, phone spellings, profile, sign-out, wrong number, lock, declined,
  disabled, no-email confirm via Review, admin edit duplicate email, phone change).
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
capacity, bulk; confirming a new registration opens a **Send welcome** drawer — one-tap WhatsApp welcome to student and parent,
text in `lib/welcome.ts`, editable per student in the drawer before sending (edits not saved), sent ticks in `enrollments.welcomedStudentAt/welcomedParentAt`, "Welcome" button on confirmed sign-ups), Attendance (take register, history grid, rates, CSV), Tests & marks (create test for batches,
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
- **Admin app** (2026-10-23): `app/admin.webmanifest/route.ts` ("CS Masterclass Admin", id + start_url `/admin`), linked by
  `metadata.manifest` in `app/admin/layout.tsx` and /admin-login (other pages keep the student `app/manifest.ts`). Install logic shared
  in `components/layout/use-install.ts` (`useAppSetup` in both shells). Admin top bar: **Install app** (`components/admin/install-button.tsx`
  — browser prompt when offered, else instructions) and **Alerts** bell (`components/admin/notify-button.tsx`).
- **Admin notifications**: `notifyAdmins()` in `lib/server/webpush.ts` (shared sender: allowed push hosts, one retry on network
  blips/429/5xx, removes gone endpoints, logs `[admin-push] "tag": sent n, failed n`). Messages in `lib/server/admin-alerts.ts`.
  Fired with `after()` on: new registration (`registerStudent`), batch-change request (`requestBatchChange`), student order
  (`placeMyOrder`), public web order (order form calls `notifyNewWebOrder(orderId)` — once per order via `orders.adminNotifiedAt`,
  only for status new + < 10 min old). Tested on emulator copy with a real FCM subscription (headless Chrome); batch-change path not
  driven through the UI.

**Free Resources + WhatsApp (2026-10-25; tsc + eslint clean; rules deployed; public page tested on dev with a test doc written via
firebase-admin — class pick, `?class=` links, popup per class/toggle, WhatsApp texts, no overflow at 375/768/1024. Admin UI tested
signed in as the owner: upload PDF → "choose a class" check → publish → shows on public page at once (refresh tag) → link downloads
(403 without token) → hide removes it from the page → delete removes doc + Storage file. Nothing left behind):**
- Navbar/footer "Free Resources" → `/free-resources` (`app/(site)/free-resources/page.tsx`, `components/sections/free-resources.tsx`):
  pick Class 9–12 (kept in `?class=`), see that class's items (ResourceCard, type filter), books/WhatsApp band below.
  Data: `getFreeResources()` in `lib/data.ts` (cache tag `free-resources`, refreshed by `refreshFreeResources()` after admin edits).
- Admin → Publishing → **Free resources** (`components/admin/free-resources-manager.tsx`): upload file / video / link, tick classes, hide/show, delete.
- `components/sections/premium-popup.tsx`: opens 150 s into a visit to /free-resources (once per session, `premium-popup-seen`),
  books for the chosen class (9–10 → O Level, 11–12 → A Level, toggle inside), "Premium services" list (`premiumServices` in
  `lib/content.ts` — owner should confirm the wording), WhatsApp buttons. The bundle popup no longer shows on /free-resources.
- WhatsApp **01917712336** = `site.whatsapp` / `site.phone`: floating button on public pages (`components/layout/whatsapp-button.tsx`, hidden on /order),
  footer, contact page, batch timetable waiting-list links, Organization JSON-LD telephone, order success page.
- Navbar link pills now show from **lg (1024px)** up; below that the menu button (5 links didn't fit at 768px).
- Class switch / popup level swap don't use AnimatePresence `mode="wait"` exits (an exit that never finishes left the old list on screen).
- Contact email = **csit.masterclass@gmail.com** (`site.email`, 2026-10-25).
- Gotcha: a cached Firestore read that failed (e.g. before rules deploy) returns [] and stays cached for ~1 min (`cacheLife("minutes")`).

**Interactive study pages (`study-resources/`, untracked in git; 2026-10-26):** standalone HTML notes for students (site colours,
Roboto, light/dark, phone-friendly, answers shown when printed). Hand-written: `databases-as-level.html` (live SQL playground via
sql.js from cdnjs + self-checking DDL/DML/INNER JOIN practice), `input-output-devices-olevel.html` (incl. sensor-based applications
simulator). Built from `study-resources/_source/` (see its README; `python3 study-resources/_source/build.py`): computer architecture
and Boolean logic (Class 9), arrays and scenario questions (Class 10, with an in-browser Cambridge pseudocode interpreter —
`pseudo.js`), OS & translators (AS), processors & parallel, Boolean algebra (K-maps), translation software (A2). Content from
`Book/` (O Level handbook, Hodder AS & A Level). The old PDFs in that folder show the previous design.
- **HTML study materials (2026-10-26):** Admin → Resources accepts `.html` (kind `html`, "Interactive"; only there — homework and
  free resources still refuse HTML). Stored like other files at Storage `resources/{id}/…` (storage.rules allows `text/html` on that
  path only — **must be deployed**). Students open it in a full-screen pop-up (`HtmlViewer` in `components/dashboard/resource-card.tsx`,
  iframe `sandbox="allow-scripts"`). `/api/student/files/resource/{id}` serves HTML only to iframes (`Sec-Fetch-Dest`), with a
  `sandbox` CSP and an injected script/style that blocks select/copy/right-click/save/print (not editors) and hides `.copy` buttons.
  Tested on the emulator copy: admin upload to a batch works; the student-side viewer was not yet driven end to end.

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
Real testimonials/results matter for rankings too (placeholders in `lib/content.ts`). Still to replace (needs the owner): owner name (About page says "Your Name"), social links (point at youtube.com etc.),
`site.whatsapp`, placeholder testimonials/results in `lib/content.ts`. 

- **Settings** section in admin (WhatsApp number, payment instructions, prices). Orders is built (2026-10-14).
- Public **order form** `/order` (`components/books/order-form.tsx`): every "Order now"/"Get the bundle" button links to it via
  `orderLink()` in `lib/pricing.ts` (`?book=slug&kind=hard` or `?bundle=soft`). Payment details aren't shown to customers yet
  (needs the bKash/Nagad numbers) — the confirm message says "we'll share the payment details".
- Ideas not built: students seeing their orders in the dashboard (rules already allow own read); push/email alert to admin on a new order.
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
- Admin UI screenshots at any width (2026-10-23): emulator copy as above + seed script (locations, batches, 24 students,
  enrollments, payments, orders, tests, attendance, homework, announcements) + `puppeteer-core` driving the installed Google Chrome
  headless (sign in with the emulator admin, `setViewport`, screenshot each `/admin/*` route). Widths checked: 375, 1024, 1280,
  1366×768, 1440, 1920 — no horizontal overflow anywhere.
- Flow/rules tests: run against emulators (Auth + Firestore + Storage) with firebase-admin pointed at them. Emulator needs Java 21 for current firebase-tools (Mac has 17) → use `npx firebase-tools@13.35.1`; port 8080 is taken by Docker.
- Push needs HTTPS (works on the live site, not on plain http://localhost from a phone).
- Push delivery to a real phone is untested (the test browser blocks notification permission) — test on a phone after deploy.
- Placeholder content to replace: testimonials, results, milestones, recognitions (`lib/content.ts`), owner name/email/socials (`lib/site.ts`).
- **Open (2026-10-23): admin sign-in on Chrome for iPhone shows "Network error"** (`auth/network-request-failed`) on the owner's
  iPhone over Wi-Fi and mobile data; Safari on the same phone works, students (server sign-in) work in Chrome. Not reproducible in
  WebKit iPhone emulation. Workaround: Safari / installed CS Admin app. **Changed (pushed 2026-10-24):** `auth()` in
  `lib/firebase-client.ts` now uses `initializeAuth` without the popup/redirect resolver (on iOS the SDK otherwise loads a Google
  iframe before every sign-in; nothing uses popup/redirect), `signInAdmin` retries once on a network error, and /admin-login shows a
  "Details: …" line (browser's raw error, navigator.onLine, and a probe of identitytoolkit.googleapis.com). Next: owner tries Chrome
  on iPhone after deploy and sends a screenshot of the Details line if it still fails.
- Admin push alerts not yet confirmed on a real phone.
- Printable payment receipts (suggested, not built).
- Automatic SMS without a paid provider: plan = Android phone + SIM as SMS gateway (open-source gateway app), website calls it on
  payment/welcome. Discussed 2026-10-23, not built (SMS providers didn't respond). Google-Sheet "Paid" → message idea also not built.
- Automatic SMS receipts (needs a BD bulk-SMS account, e.g. BulkSMSBD/Alpha SMS, + server-side API key) — WhatsApp version is built (`receiptMessage` in `lib/payments.ts`).
