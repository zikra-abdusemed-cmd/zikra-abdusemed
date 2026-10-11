import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { deleteBlob, hasBlobStorage, readBlob, writeBlob } from "./blob-storage";

/**
 * Project photos live in <content dir>/uploads so they persist alongside content.json
 * (files added to /public after a build aren't served in production).
 */
export const UPLOAD_DIR = path.join(process.env.CONTENT_DIR ?? path.join(process.cwd(), "data"), "uploads");
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
} as const;
type Ext = keyof typeof TYPES;

/** Only names we generated ourselves: uuid + known extension (blocks path traversal). */
const NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/;

/** Detect the real format from the file's magic bytes; never trust the browser's MIME type. SVG is rejected on purpose. */
function sniff(b: Uint8Array): Ext | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "gif";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

export async function saveUpload(file: File): Promise<string> {
  if (process.env.VERCEL && !hasBlobStorage()) {
    throw new Error("Photo uploads are not connected yet. In Vercel, create and connect a public Blob store, then redeploy.");
  }
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Photo must be 5 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniff(bytes);
  if (!ext) throw new Error("Photo must be a JPG, PNG, WebP or GIF.");
  const name = `${randomUUID()}.${ext}`;
  if (process.env.VERCEL) {
    await writeBlob(`portfolio/uploads/${name}`, bytes, TYPES[ext]);
    return name;
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), bytes);
  return name;
}

export async function deleteUpload(name: string | undefined) {
  if (!name || !NAME_RE.test(name)) return;
  if (process.env.VERCEL && hasBlobStorage()) {
    await deleteBlob(`portfolio/uploads/${name}`);
    return;
  }
  await rm(path.join(UPLOAD_DIR, name), { force: true });
}

export async function readUpload(name: string) {
  if (!NAME_RE.test(name)) return null;
  if (process.env.VERCEL && hasBlobStorage()) {
    const data = await readBlob(`portfolio/uploads/${name}`);
    if (data) return { data, type: TYPES[name.split(".").pop() as Ext] };
  }
  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    return { data, type: TYPES[name.split(".").pop() as Ext] };
  } catch {
    // Bundled project photos keep the public portfolio complete before Blob is connected.
    if (!process.env.VERCEL) return null;
    try {
      const data = await readFile(path.join(process.cwd(), "public", "uploads", name));
      return { data, type: TYPES[name.split(".").pop() as Ext] };
    } catch {
      return null;
    }
  }
}
