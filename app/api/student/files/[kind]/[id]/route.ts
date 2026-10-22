import { adminBucket, adminDb } from "@/lib/server/firebase-admin";
import { currentStudent } from "@/lib/server/students";
import { studentAudienceKeys } from "@/lib/resources";

// Files for signed-in students, streamed through the server (students have no Firebase login, so
// Storage rules can't let them read directly):
//   /api/student/files/resource/{resourceId} — an uploaded study material meant for this student
//   /api/student/files/homework/{homeworkId} — this student's own homework upload

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await ctx.params;
  const me = await currentStudent().catch(() => null);
  if (!me) return new Response("Please sign in", { status: 401 });

  const db = adminDb();
  let file: { path?: string; name?: string; contentType?: string } | null = null;
  if (kind === "resource") {
    const r = await db.doc(`resources/${id}`).get();
    const keys: string[] = r.get("audienceKeys") ?? [];
    if (!r.exists || !keys.some((k) => studentAudienceKeys(me).includes(k))) return notFound();
    file = r.get("file") ?? null;
  } else if (kind === "homework") {
    const s = await db.doc(`homework/${id}/submissions/${me.uid}`).get();
    if (!s.exists) return notFound();
    file = s.get("file") ?? null;
  } else return notFound();
  if (!file?.path) return notFound();

  try {
    const [data] = await adminBucket().file(file.path).download();
    const name = (file.name || "file").replace(/["\\\r\n]/g, "");
    const type = file.contentType || "application/octet-stream";
    // Open PDFs, photos and text in the browser; anything else (e.g. SVG, which can run scripts) downloads.
    const inline = /^(application\/pdf|image\/(png|jpe?g|gif|webp|avif)|text\/plain)$/.test(type);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[student-files]", err);
    return notFound();
  }
}
