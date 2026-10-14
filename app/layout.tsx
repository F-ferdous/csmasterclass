import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { MotionProvider } from "@/components/motion/motion-provider";
import { themeScript } from "@/lib/theme";
import { Analytics } from "@/components/layout/analytics";
import { AuthProvider } from "@/components/auth/auth-provider";
import { StudentSessionProvider } from "@/components/auth/student-session";
import { site } from "@/lib/site";
import "./globals.css";

// Roboto everywhere — headings, body, labels and code.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.brand} — Teaching, Results & Books`, template: `%s · ${site.brand}` },
  description: site.description,
  openGraph: { title: site.brand, description: site.description, type: "website" },
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
      <body className="flex min-h-dvh flex-col">
        <MotionProvider>
          <AuthProvider>
            <StudentSessionProvider>{children}</StudentSessionProvider>
          </AuthProvider>
          <Analytics />
        </MotionProvider>
      </body>
    </html>
  );
}
