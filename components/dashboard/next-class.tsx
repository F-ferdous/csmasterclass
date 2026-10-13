"use client";

import { motion } from "motion/react";
import { Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { countdown, dayLabel, formatTimeRange, nextClass } from "@/lib/schedule";
import type { Batch, Location } from "@/lib/types";

/** Live "next class" card — re-evaluates every 30 seconds. */
export function NextClassCard({ batch, location }: { batch: Batch; location: Location | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const upcoming = nextClass(batch.sessions, now);

  return (
    <div className="relative h-full overflow-hidden rounded-3xl bg-band p-6 text-band-ink sm:p-8">
      <motion.div
        aria-hidden
        className="absolute -right-16 -top-16 size-56 rounded-full bg-band-accent/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      {!upcoming ? (
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.18em] opacity-70">Next class</p>
          <p className="mt-3 font-display text-2xl">No class times set yet</p>
          <p className="mt-2 text-sm opacity-75">Your teacher will add the timings for {batch.name} soon.</p>
        </div>
      ) : (
        <div className="relative">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
            {upcoming.live ? (
              <>
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-band-accent opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-band-accent" />
                </span>
                <span className="text-band-accent">Class in progress</span>
              </>
            ) : (
              <span className="opacity-70">Next class</span>
            )}
          </p>
          <p className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{dayLabel(upcoming.start, now)}</p>
          <p className="mt-2 flex items-center gap-2 text-lg">
            <Clock className="size-4 text-band-accent" aria-hidden />
            {formatTimeRange(upcoming.session.start, upcoming.session.end)}
          </p>
          {location && (
            <p className="mt-1.5 flex items-center gap-2 text-sm opacity-80">
              <MapPin className="size-4 text-band-accent" aria-hidden /> {location.name}
              {location.area ? ` · ${location.area}` : ""}
            </p>
          )}
          <div className="mt-6 inline-flex items-baseline gap-2 rounded-2xl bg-band-ink/10 px-4 py-3">
            {upcoming.live ? (
              <>
                <span className="text-sm opacity-80">Ends in</span>
                <span className="font-display text-2xl text-band-accent">{countdown(upcoming.end, now)}</span>
              </>
            ) : (
              <>
                <span className="text-sm opacity-80">Starts in</span>
                <span className="font-display text-2xl text-band-accent">{countdown(upcoming.start, now)}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
