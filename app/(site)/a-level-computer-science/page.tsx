import { CoursePage } from "@/components/sections/course-page";
import { aLevel } from "@/lib/courses";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: aLevel.title, description: aLevel.description, path: aLevel.path });

export default function ALevelPage() {
  return <CoursePage course={aLevel} />;
}
