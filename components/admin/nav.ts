import {
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileStack,
  FileText,
  CreditCard,
  FolderOpen,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Mail,
  MapPin,
  Megaphone,
  Settings,
  ShoppingBag,
  UserPlus,
} from "lucide-react";
import type { NavGroup } from "@/components/dashboard/frame";

export const adminNav: NavGroup[] = [
  {
    group: "General",
    items: [{ label: "Overview", href: "/admin", icon: LayoutDashboard, description: "Everything at a glance." }],
  },
  {
    group: "Coaching",
    items: [
      { label: "Batches", href: "/admin/batches", icon: CalendarClock, description: "Class-wise batches, timings and seats at each centre." },
      { label: "Locations", href: "/admin/locations", icon: MapPin, description: "Coaching centres where batches run." },
      { label: "Students", href: "/admin/students", icon: GraduationCap, description: "Everyone who has joined, with class, centre, batch and contact details." },
      { label: "Enrollments", href: "/admin/enrollments", icon: UserPlus, description: "Batch admission requests and confirmed seats." },
      { label: "Attendance", href: "/admin/attendance", icon: ClipboardCheck, description: "Session-by-session attendance for each batch." },
      { label: "Tests & marks", href: "/admin/tests", icon: ClipboardList, description: "Class tests and mock exams — enter marks and publish results to students." },
      { label: "Homework", href: "/admin/homework", icon: BookMarked, description: "Set homework for batches, see submissions, mark and give feedback." },
      { label: "Revision", href: "/admin/revision", icon: FileStack, description: "Syllabus confidence and past paper practice for each batch." },
      { label: "Parent reports", href: "/admin/parent-reports", icon: FileText, description: "Monthly attendance, marks and fee summary for each parent, sent on WhatsApp." },
    ],
  },
  {
    group: "Publishing",
    items: [
      { label: "Books", href: "/admin/books", icon: BookOpen, description: "Publish books, covers, prices and key numbers." },
      { label: "Resources", href: "/admin/resources", icon: FolderOpen, description: "Notes, worksheets, past papers and video links for classes, batches or centres." },
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone, description: "Notices for students — schedule changes, exams and results." },
    ],
  },
  {
    group: "Inbox",
    items: [
      { label: "Messages", href: "/admin/messages", icon: Inbox, description: "Contact-form enquiries." },
      { label: "Subscribers", href: "/admin/subscribers", icon: Mail, description: "Newsletter sign-ups." },
    ],
  },
  {
    group: "Business",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag, description: "Book orders from the website and WhatsApp — payment and delivery status." },
      { label: "Payments", href: "/admin/payments", icon: CreditCard, description: "Tuition and book payments." },
      { label: "Reports", href: "/admin/reports", icon: BarChart3, description: "Enrollment, sales and attendance trends." },
      { label: "Settings", href: "/admin/settings", icon: Settings, soon: true, description: "Site details, WhatsApp number, prices and admins." },
    ],
  },
];

export const allAdminItems = adminNav.flatMap((g) => g.items);
export const soonItems = allAdminItems.filter((i) => i.soon);
