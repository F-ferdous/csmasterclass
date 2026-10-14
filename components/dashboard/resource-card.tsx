"use client";

import { getDownloadURL, ref } from "firebase/storage";
import { AnimatePresence, motion } from "motion/react";
import { CirclePlay, Download, ExternalLink, Eye, FileText, Image as ImageIcon, Link2, Loader2, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatWhen } from "@/lib/announcements";
import { storage } from "@/lib/firebase-client";
import { formatBytes, kindLabels, kindStyles, linkHost, storageErrorMessage, youtubeId, type Resource, type ResourceKind } from "@/lib/resources";
import { cn } from "@/lib/utils";

export const kindIcons: Record<ResourceKind, LucideIcon> = {
  pdf: FileText,
  doc: FileText,
  image: ImageIcon,
  video: CirclePlay,
  link: Link2,
};

export function KindIcon({ kind, className }: { kind: ResourceKind; className?: string }) {
  const Icon = kindIcons[kind];
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", kindStyles[kind], className)}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/** Signed download URL for an uploaded file — Storage rules decide who gets one. */
export function useFileUrl(path: string | undefined) {
  const [state, setState] = useState<{ path: string; url: string; error: string } | null>(null);

  useEffect(() => {
    if (!path) return;
    let live = true;
    getDownloadURL(ref(storage(), path)).then(
      (url) => live && setState({ path, url, error: "" }),
      (err) => live && setState({ path, url: "", error: storageErrorMessage(err) }),
    );
    return () => {
      live = false;
    };
  }, [path]);

  const current = state?.path === path ? state : null;
  return { url: current?.url ?? "", error: current?.error ?? "", loading: Boolean(path) && !current };
}

const NEW_DAYS = 7;
const isRecent = (d: Date | null) => Boolean(d) && Date.now() - d!.getTime() < NEW_DAYS * 864e5;

type CardResource = Pick<Resource, "title" | "description" | "kind" | "url" | "file" | "createdAt">;

/** Where a signed-in student opens an uploaded study material (streamed by the server). */
export const studentFileUrl = (resourceId: string) => `/api/student/files/resource/${resourceId}`;

/** How a study material looks to students (also the admin preview — pass `preview` to disable links). */
/**
 * `fileHref` (students) opens an uploaded file through the server; without it (admins) the card
 * asks Firebase Storage for a download link.
 */
export function ResourceCard({ resource: r, preview = false, audience, fileHref }: { resource: CardResource; preview?: boolean; audience?: string; fileHref?: string }) {
  const storageFile = useFileUrl(preview || fileHref ? undefined : r.file?.path);
  const fileUrl = r.file && fileHref ? fileHref : storageFile.url;
  const { error, loading } = storageFile;
  const [playing, setPlaying] = useState(false);
  const yt = r.kind === "video" ? youtubeId(r.url) : "";
  const href = r.file ? fileUrl : r.url;

  const action =
    r.kind === "video" ? { label: "Watch", Icon: CirclePlay } : r.kind === "image" ? { label: "View", Icon: Eye } : r.kind === "doc" ? { label: "Download", Icon: Download } : r.kind === "pdf" ? { label: "Open", Icon: ExternalLink } : { label: "Open link", Icon: ExternalLink };

  const meta = r.file ? `${r.file.name}${r.file.size ? ` · ${formatBytes(r.file.size)}` : ""}` : linkHost(r.url);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-paper transition-colors hover:border-ink/40">
      {/* Visual header for images and YouTube videos */}
      {r.kind === "image" && fileUrl && (
        <a href={fileUrl} target="_blank" rel="noreferrer" className="relative block aspect-[16/9] overflow-hidden bg-paper-2">
          <Image src={fileUrl} alt={r.title} fill unoptimized sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        </a>
      )}
      {yt && (
        <button type="button" onClick={() => !preview && setPlaying(true)} className="relative block aspect-video overflow-hidden bg-ink" aria-label={`Play ${r.title}`}>
          <Image src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" fill unoptimized sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.04]" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-paper/90 text-ink shadow-lg transition-transform group-hover:scale-110">
              <CirclePlay className="size-7" aria-hidden />
            </span>
          </span>
        </button>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          {r.kind !== "image" && !yt && <KindIcon kind={r.kind} />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={cn("rounded-full px-2.5 py-0.5 font-medium", kindStyles[r.kind])}>{kindLabels[r.kind]}</span>
              {isRecent(r.createdAt) && !preview && <span className="rounded-full bg-ember px-2 py-0.5 font-semibold text-white">New</span>}
              <span className="ml-auto text-ink-faint">{formatWhen(r.createdAt) || "Just now"}</span>
            </div>
            <h3 className="mt-2 font-display text-lg leading-snug">{r.title || "Untitled resource"}</h3>
          </div>
        </div>
        {r.description && <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{r.description}</p>}
        {audience && <p className="mt-2 text-xs text-ink-faint">For: {audience}</p>}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="min-w-0 truncate text-xs text-ink-faint">{meta}</p>
          {error ? (
            <span className="text-xs text-ember">{error}</span>
          ) : preview || (r.file && loading) ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-forest/60 px-4 py-2 text-sm font-semibold text-forest-ink">
              {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
              <action.Icon className={cn("size-4", loading && "hidden")} aria-hidden /> {action.label}
            </span>
          ) : yt ? (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-forest-ink transition-colors hover:bg-ink hover:text-paper"
            >
              <action.Icon className="size-4" aria-hidden /> {action.label}
            </button>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-forest-ink transition-colors hover:bg-ink hover:text-paper"
            >
              <action.Icon className="size-4" aria-hidden /> {action.label}
            </a>
          )}
        </div>
      </div>

      {yt && <VideoDialog open={playing} videoId={yt} title={r.title} url={r.url} onClose={() => setPlaying(false)} />}
    </article>
  );
}

/** YouTube player in a lightbox. */
function VideoDialog({ open, videoId, title, url, onClose }: { open: boolean; videoId: string; title: string; url: string; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            className="w-full max-w-4xl"
            initial={{ scale: 0.94, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <p className="truncate font-display text-lg">{title}</p>
              <div className="flex shrink-0 items-center gap-1">
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">
                  <ExternalLink className="size-4" aria-hidden /> YouTube
                </a>
                <button type="button" onClick={onClose} aria-label="Close video" className="grid size-10 place-items-center rounded-full hover:bg-white/10">
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
