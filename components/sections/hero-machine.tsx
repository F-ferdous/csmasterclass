"use client";

import { AnimatePresence, motion, useInView, useTransform, type MotionValue } from "motion/react";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ease } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

type Pointer = { mx: MotionValue<number>; my: MotionValue<number> };

/** A counter that goes up every `ms` while `active` (paused when the hero is off screen). */
function useTicker(ms: number, active: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setN((v) => v + 1), ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
  return n;
}

/*
 * The hero illustration: a processor in the middle sends data along circuit traces to four
 * live syllabus demos — pseudocode typing itself, a logic gate, binary conversion and a bubble sort.
 * The box is 9:10 and the SVG viewBox is 90×100, so a % position equals the same SVG unit.
 */
export function HeroMachine({ mx, my, progress }: Pointer & { progress: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useInView(ref);
  const y = useTransform(progress, [0, 1], [0, 140]);
  const scale = useTransform(progress, [0, 1], [1, 0.88]);

  return (
    <motion.div
      ref={ref}
      role="img"
      aria-label="Animated illustration: a processor sending data to pseudocode, a logic gate, binary numbers and a sorting algorithm"
      className="relative mx-auto aspect-[9/10] w-full max-w-[540px]"
      style={{ y, scale }}
    >
      <div aria-hidden className="absolute inset-0">
        <Traces />
        <Chip live={live} />

        <Panel label="Pseudocode" className="left-0 top-[2%] w-[50%]" depth={-30} delay={1} mx={mx} my={my}>
          <TypingCode live={live} />
        </Panel>
        <Panel label="Logic gates" className="right-0 top-[8%] w-[44%]" depth={-46} delay={1.15} mx={mx} my={my}>
          <Gate live={live} />
        </Panel>
        <Panel label="Binary" className="left-[2%] top-[68%] w-[45%]" depth={-22} delay={1.3} mx={mx} my={my}>
          <Binary live={live} />
        </Panel>
        <Panel label="Bubble sort" className="right-0 top-[70%] w-[45%]" depth={-38} delay={1.45} mx={mx} my={my}>
          <Sort live={live} />
        </Panel>
      </div>
    </motion.div>
  );
}

/* ───────────── Circuit traces with travelling data packets ───────────── */

const traces = [
  { d: "M39 41 V35 H18 V26", color: "var(--ember)", delay: 0 },
  { d: "M51 41 V37 H72 V30", color: "var(--forest)", delay: 0.6 },
  { d: "M34 58 H20 V72", color: "var(--gold)", delay: 1.2 },
  { d: "M56 60 H74 V75", color: "var(--ember)", delay: 1.8 },
];
// Short decorative pin traces, each ending in a dot at [x, y].
const stubs = [
  { d: "M45 40 V33", end: [45, 33] },
  { d: "M34 49 H28", end: [28, 49] },
  { d: "M56 50 H62", end: [62, 50] },
  { d: "M45 63.4 V68", end: [45, 68] },
];

function Traces() {
  return (
    <svg viewBox="0 0 90 100" className="absolute inset-0 size-full overflow-visible">
      {[...traces, ...stubs].map(({ d }, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke="var(--ink-faint)"
          strokeOpacity={0.45}
          strokeWidth={0.45}
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, delay: 0.5 + i * 0.08, ease }}
        />
      ))}
      {stubs.map(({ d, end: [cx, cy] }) => (
        <motion.circle key={`dot-${d}`} cx={cx} cy={cy} r={0.9} fill="var(--ink-faint)" initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 1.4 }} />
      ))}
      {/* Packets: a short dash that runs the length of each trace, then pauses off the end. */}
      {traces.map((t) => (
        <path
          key={`packet-${t.d}`}
          d={t.d}
          pathLength={1}
          fill="none"
          stroke={t.color}
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeDasharray="0.1 1.4"
          className="hero-packet"
          style={{ animationDelay: `${1.6 + t.delay}s` }}
        />
      ))}
    </svg>
  );
}

/* ───────────── Processor ───────────── */

const cycle = ["FETCH", "DECODE", "EXECUTE"];

function Chip({ live }: { live: boolean }) {
  const step = useTicker(950, live) % cycle.length;
  return (
    <motion.div
      className="absolute left-[37%] top-[40%] z-[5] aspect-square w-[26%]"
      initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.4 }}
    >
      {/* heartbeat ring */}
      <motion.span
        className="absolute inset-0 rounded-[22%] border-2 border-forest"
        animate={{ scale: [1, 1.45], opacity: [0.5, 0] }}
        transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut" }}
      />
      {/* pins */}
      {(["top", "bottom", "left", "right"] as const).map((side) => (
        <span
          key={side}
          className={cn(
            "absolute flex justify-around",
            side === "top" && "inset-x-[18%] -top-[7%] h-[7%]",
            side === "bottom" && "inset-x-[18%] -bottom-[7%] h-[7%]",
            side === "left" && "inset-y-[18%] -left-[7%] w-[7%] flex-col",
            side === "right" && "inset-y-[18%] -right-[7%] w-[7%] flex-col",
          )}
        >
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("rounded-full bg-ink-faint/60", side === "top" || side === "bottom" ? "h-full w-[9%]" : "h-[9%] w-full")} />
          ))}
        </span>
      ))}
      <div className="relative grid size-full place-items-center rounded-[22%] bg-forest text-forest-ink shadow-lift">
        <div className="grid size-[74%] place-items-center rounded-[18%] border border-forest-ink/25">
          <div className="text-center">
            <p className="font-mono text-[clamp(11px,3.2vw,18px)] font-semibold leading-none tracking-wider">CPU</p>
            <div className="relative mt-1.5 h-[1.2em] overflow-hidden font-mono text-[clamp(7px,1.6vw,10px)] tracking-[0.14em] opacity-80">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={cycle[step]}
                  className="block"
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{ duration: 0.35, ease }}
                >
                  {cycle[step]}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ───────────── Card shell ───────────── */

function Panel({
  label,
  className,
  depth,
  delay,
  mx,
  my,
  children,
}: Pointer & { label: string; className: string; depth: number; delay: number; children: ReactNode }) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.div className={cn("absolute z-10", className)} style={{ x, y }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 170, damping: 16, delay }}
      >
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 5 + depth / -20, repeat: Infinity, ease: "easeInOut", delay: delay + 0.8 }}
          className="rounded-2xl border border-line bg-paper/85 p-2.5 shadow-soft backdrop-blur-md sm:p-4"
        >
          <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint sm:text-[10px]">
            <span className="size-1.5 rounded-full bg-ember" />
            {label}
          </p>
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────── 1. Pseudocode that types itself and runs ───────────── */

type Token = { t: string; k?: boolean };
const code: Token[][] = [
  [{ t: "FOR ", k: true }, { t: "i ← 1 " }, { t: "TO ", k: true }, { t: "5" }],
  [{ t: "  OUTPUT ", k: true }, { t: "i * i" }],
  [{ t: "NEXT ", k: true }, { t: "i" }],
];
const lineLengths = code.map((line) => line.reduce((n, tok) => n + tok.t.length, 0));
const codeLength = lineLengths.reduce((a, b) => a + b, 0);
const squares = [1, 4, 9, 16, 25];
const TYPE_MS = 55;
const HOLD = 60; // ticks to show the output before typing again

function TypingCode({ live }: { live: boolean }) {
  const n = useTicker(TYPE_MS, live) % (codeLength + HOLD);
  const shown = Math.min(n, codeLength);
  const outputs = Math.max(0, Math.min(squares.length, Math.floor((n - codeLength) / 5)));
  let left = shown;
  // The caret sits on the line currently being typed.
  let caretLine = 0;
  for (let i = 0, start = 0; i < code.length; start += lineLengths[i], i++) if (shown > start) caretLine = i;

  return (
    <div className="font-mono text-[10px] leading-[1.7] sm:text-xs">
      {code.map((line, li) => (
        <p key={li} className="whitespace-pre">
          {line.map((tok, ti) => {
            const part = tok.t.slice(0, Math.max(0, left));
            left -= tok.t.length;
            return part ? (
              <span key={ti} className={tok.k ? "text-ember" : "text-ink"}>
                {part}
              </span>
            ) : null;
          })}
          {li === caretLine && shown < codeLength && (
            <span className="ml-px inline-block h-[1.1em] w-[0.5em] translate-y-[0.15em] animate-pulse bg-ember" />
          )}
          &#8203;
        </p>
      ))}
      <p className="mt-1 flex min-h-[1.7em] items-center gap-1.5 border-t border-line pt-1 text-ink-soft">
        <span className="text-forest">›</span>
        {squares.slice(0, outputs).map((s) => (
          <motion.span key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-semibold text-forest">
            {s}
          </motion.span>
        ))}
      </p>
    </div>
  );
}

/* ───────────── 2. Logic gate stepping through its truth table ───────────── */

const gates = {
  AND: { body: "M30 8 H50 A17 17 0 0 1 50 42 H30 Z", out: (a: number, b: number) => a & b },
  OR: { body: "M28 8 Q52 8 68 25 Q52 42 28 42 Q38 25 28 8 Z", out: (a: number, b: number) => a | b },
  XOR: { body: "M30 8 Q54 8 68 25 Q54 42 30 42 Q40 25 30 8 Z M23 8 Q33 25 23 42", out: (a: number, b: number) => a ^ b },
};
const gateOrder = ["AND", "OR", "XOR"] as const;

function Gate({ live }: { live: boolean }) {
  const step = useTicker(1300, live);
  const name = gateOrder[Math.floor(step / 4) % gateOrder.length];
  const row = step % 4;
  const a = (row >> 1) & 1;
  const b = row & 1;
  const out = gates[name].out(a, b);
  const wire = (on: number) => (on ? "var(--forest)" : "var(--ink-faint)");

  return (
    <div>
      <svg viewBox="0 0 100 50" className="w-full overflow-visible">
        <motion.path d="M4 15 H30" strokeWidth={2.4} fill="none" animate={{ stroke: wire(a) }} />
        <motion.path d="M4 35 H30" strokeWidth={2.4} fill="none" animate={{ stroke: wire(b) }} />
        <motion.path d="M68 25 H86" strokeWidth={2.4} fill="none" animate={{ stroke: wire(out) }} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.path
            key={name}
            d={gates[name].body}
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth={2.2}
            strokeLinejoin="round"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{ transformOrigin: "48px 25px" }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>
        <text x="47" y="28.5" textAnchor="middle" className="fill-ink font-mono" fontSize="8" fontWeight="600">
          {name}
        </text>
        {[
          { y: 15, v: a, l: "A" },
          { y: 35, v: b, l: "B" },
        ].map((p) => (
          <motion.circle key={p.l} cx={4} cy={p.y} r={3.6} animate={{ fill: p.v ? "var(--forest)" : "var(--paper)" }} stroke="var(--ink-faint)" strokeWidth={1.2} />
        ))}
        <motion.circle
          cx={91}
          cy={25}
          r={6}
          stroke="var(--ink-faint)"
          strokeWidth={1.2}
          animate={{ fill: out ? "var(--gold)" : "var(--paper)", scale: out ? [1, 1.25, 1] : 1 }}
          style={{ transformOrigin: "91px 25px" }}
          transition={{ duration: 0.4 }}
        />
      </svg>
      <p className="mt-1.5 font-mono text-[10px] text-ink-soft sm:text-xs">
        {a} {name} {b} = <span className={cn("font-semibold", out ? "text-forest" : "text-ink-faint")}>{out}</span>
      </p>
    </div>
  );
}

/* ───────────── 3. Denary → binary ───────────── */

const numbers = [5, 42, 99, 128, 200, 255, 13];
const places = [128, 64, 32, 16, 8, 4, 2, 1];

function Binary({ live }: { live: boolean }) {
  const value = numbers[useTicker(1900, live) % numbers.length];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            className="font-display text-xl leading-none tabular-nums sm:text-3xl"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
        <span className="font-mono text-[9px] text-ink-soft sm:text-[11px]">hex {value.toString(16).toUpperCase().padStart(2, "0")}</span>
      </div>
      <div className="mt-2 grid grid-cols-8 gap-[3px]">
        {places.map((p) => {
          const bit = value & p ? 1 : 0;
          return (
            <div key={p} className="text-center">
              <div className="relative h-5 [perspective:200px] sm:h-7">
                <AnimatePresence initial={false}>
                  <motion.span
                    key={bit}
                    className={cn(
                      "absolute inset-0 grid place-items-center rounded-[4px] font-mono text-[10px] font-semibold sm:text-sm",
                      bit ? "bg-ember text-paper" : "bg-paper-2 text-ink-faint",
                    )}
                    initial={{ rotateX: -90, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    exit={{ rotateX: 90, opacity: 0 }}
                    transition={{ duration: 0.35, delay: (7 - Math.log2(p)) * 0.03 }}
                  >
                    {bit}
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="mt-0.5 font-mono text-[6px] text-ink-faint sm:text-[8px]">{p}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── 4. Bubble sort ───────────── */

type Frame = { arr: number[]; a: number; sorted: number; pass: number };

/** Every comparison of a bubble sort on `start`, then a few frames holding the sorted list. */
function bubbleFrames(start: number[]): Frame[] {
  const arr = [...start];
  const frames: Frame[] = [];
  for (let pass = 0; pass < arr.length - 1; pass++) {
    let swapped = false;
    for (let i = 0; i < arr.length - 1 - pass; i++) {
      frames.push({ arr: [...arr], a: i, sorted: arr.length - pass, pass: pass + 1 });
      if (arr[i] > arr[i + 1]) {
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        swapped = true;
        frames.push({ arr: [...arr], a: i, sorted: arr.length - pass, pass: pass + 1 });
      }
    }
    if (!swapped) break;
  }
  for (let k = 0; k < 6; k++) frames.push({ arr: [...arr], a: -1, sorted: 0, pass: 0 });
  return frames;
}

function Sort({ live }: { live: boolean }) {
  const frames = useMemo(() => bubbleFrames([5, 2, 7, 1, 6, 3, 4]), []);
  const f = frames[useTicker(380, live) % frames.length];
  const max = Math.max(...f.arr);

  return (
    <div>
      <div className="flex h-12 items-end gap-[4px] sm:h-16">
        {f.arr.map((v, i) => (
          <motion.div
            key={v}
            layout
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className={cn(
              "flex-1 rounded-t-[3px] transition-colors duration-200",
              f.a === -1 || i >= f.sorted ? "bg-forest" : i === f.a || i === f.a + 1 ? "bg-ember" : "bg-ink/15",
            )}
            style={{ height: `${(v / max) * 100}%` }}
          />
        ))}
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-ink-soft sm:text-xs">
        {f.a === -1 ? (
          <span className="text-forest">sorted ✓</span>
        ) : (
          <Fragment>
            pass {f.pass} · {f.arr[f.a]} <span className="text-ember">⇄</span> {f.arr[f.a + 1]}
          </Fragment>
        )}
      </p>
    </div>
  );
}
