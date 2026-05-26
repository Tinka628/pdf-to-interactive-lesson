/**
 * One-off debug script — list each flow-diagram lesson in the most recent
 * courses and whether it has an imageUrl attached. Also shows success:false
 * lessons (which the inspect filter normally hides) so we can see whether
 * dedup-repair dropped any flow lessons.
 *
 * Usage: bun scripts/inspect-flow-images.ts [limit]
 */

import { db } from "../lib/db";
import { courses } from "../lib/db/schema";
import { desc } from "drizzle-orm";

const limit = parseInt(process.argv[2] ?? "1", 10);

const recent = await db
  .select()
  .from(courses)
  .orderBy(desc(courses.createdAt))
  .limit(limit);

for (const c of recent) {
  console.log("\n" + "=".repeat(70));
  console.log(`📚 ${c.slug}`);
  console.log(`   created: ${c.createdAt.toISOString()}`);
  console.log("=".repeat(70));

  const data = c.courseData as any;
  const modules = data?.modules ?? [];

  modules.forEach((m: any, i: number) => {
    console.log(`\n  Module ${i + 1}: ${m.title}`);
    const lessons = m.lessons ?? [];
    if (lessons.length === 0) {
      console.log("    (no lessons)");
      return;
    }
    lessons.forEach((l: any, idx: number) => {
      const d = l.data ?? {};
      const qt = d.questionType ?? "(unknown)";
      const ok = l.success ? "✅" : "❌";
      const errorReason = l.success ? "" : ` — ${l.error?.validationType ?? "?"}: ${l.error?.reason ?? "?"}`;
      const imageBit =
        qt === "flow-diagram"
          ? d.imageUrl
            ? ` 🖼  ${d.imageUrl.split("/").pop()}`
            : " 🖼  (none)"
          : "";
      console.log(`    [${idx}] ${ok} ${qt}: "${d.title ?? "?"}"${imageBit}${errorReason}`);
    });
  });
}

console.log("");
process.exit(0);
