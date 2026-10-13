import type { Metadata } from "next";
import Image from "next/image";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { ButtonLink } from "@/components/ui/button";
import { CtaBand } from "@/components/sections/cta-band";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${site.ownerName} — ${site.role}.`,
};

const values = [
  { title: "Clarity over cleverness", body: "The best explanation is the one a nervous beginner understands on first reading." },
  { title: "Patience is a method", body: "Confusion is a normal step in learning, not a sign of failure. Every lesson leaves room for it." },
  { title: "High standards, warm room", body: "Students rise to expectations when they feel safe enough to make mistakes." },
];

const facts = [
  { k: "Teaching since", v: "2015" },
  { k: "Students taught", v: "12,000+" },
  { k: "Books written", v: "6" },
  { k: "Focus", v: "Computer Science" },
];

export default function AboutPage() {
  const initials = site.ownerName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <section className="relative overflow-hidden pb-20 pt-32 sm:pt-44">
        <div aria-hidden className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" />
        <div className="container-x relative grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal>
            <div className="relative mx-auto w-full max-w-md">
              <div aria-hidden className="absolute -inset-4 rotate-[-4deg] rounded-[2.5rem] bg-ember/15" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-band shadow-lift">
                {site.portrait ? (
                  <Image src={site.portrait} alt={`Portrait of ${site.ownerName}`} fill priority sizes="(min-width: 1024px) 448px, 90vw" className="object-cover" />
                ) : (
                  <div className="grid size-full place-items-center">
                    <div aria-hidden className="absolute inset-0 dot-grid opacity-40" />
                    <span className="relative font-display text-[9rem] italic text-band-accent">{initials}</span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-6 -right-2 rounded-2xl border border-line bg-paper px-5 py-4 shadow-soft sm:-right-8">
                <p className="font-display text-3xl leading-none">10+</p>
                <p className="mt-1 text-xs text-ink-soft">years teaching</p>
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <p className="eyebrow flex items-center gap-3">
                <span className="h-px w-8 bg-ember" /> About
              </p>
            </Reveal>
            <SplitHeading as="h1" immediate segments={["Hello, I'm ", { em: `${site.ownerName}.` }]} className="mt-6 text-5xl leading-[1.02] sm:text-6xl lg:text-7xl" />
            <Reveal delay={0.3}>
              <p className="mt-4 font-mono text-sm uppercase tracking-[0.16em] text-ink-soft">{site.role}</p>
              <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-soft text-pretty">
                <p>
                  For more than ten years I have taught computer science to teenagers, university hopefuls, career-changers
                  and fellow teachers. What started as one classroom has grown into online cohorts, workshops and a series of books.
                </p>
                <p>
                  My belief is simple: anyone can learn to think like a computer scientist when the ideas are shown clearly,
                  explained patiently and practised with purpose. Everything I make is built around that belief.
                </p>
              </div>
              <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
                {facts.map((f) => (
                  <div key={f.k} className="bg-paper p-4">
                    <dt className="text-xs text-ink-faint">{f.k}</dt>
                    <dd className="mt-1 font-display text-xl">{f.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-10 flex flex-wrap gap-3">
                <ButtonLink href="/books">Read the books</ButtonLink>
                <ButtonLink href="/contact" variant="ghost" arrow={false}>Say hello</ButtonLink>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="container-x py-16 sm:py-24">
        <Reveal>
          <h2 className="max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
            What I believe <em className="text-ember">about teaching</em>
          </h2>
        </Reveal>
        <Stagger className="mt-12 grid gap-5 md:grid-cols-3">
          {values.map((v, i) => (
            <StaggerItem key={v.title}>
              <div className="h-full rounded-3xl border border-line bg-paper-2/50 p-8">
                <span className="font-display text-4xl italic text-ember">0{i + 1}</span>
                <h3 className="mt-6 font-display text-2xl">{v.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{v.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <CtaBand
        title={["Let's build something ", { em: "worth learning." }]}
        body="For classes, school partnerships, speaking or book enquiries — I'd love to hear from you."
        href="/contact"
        label="Get in touch"
      />
    </>
  );
}
