import "server-only";
import { Buffer } from "node:buffer";
import { del, get, put } from "@vercel/blob";

export function hasBlobStorage() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID),
  );
}

export async function readBlob(pathname: string): Promise<Uint8Array | null> {
  const blob = await get(pathname, { access: "private" });
  if (blob?.statusCode !== 200 || !blob.stream) return null;
  return new Uint8Array(await new Response(blob.stream).arrayBuffer());
}

export async function writeBlob(pathname: string, data: string | Uint8Array, contentType: string, overwrite = false) {
  await put(pathname, typeof data === "string" ? data : Buffer.from(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: overwrite,
    contentType,
    cacheControlMaxAge: overwrite ? 60 : 31536000,
  });
}

export async function deleteBlob(pathname: string) {
  await del(pathname);
}
