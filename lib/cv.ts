import "server-only";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export const CV_DIR = path.join(process.cwd(), "cv");
export const CV_DOWNLOAD_NAME = "Zikra-Abdusemed-CV.pdf";

/** Absolute path of the newest PDF in /cv, or null if there isn't one. */
export async function findCv(): Promise<string | null> {
  let names: string[];
  try {
    names = await readdir(CV_DIR);
  } catch {
    return null;
  }
  const pdfs = await Promise.all(
    names
      .filter((n) => n.toLowerCase().endsWith(".pdf") && !n.startsWith("."))
      .map(async (n) => {
        const file = path.join(CV_DIR, n);
        const info = await stat(file);
        return info.isFile() ? { file, mtime: info.mtimeMs } : null;
      }),
  );
  const newest = pdfs.filter((p) => p !== null).sort((a, b) => b.mtime - a.mtime)[0];
  return newest?.file ?? null;
}
