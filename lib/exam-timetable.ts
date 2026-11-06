/**
 * Cambridge June 2027 exam timetable — Computer Science papers only.
 *
 * Source: Cambridge International "Final Exam Timetable June 2027, Administrative zone 4"
 * (the zone Bangladesh sits in — it is the timetable with O Level Bangladesh Studies and Bengali).
 * Checked against the PDF on 2026-11-07. Cambridge may still change dates; re-check the PDF
 * (`examTimetable.sourceUrl`) before each series and update the rows here.
 */

export type ExamSession = "AM" | "PM";

export type ExamPaper = {
  paper: string;
  name: string;
  /** Component codes, e.g. ["2210/12", "0478/12"]. */
  codes: string[];
  /** ISO date (YYYY-MM-DD). */
  date: string;
  duration: string;
  /** null = a test-date-window paper: the date is fixed, the centre sets the time. */
  session: ExamSession | null;
};

export type ExamLevel = {
  id: "o-level" | "as-level" | "a-level";
  label: string;
  subject: string;
  syllabus: string;
  classes: string;
  coursePath: string;
  papers: ExamPaper[];
};

export const examTimetable = {
  series: "June 2027",
  zone: "Administrative zone 4",
  sourceUrl: "https://www.cambridgeinternational.org/Images/766282-june-2027-zone-4-timetable.pdf",
  checkedOn: "7 November 2026",
  levels: [
    {
      id: "o-level",
      label: "O Level & IGCSE",
      subject: "Computer Science",
      syllabus: "2210 / 0478",
      classes: "Class 9 – 10",
      coursePath: "/o-level-computer-science",
      papers: [
        { paper: "Paper 1", name: "Computer Systems", codes: ["2210/12", "0478/12"], date: "2027-05-10", duration: "1h 45m", session: "AM" },
        { paper: "Paper 2", name: "Algorithms, Programming and Logic", codes: ["2210/22", "0478/22"], date: "2027-05-19", duration: "1h 45m", session: "AM" },
      ],
    },
    {
      id: "as-level",
      label: "AS Level",
      subject: "Computer Science",
      syllabus: "9618",
      classes: "Class 11",
      coursePath: "/a-level-computer-science",
      papers: [
        { paper: "Paper 1", name: "Theory Fundamentals", codes: ["9618/12"], date: "2027-05-10", duration: "1h 30m", session: "PM" },
        { paper: "Paper 2", name: "Fundamental Problem-solving and Programming Skills", codes: ["9618/22"], date: "2027-05-13", duration: "2h", session: "PM" },
      ],
    },
    {
      id: "a-level",
      label: "A Level",
      subject: "Computer Science",
      syllabus: "9618",
      classes: "Class 12",
      coursePath: "/a-level-computer-science",
      papers: [
        { paper: "Paper 3", name: "Advanced Theory", codes: ["9618/32"], date: "2027-05-21", duration: "1h 30m", session: "PM" },
        { paper: "Paper 4", name: "Practical", codes: ["9618/42"], date: "2027-05-19", duration: "2h 30m", session: null },
      ],
    },
  ] as ExamLevel[],
};

export const sessionLabel = (s: ExamSession | null) =>
  s === "AM" ? "Morning (AM)" : s === "PM" ? "Afternoon (PM)" : "Set by your centre";

/** "Monday, 10 May 2027" — parsed as a plain calendar date so time zones never shift it. */
export function formatExamDate(iso: string, style: "long" | "short" = "long") {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: style === "long" ? "long" : "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
