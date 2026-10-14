import { attendanceRate, markCounts, prettyDate, type Mark } from "./attendance";
import { bdt, monthLabel, type DueStatus } from "./payments";
import { approxGrade, percent } from "./tests";

export type ReportTest = { title: string; paper: string; date: string; score: number | null; max: number; classAverage: number | null };

export type ReportData = {
  name: string;
  /** e.g. "Class 10 · Batch A, Mirpur Academia" */
  batchLine: string;
  month: string; // YYYY-MM
  attendance: { date: string; mark: Mark }[];
  tests: ReportTest[];
  tuition: { status: DueStatus; paid: number; remaining: number } | null;
  comment: string;
};

/** Attendance summary line used in the admin list too. */
export function attendanceSummary(list: { mark: Mark }[]) {
  const counts = markCounts(list.map((a) => a.mark));
  const held = list.length - counts.excused;
  const rate = attendanceRate(list.map((a) => a.mark));
  return { counts, held, attended: counts.present + counts.late, rate };
}

const day = (d: string) => prettyDate(d, "short");

/** The monthly report as a WhatsApp message (*bold* is WhatsApp formatting). */
export function monthlyReportMessage(d: ReportData) {
  const lines = ["Dear Parent,", "", `Here is the monthly report for *${d.name}* — ${monthLabel(d.month)}.`];
  if (d.batchLine) lines.push(d.batchLine);

  lines.push("", "*Attendance*");
  if (!d.attendance.length) lines.push("No classes recorded this month.");
  else {
    const a = attendanceSummary(d.attendance);
    lines.push(`Attended ${a.attended} of ${a.held} classes${a.rate === null ? "" : ` (${a.rate}%)`}.`);
    const by = (m: Mark) => d.attendance.filter((x) => x.mark === m).map((x) => day(x.date)).reverse();
    if (a.counts.absent) lines.push(`Absent: ${by("absent").join(", ")}`);
    if (a.counts.late) lines.push(`Late: ${by("late").join(", ")}`);
    if (a.counts.excused) lines.push(`Excused: ${by("excused").join(", ")}`);
  }

  lines.push("", "*Test results*");
  if (!d.tests.length) lines.push("No tests this month.");
  for (const t of d.tests) {
    const name = `${t.title}${t.paper ? ` (${t.paper})` : ""}`;
    if (t.score === null) lines.push(`• ${name}: absent`);
    else {
      const pct = percent(t.score, t.max);
      lines.push(`• ${name}: ${t.score}/${t.max} — ${pct}%, approx. grade ${approxGrade(pct)}${t.classAverage !== null ? ` (class average ${t.classAverage}%)` : ""}`);
    }
  }

  if (d.tuition) {
    lines.push("", `*Tuition — ${monthLabel(d.month)}*`);
    const t = d.tuition;
    lines.push(
      t.status === "paid"
        ? "Paid in full. Thank you!"
        : t.status === "waived"
          ? "Waived."
          : t.status === "partial"
            ? `${bdt(t.paid)} received, ${bdt(t.remaining)} still due.`
            : `Not paid yet — ${bdt(t.remaining)} due.`,
    );
  }

  if (d.comment.trim()) lines.push("", "*Teacher's comment*", d.comment.trim());
  lines.push("", "Thank you.", "— CS Masterclass");
  return lines.join("\n");
}
