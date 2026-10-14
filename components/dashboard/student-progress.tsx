"use client";

import { motion } from "motion/react";
import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { ChartCard, LineChart, StatTile } from "@/components/admin/charts";
import { EmptyState, PageHeader, Spinner } from "@/components/admin/ui";
import { ease } from "@/components/motion/reveal";
import { prettyDate } from "@/lib/attendance";
import { approxGrade, percent, testTypeLabels, testTypes, testTypeStyles, type MyResult, type TestType } from "@/lib/tests";
import { cn } from "@/lib/utils";
import { useMyResults } from "./use-my-records";

const CHART_TESTS = 12;

export function StudentProgress() {
  const results = useMyResults();
  const [type, setType] = useState<TestType | "all">("all");

  if (results === null) return <Spinner />;

  const used = testTypes.filter((t) => results.some((r) => r.type === t));
  const shown = type === "all" ? results : results.filter((r) => r.type === type);
  const sat = shown.filter((r) => r.score !== null);
  const pcts = sat.map((r) => percent(r.score!, r.max));
  const average = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const best = pcts.length ? Math.max(...pcts) : null;
  // Change between the last two tests sat.
  const delta = pcts.length >= 2 ? pcts.at(-1)! - pcts.at(-2)! : null;

  // Chart: the latest tests, labelled by date (made unique when two share a day).
  const recent = shown.slice(-CHART_TESTS);
  const seen = new Map<string, number>();
  const labels = recent.map((r) => {
    const base = r.date ? prettyDate(r.date, "short") : r.title;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base} (${n})` : base;
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Progress" description="Your marks in class tests, quizzes and mock exams, compared with your class." />

      {results.length === 0 ? (
        <EmptyState icon={<TrendingUp className="size-6" />} title="No results yet" body="When your teacher publishes marks for a test you sat, they'll appear here with the class average." />
      ) : (
        <>
          {used.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {(["all", ...used] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", type === t ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
                >
                  {t === "all" ? "All tests" : testTypeLabels[t]}
                </button>
              ))}
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Average score"
              value={average === null ? "—" : `${average}%`}
              delta={delta}
              deltaLabel={delta === null ? undefined : `${Math.abs(delta)} pts vs previous test`}
            />
            <StatTile label="Approx. grade" value={average === null ? "—" : approxGrade(average)} />
            <StatTile label="Best score" value={best === null ? "—" : `${best}%`} />
            <StatTile label="Tests" value={`${sat.length}${shown.length > sat.length ? ` (+${shown.length - sat.length} missed)` : ""}`} />
          </motion.div>

          {recent.length > 1 && (
            <ChartCard
              title="Your scores over time"
              subtitle={shown.length > CHART_TESTS ? `Your last ${CHART_TESTS} tests` : undefined}
              table={{
                head: ["Test", "Date", "Score", "You", "Class average"],
                rows: recent.map((r) => [
                  r.title,
                  r.date ? prettyDate(r.date, "short") : "—",
                  r.score === null ? "Absent" : `${r.score}/${r.max}`,
                  r.score === null ? "—" : `${percent(r.score, r.max)}%`,
                  r.classAverage === null ? "—" : `${r.classAverage}%`,
                ]),
              }}
            >
              <LineChart labels={labels} values={recent.map((r) => (r.score === null ? null : percent(r.score, r.max)))} label="Your score" />
            </ChartCard>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {[...shown].reverse().map((r, i) => (
              <ResultCard key={r.testId} result={r} index={i} />
            ))}
          </div>
          <p className="text-xs text-ink-faint">Grades are approximate — real Cambridge grade boundaries change every exam session.</p>
        </>
      )}
    </div>
  );
}

function ResultCard({ result: r, index }: { result: MyResult; index: number }) {
  const you = r.score === null ? null : percent(r.score, r.max);
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.4), ease }}
      className="rounded-3xl border border-line p-5"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("rounded-full px-2.5 py-0.5 font-medium", testTypeStyles[r.type])}>{testTypeLabels[r.type]}</span>
        {r.paper && <span className="text-ink-soft">{r.paper}</span>}
        <span className="ml-auto text-ink-faint">{r.date ? prettyDate(r.date, "short") : ""}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <h3 className="font-display text-lg leading-snug">{r.title}</h3>
        {you === null ? (
          <span className="shrink-0 rounded-full bg-ember/15 px-3 py-1 text-sm text-ember">Absent</span>
        ) : (
          <p className="shrink-0 text-right">
            <span className="font-display text-3xl tabular-nums">{r.score}</span>
            <span className="text-sm text-ink-soft">/{r.max}</span>
          </p>
        )}
      </div>
      {you !== null && (
        <div className="mt-4 space-y-2">
          <Bar label="You" value={you} extra={`approx. ${approxGrade(you)}`} className="bg-forest" />
          {r.classAverage !== null && <Bar label="Class average" value={r.classAverage} className="bg-ink-faint/60" />}
          {r.highest !== null && <p className="text-xs text-ink-faint">Highest in class: {r.highest}/{r.max}</p>}
        </div>
      )}
    </motion.article>
  );
}

function Bar({ label, value, extra, className }: { label: string; value: number; extra?: string; className: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className="tabular-nums">
          {value}%{extra ? <span className="text-ink-faint"> · {extra}</span> : null}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-2" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <motion.div className={cn("h-full rounded-full", className)} initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ duration: 0.9, ease }} />
      </div>
    </div>
  );
}
