import type { HeadingSegment } from "@/components/motion/split-heading";
import type { Faq } from "./seo";
import type { BookLevel, ClassLevel } from "./types";

/**
 * Course guide pages (/o-level-computer-science, /a-level-computer-science) — written for
 * students and parents searching Google for a Computer Science course or teacher in Dhaka.
 */
export type Course = {
  path: string;
  /** Page title (before " · CS Masterclass") and meta description. */
  title: string;
  description: string;
  /** Full course name for structured data. */
  name: string;
  code: string;
  classes: ClassLevel[];
  /** Which books the page recommends. */
  bookLevel: BookLevel;
  /** Class level whose syllabus (lib/syllabus.ts) the page lists. */
  syllabusClass: ClassLevel;
  eyebrow: string;
  heading: HeadingSegment[];
  intro: string;
  overview: string[];
  facts: { label: string; value: string }[];
  papers: { name: string; title: string; detail: string; meta: string }[];
  faqs: Faq[];
};

export const oLevel: Course = {
  path: "/o-level-computer-science",
  title: "O Level & IGCSE Computer Science Coaching in Dhaka (0478 / 2210)",
  description:
    "Cambridge O Level 2210 and IGCSE 0478 Computer Science classes for Class 9 and 10 at Mirpur and Uttara, Dhaka — full syllabus, past-paper practice, mock exams and books.",
  name: "Cambridge IGCSE & O Level Computer Science (0478 / 2210)",
  code: "0478 / 2210",
  classes: ["9", "10"],
  bookLevel: "o-level",
  syllabusClass: "10",
  eyebrow: "Class 9 – 10 · Cambridge 0478 / 2210",
  heading: ["O Level & IGCSE Computer Science, ", { em: "taught to click." }],
  intro:
    "A two-year course for Cambridge IGCSE (0478) and O Level (2210) Computer Science, held in person at Mirpur and Uttara in Dhaka. Every topic is explained visually, practised with real exam questions and tested under exam conditions.",
  overview: [
    "Cambridge IGCSE 0478 and O Level 2210 share one syllabus: how computers represent and move data, the hardware and software inside them, the internet and cyber security, emerging technologies such as robotics and AI — and, in Paper 2, algorithms, pseudocode, programming, databases and Boolean logic.",
    "Classes run through Class 9 and Class 10. Each topic is first drawn and explained in plain words, then turned into pseudocode and Python, then practised with topical past-paper questions until the mark scheme makes sense. Timed mock exams in Class 10 build the speed and calm needed on exam day.",
    "Students follow their progress on the student dashboard — homework, test marks against the class average, attendance and a syllabus checklist — and parents receive a monthly report.",
  ],
  facts: [
    { label: "Classes", value: "Class 9 & 10" },
    { label: "Syllabus", value: "0478 / 2210" },
    { label: "Exam sessions", value: "May/June · Oct/Nov" },
    { label: "Where", value: "Mirpur & Uttara" },
  ],
  papers: [
    {
      name: "Paper 1",
      title: "Computer Systems",
      detail: "Data representation, data transmission, hardware, software, the internet and its uses, automated and emerging technologies.",
      meta: "1 hr 45 min · 75 marks · 50%",
    },
    {
      name: "Paper 2",
      title: "Algorithms, Programming & Logic",
      detail: "Algorithm design and problem-solving, pseudocode and flowcharts, trace tables, programming, databases and SQL, Boolean logic.",
      meta: "1 hr 45 min · 75 marks · 50%",
    },
  ],
  faqs: [
    {
      q: "Is O Level Computer Science 2210 the same as IGCSE 0478?",
      a: "Yes. Both follow the same Cambridge syllabus and sit the same two papers — 0478 is the IGCSE code and 2210 the O Level code. One class prepares you for either.",
    },
    {
      q: "How is O Level / IGCSE Computer Science examined?",
      a: "Two written papers of 1 hour 45 minutes and 75 marks each: Paper 1 Computer Systems and Paper 2 Algorithms, Programming and Logic. Each is worth 50% of the grade and there is no coursework.",
    },
    {
      q: "Which programming language is used?",
      a: "The exam is written in Cambridge pseudocode, so every algorithm is practised in pseudocode first. Programs are then written and run in Python so students see their ideas work.",
    },
    {
      q: "When should I start?",
      a: "Ideally at the start of Class 9. The syllabus is covered over Class 9 and Class 10, with revision, topical past papers and mock exams before the May/June or October/November exam.",
    },
    {
      q: "I follow Edexcel International GCSE Computer Science. Can I join?",
      a: "Yes. Pearson Edexcel International GCSE Computer Science (4CP0) covers much of the same content, and Edexcel students are welcome in the same batches.",
    },
    {
      q: "Do I need any programming experience before Class 9?",
      a: "No. The course starts from the very beginning — binary numbers, simple algorithms and first programs — and builds up step by step.",
    },
  ],
};

export const aLevel: Course = {
  path: "/a-level-computer-science",
  title: "AS & A Level Computer Science Coaching in Dhaka (9618)",
  description:
    "Cambridge International AS & A Level Computer Science 9618 classes for Class 11 and 12 at Mirpur and Uttara, Dhaka — theory, pseudocode, Python practicals and exam technique.",
  name: "Cambridge International AS & A Level Computer Science (9618)",
  code: "9618",
  classes: ["11", "12"],
  bookLevel: "a-level",
  syllabusClass: "12",
  eyebrow: "Class 11 – 12 · Cambridge 9618",
  heading: ["AS & A Level Computer Science, ", { em: "without the fog." }],
  intro:
    "Cambridge International AS & A Level Computer Science (9618) for Class 11 and 12, taught in person at Mirpur and Uttara in Dhaka — from processor fundamentals and databases to recursion, object-oriented programming and AI.",
  overview: [
    "9618 is a big step up from O Level: deeper theory in Paper 1 and 3, and real problem-solving in Papers 2 and 4, where students design algorithms, work with data structures and write working programs.",
    "AS (Class 11) covers information representation, communication, hardware, processor fundamentals, system software, security, ethics and databases, alongside algorithm design, data types and structures, programming and software development. A Level (Class 12) adds advanced theory — floating-point numbers, protocols, virtual machines, encryption and artificial intelligence — and further programming, including recursion, object-oriented programming and file handling.",
    "Lessons keep the same rhythm as every class here: picture the idea, explain it simply, then practise it with past-paper questions until it holds under exam pressure.",
  ],
  facts: [
    { label: "Classes", value: "Class 11 & 12" },
    { label: "Syllabus", value: "9618" },
    { label: "Exam sessions", value: "May/June · Oct/Nov" },
    { label: "Where", value: "Mirpur & Uttara" },
  ],
  papers: [
    {
      name: "Paper 1",
      title: "Theory Fundamentals",
      detail: "AS theory: data representation, networks, hardware, processor, system software, security, ethics and databases.",
      meta: "AS · 1 hr 30 min · 75 marks",
    },
    {
      name: "Paper 2",
      title: "Fundamental Problem-solving & Programming",
      detail: "Algorithms in pseudocode, data types and structures, programming and software development.",
      meta: "AS · 2 hr · 75 marks",
    },
    {
      name: "Paper 3",
      title: "Advanced Theory",
      detail: "Floating-point, communication protocols, virtual machines, encryption, AI and further theory.",
      meta: "A Level · 1 hr 30 min · 75 marks",
    },
    {
      name: "Paper 4",
      title: "Practical",
      detail: "Programming on a computer: abstract data types, recursion, object-oriented programming, file handling.",
      meta: "A Level · 2 hr 30 min · 75 marks",
    },
  ],
  faqs: [
    {
      q: "What is the difference between AS and A Level Computer Science?",
      a: "AS Level is the first half of the course (Papers 1 and 2) and is usually taken in Class 11. The full A Level adds Papers 3 and 4 in Class 12. Each of the four papers is worth 25% of the A Level.",
    },
    {
      q: "Do I need O Level Computer Science to take 9618?",
      a: "It helps but is not required. The AS course revisits the fundamentals — binary, logic gates, algorithms — before going deeper, so motivated students without O Level Computer Science can catch up.",
    },
    {
      q: "Which programming language is used for Paper 4?",
      a: "Cambridge allows Python, Java or Visual Basic .NET for the practical paper. Classes use pseudocode for Papers 2 and 4 and Python for the practical work.",
    },
    {
      q: "Is there a book for AS Computer Science 9618?",
      a: "Yes — the AS Computer Science Handbook is a student handbook and practice workbook written for the AS part of the 9618 syllabus.",
    },
    {
      q: "Are Edexcel A Level students welcome?",
      a: "Yes. Students following a Pearson Edexcel Computer Science course can join the Class 11 and 12 batches.",
    },
  ],
};
