import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "light";

const styles: Record<Variant, string> = {
  primary: "bg-forest text-forest-ink hover:bg-ink hover:text-paper",
  ghost: "border border-line text-ink hover:border-ink",
  light: "bg-paper text-ink hover:bg-paper-2",
};

export const buttonClass = (variant: Variant = "primary", className?: string) =>
  cn(
    "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold",
    "transition-[background,color,border-color,transform] duration-300 active:scale-[0.97]",
    styles[variant],
    className,
  );

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  className?: string;
  children: ReactNode;
  arrow?: boolean;
};

export function ButtonLink({ variant = "primary", className, children, arrow = true, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, className)} {...props}>
      {children}
      {arrow && (
        <ArrowUpRight
          aria-hidden
          className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      )}
    </Link>
  );
}
