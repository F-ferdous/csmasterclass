import { groupSessions } from "./coaching";
import { formatBdt } from "./pricing";
import { site } from "./site";
import type { Batch, Location } from "./types";

/**
 * WhatsApp welcome messages sent (one tap each) when a new student's registration is confirmed
 * in Admin → Enrollments. The password is never included — the student chose it at registration.
 */
export function welcomeMessages({
  name,
  phone,
  note,
  batch,
  location,
}: {
  name: string;
  phone: string;
  note?: string;
  batch?: Batch;
  location?: Location;
}) {
  const first = name.trim().split(" ")[0] || "there";
  const details = [
    batch ? `Class: ${batch.classLevel} · ${batch.name}` : "",
    location ? `Centre: ${[location.name, location.area].filter(Boolean).join(", ")}` : "",
    location?.address ? `Address: ${location.address}` : "",
    batch?.sessions.length ? `Classes: ${groupSessions(batch.sessions).map((g) => `${g.days} ${g.time}`).join(" · ")}` : "",
    batch && batch.fee > 0 ? `Monthly fee: ${formatBdt(batch.fee)}` : "",
  ].filter(Boolean);
  const extra = note?.trim() ? [``, note.trim()] : [];

  const student = [
    `Welcome to CS Masterclass, ${first}!`,
    ``,
    `Your seat is confirmed.`,
    ...details,
    ``,
    `Your student dashboard is ready. Sign in at ${site.url}/login with your mobile number${phone ? ` (${phone})` : ""} and the password you chose when you registered. Your timetable, homework, test results and study materials are all there.`,
    ...extra,
    ``,
    `See you in class!`,
    `— CS Masterclass`,
  ];

  const parent = [
    `Dear Parent,`,
    ``,
    `Welcome to CS Masterclass! ${name.trim() || "Your child"}'s seat is confirmed.`,
    ...details,
    ...extra,
    ``,
    `You will receive payment receipts and a monthly report on attendance and test results on this number. For any question, just reply to this message.`,
    ``,
    `Thank you.`,
    `— CS Masterclass`,
  ];

  return { student: student.join("\n"), parent: parent.join("\n") };
}
