# CS Masterclass

A portfolio site for a computer science teacher: their teaching, their students' results, and their books. Built with **Next.js 16** (App Router, Cache Components), **Tailwind CSS v4**, **Motion**, **Lenis** smooth scrolling, and **Firebase** (Firestore, Storage, Auth). Typography: **Roboto** throughout.

## Pages

| Route | What's there |
| --- | --- |
| `/` | Hero with covers that follow the cursor and fan out as you scroll, a marquee that reacts to scroll speed, stats that count up, a pinned book showcase that scrolls sideways, typed-out pseudocode, testimonials, newsletter sign-up. **Your name does not appear here.** |
| `/teaching` | Teaching philosophy, the five steps of a lesson (the timeline draws itself as you scroll), subjects, and ways to learn |
| `/success` | Stats, results, a milestone timeline, recognitions, and a wall of testimonials |
| `/books` | The whole library, filterable by category |
| `/books/[slug]` | One book: a cover you can flip in 3D to its back, key numbers, what's inside, and buy links |
| `/about` | Bio. This is the only page that shows your name. |
| `/contact` | Contact form, saved to Firestore |
| `/login`, `/signup`, `/forgot-password` | Sign in and Join now with email + password or Google, and password reset |
| `/account` | A signed-in user's profile: name, phone, class, preferred centre, email verification |
| `/admin` | Admin dashboard (admins only): Overview, **Batches**, **Locations**, Books, Messages, Subscribers, plus placeholders for Students, Enrollments, Attendance, Announcements, Orders, Payments, Reports and Settings |

## Run locally

```bash
npm install
npm run dev
```

You don't need Firebase to run it. Until Firebase is connected, the site shows the five built-in books (defined in `lib/seed-books.ts`, with covers in `public/books/`), and the forms run in preview mode (they act as if they sent but save nothing).

## Make it yours

- **`lib/site.ts`**: brand name, your name (used only on About), portrait, email, social links
- **`lib/content.ts`**: stats, principles, subjects, testimonials, milestones, results
- **`lib/seed-books.ts`**: the five built-in books, with covers rendered from `book-cover pages/` into `public/books/` (or manage books from `/admin`)
- **`lib/content.ts` → `bundle`**: the all-books bundle prices (savings are calculated automatically from the book prices)
- **`lib/site.ts` → `whatsapp`**: your WhatsApp number for orders (until set, Order buttons open the contact page)
- **`app/globals.css`**: colours for light and dark mode

To use a portrait, put it in `public/` (for example `public/portrait.jpg`) and set `portrait: "/portrait.jpg"`.

## Connect Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Turn on **Firestore**, **Storage**, and **Authentication → Google** as a sign-in provider.
3. Add a **Web app** and copy its config:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the values.
4. In **Authentication → Sign-in method**, enable **Email/Password** and **Google**.
5. Deploy the rules:
   ```bash
   npx firebase-tools login
   npx firebase-tools use --add
   npx firebase-tools deploy --only firestore,storage
   ```
6. Restart `npm run dev`, then use **Join now** to create your own account.
7. **Make yourself an admin:** in Firebase console → Firestore → `users` → your document, change `role` from `student` to `admin`. (Visiting `/admin` while signed in shows your user ID and a direct link to that document.) Nobody can change their own role from the website; the rules forbid it.
8. Open `/admin`. In **Locations**, add Mirpur Academia & Uttara QED with one click. Then create batches in **Batches**; open batches appear on the Teaching page with a **Join this batch** button.

As soon as Firestore has at least one book, the public site shows only your Firestore books (drafts are hidden). When you save in `/admin`, the public pages update straight away.

### Data model

- `books/{slug}`: title, subtitle, description, longDescription, category, year, pages, prices[{kind,bdt,usd}], coverUrl, backUrl, syllabus, facts[{value,label}], coverColor, coverAccent, motif, highlights[], buyLinks[{label,url}], praise[{quote,author}], featured, status (`published` | `coming-soon` | `draft`), order
- `users/{uid}`: name, email, phone, classLevel, locationId, photoURL, role (`student` | `admin`)
- `locations/{id}`: name, area, address, mapUrl, phone, active, order
- `batches/{id}`: classLevel (`9`–`12`), locationId, name, board (`Cambridge` | `Edexcel` | `Both`), days[], startTime, endTime, seats, status (`open` | `few-seats` | `full` | `closed`), notes
- `messages/{id}`: contact form messages (only admins can read them)
- `subscribers/{id}`: newsletter emails (only admins can read them)

## Deploy (Firebase App Hosting)

App Hosting builds and serves Next.js with server rendering.

1. Push this repo to GitHub.
2. In the Firebase console, open **App Hosting → Get started** and connect the repo.
3. Set the `NEXT_PUBLIC_*` variables. Either fill them in `apphosting.yaml` or add them in the console.
4. Add your App Hosting domain (and any custom domain) to **Authentication → Settings → Authorized domains**, or sign-in will fail there.

Every push to your main branch then deploys automatically.

## Notes

- Animations run even when a visitor has turned on the OS **Reduce motion** setting. To honour that setting instead, change `reducedMotion="never"` to `"user"` in `components/motion/motion-provider.tsx`.
- Light and dark mode follow the visitor's system setting until they use the toggle in the navbar; their choice is remembered in `localStorage`.
- The About page is not linked from the navbar or footer, but still exists at `/about`.
- Favicon: `app/icon.svg` (plus `favicon.ico` and `apple-icon.png` generated from it).
- Books without an uploaded image get a designed typographic cover. In the editor you pick its colours and pattern.
