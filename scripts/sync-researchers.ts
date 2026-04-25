import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { researchers } from "../src/db/schema";
import { listResearcherFiles } from "../src/lib/researchers";

async function main() {
  const all = await listResearcherFiles();
  console.log(`[sync-researchers] processing ${all.length} files`);

  let inserted = 0;
  let updated = 0;

  for (const profile of all) {
    const result = await db
      .insert(researchers)
      .values({
        slug: profile.slug,
        displayName: profile.displayName,
        bio: profile.bio,
        photoUrl: profile.photoUrl,
        links: profile.links.length > 0 ? profile.links : null,
      })
      .onConflictDoUpdate({
        target: researchers.slug,
        set: {
          displayName: sql`excluded.display_name`,
          bio: sql`excluded.bio`,
          photoUrl: sql`excluded.photo_url`,
          links: sql`excluded.links`,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        id: researchers.id,
        createdAt: researchers.createdAt,
        updatedAt: researchers.updatedAt,
      });

    const row = result[0];
    if (row && row.createdAt.getTime() === row.updatedAt.getTime()) {
      inserted++;
    } else {
      updated++;
    }
    console.log(`  ✓ ${profile.slug}`);
  }

  console.log(
    `[sync-researchers] done: ${inserted} inserted, ${updated} updated, ${all.length} total`,
  );
}

main().catch((err) => {
  console.error("[sync-researchers] failed:", err);
  process.exit(1);
});
