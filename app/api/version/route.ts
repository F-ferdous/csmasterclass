import { readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";

// The running build's id, so pages left open across a deploy can notice and reload (components/layout/update-watcher.tsx).
// Without it they'd call Server Functions the new build no longer has ("Failed to find Server Action").
export async function GET() {
  await connection();
  const build = await readFile(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").then((s) => s.trim(), () => "");
  return Response.json({ build }, { headers: { "Cache-Control": "no-store" } });
}
