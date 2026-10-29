import { adminBucket, adminDb } from "@/lib/server/firebase-admin";
import { htmlViewerResponse, isHtmlFile } from "@/lib/server/html-viewer";

// /api/free-files/{freeResourceId} — an interactive HTML page from /free-resources, for the page's
// full-screen viewer. Other free files open straight from their Storage download link (`fileUrl`);
// HTML pages have none, so the raw file isn't handed out.

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await adminDb().doc(`freeResources/${id}`).get();
  const file: { path?: string; contentType?: string } | null = r.get("file") ?? null;
  if (!r.exists || r.get("visible") === false || !file?.path || !isHtmlFile(file.contentType ?? "")) return notFound();

  try {
    const [data] = await adminBucket().file(file.path).download();
    return htmlViewerResponse(req, data, "Open this from the Free Resources page.", "public, max-age=300");
  } catch (err) {
    console.error("[free-files]", err);
    return notFound();
  }
}
