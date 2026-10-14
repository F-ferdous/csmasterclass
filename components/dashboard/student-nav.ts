import { BookMarked, BookOpen, CalendarDays, ClipboardCheck, CreditCard, FileStack, FolderOpen, LayoutDashboard, ListChecks, Megaphone, TrendingUp, UserRound } from "lucide-react";
import type { NavGroup } from "./frame";

export const studentNav: NavGroup[] = [
  {
    group: "My learning",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard, description: "Your next class, batch and centre at a glance." },
      { label: "Schedule", href: "/dashboard/schedule", icon: CalendarDays, description: "Your weekly class timetable and centre details." },
      { label: "Homework", href: "/dashboard/homework", icon: BookMarked, description: "Tasks from your teacher — submit before the due date and see your feedback." },
      { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone, description: "Notices from your teacher — schedule changes, exams and results." },
      { label: "Study materials", href: "/dashboard/materials", icon: FolderOpen, description: "Notes, worksheets, past papers and videos for your class and batch." },
    ],
  },
  {
    group: "My progress",
    items: [
      { label: "Attendance", href: "/dashboard/attendance", icon: ClipboardCheck, description: "Your attendance record for every class." },
      { label: "Progress", href: "/dashboard/progress", icon: TrendingUp, description: "Your test and mock exam results, compared with your class." },
      { label: "Syllabus", href: "/dashboard/syllabus", icon: ListChecks, description: "Rate your confidence on every syllabus topic." },
      { label: "Past papers", href: "/dashboard/past-papers", icon: FileStack, description: "Track the past papers you've practised and your scores." },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "Books", href: "/dashboard/books", icon: BookOpen, description: "Books for your syllabus, with prices and ordering." },
      { label: "Payments", href: "/dashboard/payments", icon: CreditCard, description: "Your tuition fees and book purchases." },
      { label: "Profile", href: "/dashboard/profile", icon: UserRound, description: "Your details, class, centre and batch." },
    ],
  },
];
