/**
 * Teaching + success content. Replace the sample copy with your own story.
 */

export const stats = [
  { value: 10, suffix: "+", label: "Years in the classroom" },
  { value: 12000, suffix: "+", label: "Students taught" },
  { value: 5, suffix: "", label: "Books published" },
  { value: 96, suffix: "%", label: "Students scoring A*–B" },
];

export const topics = [
  "Data Representation",
  "Data Transmission",
  "Hardware",
  "Software",
  "The Internet",
  "Emerging Technologies",
  "Algorithm Design",
  "Programming",
  "Databases",
  "Boolean Logic",
];

export const principles = [
  {
    no: "01",
    title: "Picture it first",
    body: "Every abstract idea starts as a drawing — a queue of people, a stack of plates, a map of roads. Students see the shape of a concept before they meet its syntax.",
  },
  {
    no: "02",
    title: "Explain it simply",
    body: "If it can't be said in plain words, it isn't understood yet. Lessons are built around one clear sentence, then layered with depth only when it earns its place.",
  },
  {
    no: "03",
    title: "Try it, then trust it",
    body: "Understanding is proven at the keyboard and on paper. Short, deliberate practice loops turn shaky knowledge into calm, exam-day confidence.",
  },
];

export const subjects = [
  { title: "Data Representation", detail: "Binary, hexadecimal, text, sound and images — and how data is compressed.", level: "Paper 1" },
  { title: "Data Transmission", detail: "Packets, USB and serial links, error detection and encryption.", level: "Paper 1" },
  { title: "Hardware & Software", detail: "The CPU, memory, storage, operating systems and translators.", level: "Paper 1" },
  { title: "The Internet & Emerging Tech", detail: "The web, cyber security, automation, robotics and AI.", level: "Paper 1" },
  { title: "Algorithms & Programming", detail: "Problem-solving, pseudocode, flowcharts, trace tables and code.", level: "Paper 2" },
  { title: "Databases & Boolean Logic", detail: "SQL queries, logic gates, truth tables and logic circuits.", level: "Paper 2" },
];

export const formats = [
  { title: "Classroom", body: "Structured term-long courses with weekly practice and progress checks." },
  { title: "Live online", body: "Small interactive cohorts with shared code, whiteboards and recordings." },
  { title: "One-to-one", body: "Focused mentoring that starts exactly where the student is." },
  { title: "Workshops", body: "Intensive revision days and teacher-training sessions for schools." },
];

export const lessonFlow = [
  { step: "Hook", body: "A real-world puzzle that makes the idea necessary." },
  { step: "Model", body: "A visual model on the board — no code yet." },
  { step: "Build", body: "Translate the model into pseudocode, then into Python." },
  { step: "Practise", body: "Graded exercises, from guided to independent." },
  { step: "Reflect", body: "One-line summaries and exam-style questions to lock it in." },
];

export const testimonials = [
  {
    quote:
      "I went from dreading programming to choosing it for university. Every lesson felt like a lightbulb switching on.",
    name: "Ayesha R.",
    detail: "A* in IGCSE Computer Science (0478)",
  },
  {
    quote:
      "The way recursion was explained with a stack of plates — I still think about it. My grade jumped two levels in one term.",
    name: "Tanvir H.",
    detail: "Improved from C to A in IGCSE",
  },
  {
    quote:
      "Calm, patient, and incredibly clear. My son finally understands why the code works, not just how to copy it.",
    name: "Parent of a Year 11 student",
    detail: "Online cohort, 2025",
  },
  {
    quote:
      "The revision workshop was the most useful day of my exam season. I walked in knowing exactly how to earn every mark.",
    name: "Nadia K.",
    detail: "A in O Level Computer Science (2210)",
  },
  {
    quote:
      "As a new teacher, the training sessions reshaped how I plan lessons. My students noticed the difference immediately.",
    name: "Imran S.",
    detail: "Secondary school CS teacher",
  },
  {
    quote:
      "The books sit on my desk all year. They read like a friendly teacher sitting next to you.",
    name: "Rafi M.",
    detail: "First-year engineering student",
  },
];

export const milestones = [
  { year: "2015", title: "First classroom", body: "Began teaching computer science to a class of 28 curious teenagers." },
  { year: "2017", title: "Online cohorts", body: "Launched live online classes, reaching students across the country." },
  { year: "2019", title: "First book", body: "Published a beginner's guide that quickly became a classroom favourite." },
  { year: "2021", title: "1,000 A* grades", body: "Celebrated a thousand top grades earned by former students." },
  { year: "2023", title: "Teacher training", body: "Started mentoring other teachers through workshops and school programmes." },
  { year: "2026", title: "The 0478 / 2210 series", body: "Published a five-book series: handbook, topical notes, question bank, past papers and mock exams." },
];

export const results = [
  { value: "1,800+", label: "A* / A grades achieved by former students" },
  { value: "240+", label: "Students admitted to CS & engineering degrees" },
  { value: "4.9/5", label: "Average rating across 900+ course reviews" },
];

export const recognitions = [
  "Outstanding Educator Award — Regional Education Forum",
  "Featured speaker — National Computing Teachers' Conference",
  "Curriculum advisor for partner schools",
  "Bestselling title in the Computer Science category",
];

/** In-person coaching — shown on the Teaching page (#coaching). */
export const coaching = {
  batches: [
    { grade: "9", level: "O Level / IGCSE" },
    { grade: "10", level: "O Level / IGCSE" },
    { grade: "11", level: "AS / A Level" },
    { grade: "12", level: "AS / A Level" },
  ],
  boards: ["Cambridge", "Edexcel"],
  benefits: [
    { title: "Complete syllabus coverage", body: "Every topic taught in order, so nothing is left to chance before the exam." },
    { title: "Concepts before code", body: "Diagrams and plain-language explanations first — then pseudocode and programming." },
    { title: "Topic-by-topic practice", body: "Real past-paper questions after every topic, organised exactly like the syllabus." },
    { title: "Regular mock exams", body: "Timed papers under exam conditions, with feedback on how marks are won and lost." },
    { title: "Exam technique", body: "Mark schemes decoded, command words explained and answer structures practised." },
    { title: "Personal attention", body: "Questions answered, weak areas tracked, and help given until every idea clicks." },
  ],
};

/** The 0478 / 2210 bundle. Savings are calculated from the individual book prices. */
export const bundle = {
  title: "The Complete Bundle",
  /** The books it includes (the AS 9618 handbook is sold on its own). */
  slugs: ["complete-student-handbook", "topical-notes-practice-questions", "topical-question-bank", "past-paper-qp-booklet", "mock-exam-papers"],
  options: [
    { kind: "soft" as const, bdt: 1999, usd: 20 },
    { kind: "hard" as const, bdt: 4500 },
  ],
};
