"use client";

import { useEffect, useState } from "react";

/** "in 184 days" / "Today" / "Done" — worked out in the visitor's browser (Dhaka date), so cached pages stay correct. */
export function ExamDaysLeft({ date, className }: { date: string; className?: string }) {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
      const diff = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
      setDays(Math.round(diff));
    };
    update();
    const id = setInterval(update, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [date]);

  if (days === null) return <span className={className} aria-hidden>&nbsp;</span>;
  const text = days > 1 ? `in ${days} days` : days === 1 ? "Tomorrow" : days === 0 ? "Today" : "Done";
  return <span className={className}>{text}</span>;
}
