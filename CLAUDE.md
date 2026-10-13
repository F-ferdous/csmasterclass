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
  Storage is **not set up yet** (cover uploads in /admin need it).
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
- Git: all work committed on branch **`site-build`** (checkpoint 2026-10-13); `main` still has only the
  create-next-app commit. No remote is configured. Commit only when the user asks.

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
| `users/{uid}` | profile: name, email, phone, classLevel, locationId, batchId, role | own + admin; role only changeable by admin |
| `locations` | coaching centres | public read, admin write |
| `batches` | classLevel, locationId, name, board, `sessions[{day,start,end}]` (per-day times), seats, **fee** (BDT/month), status, notes | public read, admin write |
| `enrollments` | seat requests: pending → confirmed/waitlisted/rejected/cancelled | student creates own pending; admin decides |
| `attendance/{batchId}_{YYYY-MM-DD}` | register: `records{uid: present/late/absent/excused}`, note | admin only |
| `announcements` | title, body, category, priority, audienceType/Values, pinned, status, expiresOn | published readable by signed-in users; admin write |
| `payments` | tuition/book/admission/other, month, amount (BDT), method, reference, receivedOn | own + admin; admin write |
| `books` | book catalogue (falls back to `lib/seed-books.ts` when empty) | public read, admin write |
| `messages`, `subscribers` | contact form, newsletter | public create, admin read |

## Status — completed

**Public site:** Home (motion hero with book covers, velocity marquee, stats, pinned horizontal book
showcase, bundle offer, pseudocode card, testimonials, newsletter), Teaching (coaching centres,
live batch timetable from Firestore with "Join this batch", benefits, Edexcel note), Success, Books
(+ detail page with 3D flip front/back covers, editions & prices, bundle), About (unlisted in nav/footer),
Contact, 404. Favicon, dark/light toggle, Roboto font, pointer cursors.

**Books & prices** (`lib/seed-books.ts`, covers rendered from `book-cover pages/` PDFs into `public/books/`):
Handbook 499/1499 BDT, Topical Question Bank 399/999, Past Paper QP 399/999, Topical Notes 150/chapter
or 1200 combined, Mock Exam 449/1399; Bundle 1999 soft / 4500 hard (best value, savings computed).

**Auth:** Sign in / Join now (email+password, Google), forgot password, email verification.
Join requires Class → Centre → Batch (creates a pending enrollment).

**Student dashboard (`/dashboard`):** Overview (next-class countdown, batch + seat status, centre,
week timetable, latest announcements, books), Schedule, Announcements, Books, Payments, Profile
(change batch → new enrollment request). Soon: Attendance, Progress, Study materials.

**Admin dashboard (`/admin`):** Overview, Batches (per-day times, fee, seats, student counts),
Locations, Students (search/filter/edit/admin toggle/CSV), Enrollments (confirm/waitlist/decline,
capacity, bulk, sync existing), Attendance (take register, history grid, rates, CSV),
Books, Announcements (targeted by class/batch/centre, pin, expiry, preview), Messages, Subscribers,
Payments (monthly dues, record payments, WhatsApp reminders, ledger, CSV), Reports (KPIs + charts).
Soon: Orders, Settings.

## Next up / open items

- **Orders** and **Settings** sections in admin (Settings could hold WhatsApp number, payment instructions, prices).
- Student **Attendance** (private per-student view), **Progress**, **Study materials**.
- `site.whatsapp` in `lib/site.ts` is empty → "Order" buttons fall back to /contact. Ask the user for the number.
- Payment instructions for students (bKash/Nagad numbers) not provided yet.
- Firebase **Storage** not enabled → cover-image uploads in Admin → Books won't work; then deploy `storage.rules`.
- Placeholder content to replace: testimonials, results, milestones, recognitions (`lib/content.ts`), owner name/email/socials (`lib/site.ts`).
- Printable payment receipts (suggested, not built).
- Decide whether to merge `site-build` into `main` and add a GitHub remote (ask the user).
