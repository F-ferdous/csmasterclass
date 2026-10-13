import type { ReactNode } from "react";
import { Logo } from "@/components/layout/navbar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AuthAside } from "@/components/auth/auth-aside";

/** Split-screen layout for sign-in, join and password reset. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
      <AuthAside />
    </div>
  );
}
