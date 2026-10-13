import { Reveal } from "@/components/motion/reveal";
import { SplitHeading, type HeadingSegment } from "@/components/motion/split-heading";
import { ButtonLink } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";

export function CtaBand({ title, body, href, label }: { title: HeadingSegment[]; body: string; href: string; label: string }) {
  return (
    <section className="container-x pt-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-band px-6 py-16 text-center text-band-ink sm:px-12 sm:py-24">
        <div aria-hidden className="absolute -left-20 -top-20 size-80 rounded-full bg-band-accent/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 -right-10 size-80 rounded-full bg-ember/25 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <SplitHeading segments={title} className="text-4xl leading-tight sm:text-5xl lg:text-6xl [&_.text-ember]:text-band-accent" />
          <Reveal delay={0.15}>
            <p className="mx-auto mt-5 max-w-lg opacity-80">{body}</p>
            <div className="mt-10">
              <Magnetic>
                <ButtonLink href={href} variant="light">{label}</ButtonLink>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
