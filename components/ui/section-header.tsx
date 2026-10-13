import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading, type HeadingSegment } from "@/components/motion/split-heading";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow: string;
  title: HeadingSegment[];
  intro?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({ eyebrow, title, intro, align = "left", className }: Props) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <Reveal>
        <p className="eyebrow mb-5 flex items-center gap-3 data-[center=true]:justify-center" data-center={align === "center"}>
          <span className="h-px w-8 bg-ember" />
          {eyebrow}
        </p>
      </Reveal>
      <SplitHeading segments={title} className="text-4xl leading-[1.05] sm:text-5xl lg:text-6xl" />
      {intro && (
        <Reveal delay={0.15}>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft text-pretty">{intro}</p>
        </Reveal>
      )}
    </div>
  );
}
