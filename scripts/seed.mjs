// Resets data/content.json to the sample data in data/seed.json.
// Usage: npm run seed
import { copyFile } from "node:fs/promises";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
await copyFile(path.join(dir, "seed.json"), path.join(dir, "content.json"));
console.log("Seeded data/content.json from data/seed.json");
