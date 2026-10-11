import { readUpload } from "@/lib/uploads";

// Serves project photos from the uploads directory. Names are random UUIDs, so they can be cached forever.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const file = await readUpload((await params).name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
