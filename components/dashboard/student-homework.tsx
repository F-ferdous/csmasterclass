"use client";

import { motion } from "motion/react";
import { BookMarked, CheckCircle2, ExternalLink, FileText, Link2, Paperclip, Send } from "lucide-react";
import { useState } from "react";
import { adminInput, EmptyState, ErrorText, PageHeader, PrimaryButton, Spinner } from "@/components/admin/ui";
import { submitHomework } from "@/app/student-data";
import { ease } from "@/components/motion/reveal";
import { prettyDate } from "@/lib/attendance";
import { dueText, homeworkStatus, statusLabels, statusStyles, type Homework, type HomeworkStatus, type Submission } from "@/lib/homework";
import { contentTypeOf, fileAccept, formatBytes, isAllowedType, isWebUrl } from "@/lib/resources";
import { cn } from "@/lib/utils";
import { useMyHomework } from "./use-homework";
import { refreshStudentData } from "./use-student-data";

const MAX_UPLOAD = 25 * 1024 * 1024;
const order: HomeworkStatus[] = ["overdue", "todo", "submitted", "late", "marked"];

export function StudentHomework() {
  const list = useMyHomework();
  if (list === null) return <Spinner />;

  const rows = list.map((r) => ({ ...r, status: homeworkStatus(r.homework, r.submission) }));
  const todo = rows.filter((r) => r.status === "todo" || r.status === "overdue").sort((a, b) => a.homework.dueDate.localeCompare(b.homework.dueDate));
  const done = rows.filter((r) => !(r.status === "todo" || r.status === "overdue")).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.homework.dueDate.localeCompare(a.homework.dueDate));

  return (
    <div className="space-y-8">
      <PageHeader title="Homework" description="Tasks from your teacher. Submit a link to your work (Google Docs, Drive…) before the due date — your mark and feedback appear here." />
      {rows.length === 0 ? (
        <EmptyState icon={<BookMarked className="size-6" />} title="No homework yet" body="When your teacher sets homework for your batch, it'll appear here." />
      ) : (
        <>
          <section>
            <h2 className="mb-3 font-display text-xl">To do {todo.length > 0 && <span className="text-base text-ink-soft">· {todo.length}</span>}</h2>
            {todo.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-line px-5 py-6 text-center text-sm text-ink-soft">All done — nothing to submit right now.</p>
            ) : (
              <div className="grid gap-4">
                {todo.map((r, i) => (
                  <HomeworkCard key={`${r.homework.id}-${r.submission ? "s" : "n"}`} homework={r.homework} submission={r.submission} status={r.status} index={i} />
                ))}
              </div>
            )}
          </section>
          {done.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl">Submitted</h2>
              <div className="grid gap-4">
                {done.map((r, i) => (
                  <HomeworkCard key={`${r.homework.id}-${r.submission ? "s" : "n"}`} homework={r.homework} submission={r.submission} status={r.status} index={i} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function HomeworkCard({ homework: h, submission: s, status, index }: { homework: Homework; submission: Submission | null; status: HomeworkStatus; index: number }) {
  const [editing, setEditing] = useState(!s);
  const [link, setLink] = useState(s?.link ?? "");
  const [note, setNote] = useState(s?.note ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const marked = status === "marked";

  function pick(f: File | undefined) {
    if (!f) return;
    if (!isAllowedType(contentTypeOf(f))) return setError("Choose a PDF, Word document, image or text file.");
    if (f.size > MAX_UPLOAD) return setError(`That file is ${formatBytes(f.size)} — the limit is 25 MB. Share a Google Drive link instead.`);
    setError("");
    setFile(f);
  }

  async function submit() {
    if (link.trim() && !isWebUrl(link)) return setError("Paste the full link, starting with https://");
    if (!link.trim() && !file && !s?.file) return setError("Add a link to your work (or attach a file).");
    setSaving(true);
    setError("");
    const form = new FormData();
    form.set("homeworkId", h.id);
    form.set("link", link.trim());
    form.set("note", note.trim());
    if (file) form.set("file", new File([file], file.name, { type: contentTypeOf(file) }));
    try {
      const result = await submitHomework(form);
      if (!result.ok) {
        setError(result.error);
      } else {
        setFile(null);
        setEditing(false);
        await refreshStudentData("homework");
      }
    } catch {
      setError("Couldn't submit — check your connection and try again.");
    }
    setSaving(false);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3), ease }}
      className={cn("rounded-3xl border p-5 sm:p-6", status === "overdue" ? "border-ember/50 bg-ember/[0.04]" : "border-line")}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("rounded-full px-2.5 py-1 font-medium", statusStyles[status])}>{statusLabels[status]}</span>
        <span className={cn(status === "overdue" ? "text-ember" : "text-ink-soft")}>
          {status === "todo" || status === "overdue" ? dueText(h.dueDate) : `Due ${h.dueDate ? prettyDate(h.dueDate, "short") : "—"}`}
        </span>
        {h.maxMarks && <span className="ml-auto text-ink-faint">Out of {h.maxMarks}</span>}
      </div>
      <h3 className="mt-3 font-display text-xl">{h.title}</h3>
      {h.instructions && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{h.instructions}</p>}
      {h.link && (
        <a href={h.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4">
          <Link2 className="size-4" aria-hidden /> Open the worksheet
        </a>
      )}

      {marked && s && (
        <div className="mt-4 rounded-2xl border border-forest/30 bg-forest/[0.07] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-forest">
            <CheckCircle2 className="size-4" aria-hidden /> Marked
            {s.mark !== null && h.maxMarks ? (
              <span className="ml-auto font-display text-2xl tabular-nums text-ink">
                {s.mark}
                <span className="text-sm text-ink-soft">/{h.maxMarks}</span>
              </span>
            ) : null}
          </p>
          {s.feedback && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{s.feedback}</p>}
        </div>
      )}

      {s && !editing && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm">
          <span className="text-ink-soft">Your answer:</span>
          {s.link && (
            <a href={s.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 hover:border-ink">
              <ExternalLink className="size-3.5" aria-hidden /> Link
            </a>
          )}
          {s.file && (
            <a href={`/api/student/files/homework/${h.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 hover:border-ink">
              <FileText className="size-3.5" aria-hidden /> {s.file.name}
            </a>
          )}
          {!marked && (
            <button type="button" onClick={() => setEditing(true)} className="ml-auto text-sm underline underline-offset-4">
              Change answer
            </button>
          )}
        </div>
      )}

      {editing && !marked && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <label className="relative block">
            <span className="sr-only">Link to your work</span>
            <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link to your work — Google Doc, Drive, etc." className={cn(adminInput, "pl-10")} />
          </label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note for your teacher (optional)" className={adminInput} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
              <Paperclip className="size-4" aria-hidden /> {file ? `${file.name} (${formatBytes(file.size)})` : s?.file ? `Replace ${s.file.name}` : "Attach a file"}
              <input type="file" accept={fileAccept} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            <div className="flex gap-2">
              {s && (
                <button type="button" onClick={() => setEditing(false)} className="rounded-full px-4 py-2.5 text-sm text-ink-soft hover:text-ink">
                  Cancel
                </button>
              )}
              <PrimaryButton onClick={submit} loading={saving}>
                <Send className="size-4" /> {s ? "Update answer" : "Submit"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
      <ErrorText message={error} />
    </motion.article>
  );
}
