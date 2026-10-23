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
  /** The live address (canonical links, sitemap, share previews, structured data). */
  url: "https://cs-masterclass.com",
  /** City shown to search engines (local results). */
  city: "Dhaka",
  /**
   * Google Search Console "HTML tag" verification code (only the content="…" value).
   * Not needed when the domain is verified with a DNS TXT record.
   */
  googleVerification: "",
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
  city: string;
  googleVerification: string;
  socials: readonly { label: string; href: string }[];
  nav: readonly { label: string; href: string }[];
};
