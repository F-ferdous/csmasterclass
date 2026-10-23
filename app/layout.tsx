import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { MotionProvider } from "@/components/motion/motion-provider";
import { themeScript } from "@/lib/theme";
import { Analytics } from "@/components/layout/analytics";
import { UpdateWatcher } from "@/components/layout/update-watcher";
import { AuthProvider } from "@/components/auth/auth-provider";
import { StudentSessionProvider } from "@/components/auth/student-session";
import { site } from "@/lib/site";
import { seoKeywords } from "@/lib/seo";
import "./globals.css";

// Roboto everywhere — headings, body, labels and code.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// Defaults for every page. Public pages add their own title, description and canonical link (pageMetadata in lib/seo.ts).
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `O Level & A Level Computer Science in ${site.city} | ${site.brand}`, template: `%s · ${site.brand}` },
  description:
    "Cambridge O Level, IGCSE (0478 / 2210) and AS & A Level (9618) Computer Science classes in Mirpur and Uttara, Dhaka — plus handbooks, topical notes, question banks and mock papers.",
  applicationName: site.brand,
  keywords: seoKeywords,
  category: "education",
  creator: site.brand,
  publisher: site.brand,
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", siteName: site.brand, locale: "en_BD" },
  twitter: { card: "summary_large_image" },
  ...(site.googleVerification ? { verification: { google: site.googleVerification } } : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#121412" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${roboto.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before React loads. */}
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <MotionProvider>
          <AuthProvider>
            <StudentSessionProvider>{children}</StudentSessionProvider>
          </AuthProvider>
          <Analytics />
          <UpdateWatcher />
        </MotionProvider>
      </body>
    </html>
  );
}
