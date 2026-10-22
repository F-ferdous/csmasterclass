/**
 * Site-wide settings. Edit these to make the site yours.
 * `ownerName` is intentionally only used on the About page — never on Home.
 */
export const site = {
  brand: "CS Masterclass",
  ownerName: "Your Name",
  /** Optional portrait for the About page, e.g. "/portrait.jpg" placed in /public. */
  portrait: "",
  role: "Computer Science Educator & Author",
  description:
    "A decade of teaching computer science — clear lessons, proven results, and books that make hard ideas feel simple.",
  email: "hello@example.com",
  /**
   * WhatsApp number for orders, in international format without "+" or spaces,
   * e.g. "8801712345678". While empty, "Order" buttons go to the contact page.
   */
  whatsapp: "",
  /** The live address (sitemap, share previews). Set to the real domain before launch. */
  url: "https://example.com",
  socials: [
    { label: "YouTube", href: "https://youtube.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "Facebook", href: "https://facebook.com" },
  ],
  /** Navbar + footer links. The About page is intentionally unlisted (still reachable at /about). */
  nav: [
    { label: "Home", href: "/" },
    { label: "Teaching", href: "/teaching" },
    { label: "Success", href: "/success" },
    { label: "Books", href: "/books" },
  ],
} as {
  brand: string;
  ownerName: string;
  portrait: string;
  role: string;
  description: string;
  email: string;
  whatsapp: string;
  url: string;
  socials: readonly { label: string; href: string }[];
  nav: readonly { label: string; href: string }[];
};
