import { BookOpen, CalendarDays, ClipboardCheck, CreditCard, FolderOpen, LayoutDashboard, Megaphone, TrendingUp, UserRound } from "lucide-react";
import type { NavGroup } from "./frame";

export const studentNav: NavGroup[] = [
  {
    group: "My learning",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard, description: "Your next class, batch and centre at a glance." },
      { label: "Schedule", href: "/dashboard/schedule", icon: CalendarDays, description: "Your weekly class timetable and centre details." },
      { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone, description: "Notices from your teacher — schedule changes, exams and results." },
      { label: "Study materials", href: "/dashboard/materials", icon: FolderOpen, description: "Notes, worksheets, past papers and videos for your class and batch." },
      { label: "Books", href: "/dashboard/books", icon: BookOpen, description: "Books for your syllabus, with prices and ordering." },
      { label: "Payments", href: "/dashboard/payments", icon: CreditCard, description: "Your tuition fees and book purchases." },
    ],
  },
  {
    group: "Coming soon",
    items: [

      { label: "Attendance", href: "/dashboard/attendance", icon: ClipboardCheck, soon: true, description: "Your attendance record for every class." },
      { label: "Progress", href: "/dashboard/progress", icon: TrendingUp, soon: true, description: "Test scores and mock exam results over time." },
    ],
  },
  {
    group: "Account",
    items: [{ label: "Profile", href: "/dashboard/profile", icon: UserRound, description: "Your details, class, centre and batch." }],
  },
];

export const studentSoonItems = studentNav.flatMap((g) => g.items).filter((i) => i.soon);
