import type { Metadata } from "next";
import { Mail, Clock, BookOpen } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { ContactForm } from "@/components/sections/contact-form";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact — Computer Science Classes & Book Orders",
  description:
    "Ask about O Level / IGCSE and A Level Computer Science batches in Mirpur and Uttara, Dhaka, one-to-one mentoring, school workshops or book orders.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={["Let's start ", { em: "a conversation." }]}
        intro="Whether you're a student, a parent, a school or a reader — send a note and I'll get back to you personally."
      />
      <section className="container-x grid gap-10 pb-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <Reveal>
          <ul className="space-y-6">
            {[
              { icon: Mail, title: "Email", body: <a href={`mailto:${site.email}`} className="link-underline">{site.email}</a> },
              { icon: Clock, title: "Response time", body: "Within two working days" },
              { icon: BookOpen, title: "Bulk & school orders", body: "Discounts available for classroom sets of any title." },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4 rounded-3xl border border-line p-6">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-forest text-forest-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-xl">{title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1}>
          <ContactForm />
        </Reveal>
      </section>
    </>
  );
}
