import { Counter } from "@/components/motion/counter";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { stats } from "@/lib/content";

export function StatsBand() {
  return (
    <section className="container-x py-20 sm:py-28" aria-label="At a glance">
      <Stagger className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line lg:grid-cols-4">
        {stats.map((s) => (
          <StaggerItem key={s.label} className="bg-paper p-5 sm:p-10">
            <p className="font-display text-[2.1rem] leading-none min-[400px]:text-5xl tracking-tight sm:text-6xl lg:text-7xl">
              <Counter value={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-3 text-sm text-ink-soft">{s.label}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
