import type { Timestamp } from "firebase/firestore";
import type { ClassLevel } from "./types";

/** "m" Feb/March, "s" May/June, "w" Oct/Nov — Cambridge's own session letters. */
export type Session = "m" | "s" | "w";
export const sessionLabels: Record<Session, string> = { m: "Feb/Mar", s: "May/Jun", w: "Oct/Nov" };

export type PaperSpec = { paper: number; label: string; max: number };
type Catalogue = { code: string; firstYear: number; papers: PaperSpec[] };

const catalogues: Record<ClassLevel, Catalogue> = {
  "9": { code: "0478", firstYear: 2016, papers: [{ paper: 1, label: "Paper 1 · Computer Systems", max: 75 }, { paper: 2, label: "Paper 2 · Algorithms, Programming & Logic", max: 75 }] },
  "10": { code: "0478", firstYear: 2016, papers: [{ paper: 1, label: "Paper 1 · Computer Systems", max: 75 }, { paper: 2, label: "Paper 2 · Algorithms, Programming & Logic", max: 75 }] },
  "11": { code: "9618", firstYear: 2021, papers: [{ paper: 1, label: "Paper 1 · Theory Fundamentals", max: 75 }, { paper: 2, label: "Paper 2 · Problem-solving & Programming", max: 75 }] },
  "12": {
    code: "9618",
    firstYear: 2021,
    papers: [
      { paper: 1, label: "Paper 1 · Theory Fundamentals", max: 75 },
      { paper: 2, label: "Paper 2 · Problem-solving & Programming", max: 75 },
      { paper: 3, label: "Paper 3 · Advanced Theory", max: 75 },
      { paper: 4, label: "Paper 4 · Practical", max: 75 },
    ],
  },
};

export type PastPaper = { code: string; year: number; session: Session; paper: number; variant: number };

/** e.g. "2024-s-12" = May/June 2024, Paper 1 variant 2. */
export const paperCode = (p: Omit<PastPaper, "code">) => `${p.year}-${p.session}-${p.paper}${p.variant}`;
export const paperName = (p: PastPaper) => `${sessionLabels[p.session]} ${p.year} · Paper ${p.paper}${p.variant}`;

/** Papers are public a few months after each session; only list ones that are out. */
function released(year: number, session: Session, now: Date) {
  const out = session === "m" ? new Date(year, 4, 15) : session === "s" ? new Date(year, 7, 20) : new Date(year + 1, 0, 20);
  return out <= now;
}

/** Every released paper for a class, newest session first. Feb/March has only variant 2. */
export function papersFor(classLevel: ClassLevel | "", now = new Date()) {
  if (!classLevel) return null;
  const cat = catalogues[classLevel];
  const sessions: { year: number; session: Session }[] = [];
  for (let year = now.getFullYear(); year >= cat.firstYear; year--) {
    for (const session of ["w", "s", "m"] as Session[]) if (released(year, session, now)) sessions.push({ year, session });
  }
  return {
    code: cat.code,
    papers: cat.papers,
    sessions: sessions.map((s) => ({
      ...s,
      byPaper: cat.papers.map((spec) => ({
        spec,
        items: (s.session === "m" ? [2] : [1, 2, 3]).map((variant) => {
          const p = { ...s, paper: spec.paper, variant };
          return { ...p, code: paperCode(p) } as PastPaper;
        }),
      })),
    })),
  };
}

export function parsePaperCode(code: string): PastPaper | null {
  const m = code.match(/^(\d{4})-([msw])-(\d)(\d)$/);
  return m ? { code, year: +m[1], session: m[2] as Session, paper: +m[3], variant: +m[4] } : null;
}

/** pastPapers/{uid}.papers[code] — written by the student. score null = done but not marked. */
export type PaperAttempt = { score: number | null; max: number; at: Date | null };

export function normalizePastPapers(raw: Record<string, unknown> | undefined): Record<string, PaperAttempt> {
  const out: Record<string, PaperAttempt> = {};
  for (const [code, v] of Object.entries((raw?.papers ?? {}) as Record<string, Record<string, unknown>>)) {
    if (!v || !parsePaperCode(code)) continue;
    out[code] = {
      score: typeof v.score === "number" ? v.score : null,
      max: typeof v.max === "number" && v.max > 0 ? v.max : 75,
      at: (v.at as Timestamp | undefined)?.toDate?.() ?? null,
    };
  }
  return out;
}

/** Number done, and average % of the marked ones. */
export function attemptStats(attempts: Record<string, PaperAttempt>) {
  const list = Object.values(attempts);
  const marked = list.filter((a) => a.score !== null);
  return {
    done: list.length,
    average: marked.length ? Math.round((marked.reduce((s, a) => s + a.score! / a.max, 0) / marked.length) * 100) : null,
    last: list.reduce<Date | null>((d, a) => (a.at && (!d || a.at > d) ? a.at : d), null),
  };
}
