import { CoursePage } from "@/components/sections/course-page";
import { oLevel } from "@/lib/courses";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: oLevel.title, description: oLevel.description, path: oLevel.path });

export default function OLevelPage() {
  return <CoursePage course={oLevel} />;
}
