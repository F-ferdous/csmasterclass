import type { Timestamp } from "firebase/firestore";
import type { ClassLevel } from "./types";

/**
 * Syllabus topics students rate their confidence on. Topic ids are stored in
 * syllabusProgress/{uid}, so keep existing ids when editing titles.
 */
export type SyllabusTopic = { id: string; title: string; unit: string; paper: string };
export type Syllabus = { code: string; name: string; topics: SyllabusTopic[] };

const t = (paper: string, unit: string, list: [string, string][]): SyllabusTopic[] => list.map(([id, title]) => ({ id, title, unit, paper }));

/** Cambridge IGCSE / O Level Computer Science 0478 / 2210. */
const igcse: Syllabus = {
  code: "0478 / 2210",
  name: "IGCSE / O Level Computer Science",
  topics: [
    ...t("Paper 1", "1 Data representation", [
      ["igcse-1.1", "Number systems (binary, denary, hexadecimal, two's complement)"],
      ["igcse-1.2", "Text, sound and images"],
      ["igcse-1.3", "Data storage and file compression"],
    ]),
    ...t("Paper 1", "2 Data transmission", [
      ["igcse-2.1", "Types and methods of data transmission"],
      ["igcse-2.2", "Methods of error detection"],
      ["igcse-2.3", "Encryption"],
    ]),
    ...t("Paper 1", "3 Hardware", [
      ["igcse-3.1", "Computer architecture"],
      ["igcse-3.2", "Input and output devices"],
      ["igcse-3.3", "Data storage"],
      ["igcse-3.4", "Network hardware"],
    ]),
    ...t("Paper 1", "4 Software", [
      ["igcse-4.1", "Types of software and interrupts"],
      ["igcse-4.2", "Programming languages, translators and IDEs"],
    ]),
    ...t("Paper 1", "5 The internet and its uses", [
      ["igcse-5.1", "The internet and the World Wide Web"],
      ["igcse-5.2", "Digital currency"],
      ["igcse-5.3", "Cyber security"],
    ]),
    ...t("Paper 1", "6 Automated and emerging technologies", [
      ["igcse-6.1", "Automated systems"],
      ["igcse-6.2", "Robotics"],
      ["igcse-6.3", "Artificial intelligence"],
    ]),
    ...t("Paper 2", "7 Algorithm design and problem-solving", [
      ["igcse-7.1", "Program development life cycle and decomposition"],
      ["igcse-7.2", "Standard methods: linear search, bubble sort, totalling, counting"],
      ["igcse-7.3", "Validation and verification"],
      ["igcse-7.4", "Test data and trace tables"],
      ["igcse-7.5", "Writing, correcting and completing algorithms"],
    ]),
    ...t("Paper 2", "8 Programming", [
      ["igcse-8.1", "Programming concepts (variables, selection, iteration, procedures, functions)"],
      ["igcse-8.2", "Arrays (1D and 2D)"],
      ["igcse-8.3", "File handling"],
    ]),
    ...t("Paper 2", "9 Databases", [["igcse-9.1", "Databases and SQL"]]),
    ...t("Paper 2", "10 Boolean logic", [
      ["igcse-10.1", "Logic gates and symbols"],
      ["igcse-10.2", "Truth tables, logic expressions and circuits"],
    ]),
  ],
};

/** Cambridge International AS & A Level Computer Science 9618. */
const asLevel: SyllabusTopic[] = [
  ...t("Paper 1", "AS theory", [
    ["as-1", "Information representation"],
    ["as-2", "Communication"],
    ["as-3", "Hardware"],
    ["as-4", "Processor fundamentals"],
    ["as-5", "System software"],
    ["as-6", "Security, privacy and data integrity"],
    ["as-7", "Ethics and ownership"],
    ["as-8", "Databases"],
  ]),
  ...t("Paper 2", "AS problem-solving and programming", [
    ["as-9", "Algorithm design and problem-solving"],
    ["as-10", "Data types and structures"],
    ["as-11", "Programming"],
    ["as-12", "Software development"],
  ]),
];

const a2Level: SyllabusTopic[] = [
  ...t("Paper 3", "A Level theory", [
    ["a2-13", "Data representation"],
    ["a2-14", "Communication and internet technologies"],
    ["a2-15", "Hardware and virtual machines"],
    ["a2-16", "System software"],
    ["a2-17", "Security"],
    ["a2-18", "Artificial intelligence"],
  ]),
  ...t("Paper 4", "A Level practical", [
    ["a2-19", "Computational thinking and problem-solving"],
    ["a2-20", "Further programming"],
  ]),
];

const syllabi: Record<ClassLevel, Syllabus> = {
  "9": igcse,
  "10": igcse,
  "11": { code: "9618", name: "AS Level Computer Science", topics: asLevel },
  "12": { code: "9618", name: "A Level Computer Science", topics: [...asLevel, ...a2Level] },
};

export const syllabusFor = (classLevel: ClassLevel | "") => (classLevel ? syllabi[classLevel] : null);

/** 0 = not rated yet. */
export type Confidence = 0 | 1 | 2 | 3;
export const confidenceLevels: Exclude<Confidence, 0>[] = [1, 2, 3];
export const confidenceLabels: Record<Confidence, string> = { 0: "Not rated", 1: "Need help", 2: "Getting there", 3: "Confident" };
export const confidenceStyles: Record<Confidence, { on: string; dot: string }> = {
  0: { on: "border-line bg-paper-2 text-ink-soft", dot: "bg-paper-3" },
  1: { on: "border-ember bg-ember text-white", dot: "bg-ember" },
  2: { on: "border-gold bg-gold text-ink", dot: "bg-gold" },
  3: { on: "border-forest bg-forest text-forest-ink", dot: "bg-forest" },
};

/** syllabusProgress/{uid}.topics[topicId] — written by the student. */
export type TopicProgress = { confidence: Confidence; updatedAt: Date | null };

export function normalizeSyllabusProgress(raw: Record<string, unknown> | undefined): Record<string, TopicProgress> {
  const out: Record<string, TopicProgress> = {};
  for (const [id, v] of Object.entries((raw?.topics ?? {}) as Record<string, Record<string, unknown>>)) {
    const c = v?.confidence;
    if (c === 1 || c === 2 || c === 3) out[id] = { confidence: c, updatedAt: (v.updatedAt as Timestamp | undefined)?.toDate?.() ?? null };
  }
  return out;
}

/** Topics grouped by unit, in syllabus order. */
export function unitsOf(s: Syllabus) {
  const units: { unit: string; paper: string; topics: SyllabusTopic[] }[] = [];
  for (const topic of s.topics) {
    const last = units.at(-1);
    if (last?.unit === topic.unit) last.topics.push(topic);
    else units.push({ unit: topic.unit, paper: topic.paper, topics: [topic] });
  }
  return units;
}
