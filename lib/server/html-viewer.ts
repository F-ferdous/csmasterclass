// Interactive HTML notes are shown only inside the site's full-screen viewer (an iframe). This is
// added to every page so readers can't select, copy, save or print it (it discourages copying; it
// can't stop a screenshot), and the page's own "Copy" buttons are hidden. Typing in its editors still works.
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

export const isHtmlFile = (contentType: string) => /^text\/html\b/.test(contentType);

/**
 * An uploaded HTML page for the viewer's iframe. Opened any other way (a new tab, a download) it
 * answers `refusal` with 403 instead.
 */
export function htmlViewerResponse(req: Request, data: Uint8Array, refusal: string, cacheControl = "private, no-store") {
  const dest = req.headers.get("sec-fetch-dest");
  if (dest && dest !== "iframe") return new Response(refusal, { status: 403 });
  return new Response(protectHtml(new TextDecoder().decode(data)), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      // Runs in its own sandbox: its scripts work but can't see the visitor's sign-in or the site.
      "Content-Security-Policy": "sandbox allow-scripts; frame-ancestors 'self'",
      "Cache-Control": cacheControl,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
