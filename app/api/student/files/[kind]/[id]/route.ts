import { adminBucket, adminDb } from "@/lib/server/firebase-admin";
import { currentStudent } from "@/lib/server/students";
import { studentAudienceKeys } from "@/lib/resources";

// Files for signed-in students, streamed through the server (students have no Firebase login, so
// Storage rules can't let them read directly):
//   /api/student/files/resource/{resourceId} — an uploaded study material meant for this student
//   /api/student/files/homework/{homeworkId} — this student's own homework upload

const notFound = () => new Response("Not found", { status: 404 });

// Interactive HTML notes are shown only inside the dashboard's full-screen viewer. This is added to
// every page so students can't select, copy, save or print it (it discourages copying; it can't stop
// a screenshot), and the page's own "Copy" buttons are hidden. Typing in its editors still works.
const PROTECT = `<style id="csm-protect">
*:not(input):not(textarea){-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
.copy{display:none!important}
@media print{body{display:none!important}}
</style><script>(function(){
var editable=function(t){return t&&t.closest&&t.closest("input,textarea,[contenteditable=true]")};
["copy","cut","dragstart","selectstart"].forEach(function(e){document.addEventListener(e,function(ev){if(!editable(ev.target))ev.preventDefault()},true)});
document.addEventListener("contextmenu",function(ev){ev.preventDefault()},true);
document.addEventListener("keydown",function(ev){var k=(ev.key||"").toLowerCase();if((ev.ctrlKey||ev.metaKey)&&(k==="s"||k==="p"||k==="u"||((k==="c"||k==="x"||k==="a")&&!editable(ev.target)))){ev.preventDefault();ev.stopPropagation()}},true);
window.print=function(){};
})();</script>`;

function protectHtml(html: string) {
  const head = html.match(/<head[^>]*>/i);
  if (head) return html.replace(head[0], head[0] + PROTECT);
  return PROTECT + html;
}

export async function GET(req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
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
    if (/^text\/html\b/.test(type)) {
      // Only inside the dashboard viewer's iframe — not opened directly in a tab.
      const dest = req.headers.get("sec-fetch-dest");
      if (dest && dest !== "iframe") return new Response("Open this from Study materials in your dashboard.", { status: 403 });
      return new Response(protectHtml(new TextDecoder().decode(data)), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": "inline",
          // Runs in its own sandbox: its scripts work but can't see the student's sign-in or the site.
          "Content-Security-Policy": "sandbox allow-scripts; frame-ancestors 'self'",
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
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
