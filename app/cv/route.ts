import { readFile } from "node:fs/promises";
import { CV_DOWNLOAD_NAME, findCv } from "@/lib/cv";

export const dynamic = "force-dynamic";

// Serves the newest PDF from the /cv folder as a download.
export async function GET() {
  const file = await findCv();
  if (!file) return new Response("CV not available yet.", { status: 404 });
  return new Response(new Uint8Array(await readFile(file)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${CV_DOWNLOAD_NAME}"`,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
