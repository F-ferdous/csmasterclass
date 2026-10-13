"use client";

import { Moon, Sun } from "lucide-react";
import type { MouseEvent } from "react";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Light/dark switch. The new theme spreads out in a circle from the button
 * (View Transitions API), falling back to an instant switch where unsupported.
 * Icons are swapped purely with CSS (.show-light / .show-dark) so there is no
 * hydration mismatch.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    const apply = () => {
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch {}
    };

    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition) return apply();

    // Keyboard clicks have no pointer position — grow from the button's centre instead.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.detail === 0 ? rect.left + rect.width / 2 : e.clientX;
    const y = e.detail === 0 ? rect.top + rect.height / 2 : e.clientY;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    doc.startViewTransition(apply).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark mode"
      title="Switch between light and dark mode"
      className={`group grid size-11 place-items-center rounded-full border border-line bg-paper/60 backdrop-blur transition-colors hover:border-ink ${className}`}
    >
      <span className="show-light animate-[icon-in_0.5s_cubic-bezier(0.22,1,0.36,1)]">
        <Moon className="size-[18px] transition-transform duration-500 group-hover:-rotate-[25deg]" aria-hidden />
      </span>
      <span className="show-dark animate-[icon-in_0.5s_cubic-bezier(0.22,1,0.36,1)]">
        <Sun className="size-[18px] transition-transform duration-700 group-hover:rotate-90" aria-hidden />
      </span>
    </button>
  );
}
