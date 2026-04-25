import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { db } from "@/db";
import { researchers, users } from "@/db/schema";
import { normalizeLinks } from "@/lib/researchers";

export const runtime = "nodejs";

type ClerkUserData = {
  id: string;
  email_addresses: Array<{ id: string; email_address: string }>;
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  public_metadata?: Record<string, unknown> | null;
};

interface ResearcherMetadata {
  slug: string;
  bio?: string;
  photoUrl?: string;
  links?: unknown;
}

function pickPrimaryEmail(data: ClerkUserData): string | null {
  const primary =
    data.email_addresses.find((e) => e.id === data.primary_email_address_id) ??
    data.email_addresses[0];
  return primary?.email_address ?? null;
}

function pickDisplayName(data: ClerkUserData): string | null {
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}

function pickResearcherMetadata(data: ClerkUserData): ResearcherMetadata | null {
  const md = data.public_metadata?.researcher;
  if (!md || typeof md !== "object") return null;
  const rec = md as Record<string, unknown>;
  if (typeof rec.slug !== "string" || rec.slug.length === 0) return null;
  return {
    slug: rec.slug,
    bio: typeof rec.bio === "string" ? rec.bio : undefined,
    photoUrl: typeof rec.photoUrl === "string" ? rec.photoUrl : undefined,
    links: rec.links,
  };
}

async function upsertResearcherFromClerk(
  data: ClerkUserData,
  dbUserId: string,
  displayName: string | null,
) {
  const meta = pickResearcherMetadata(data);
  if (!meta) return;
  const photoUrl = meta.photoUrl ?? data.image_url ?? null;
  const links = normalizeLinks(meta.links);
  const finalDisplayName = displayName ?? meta.slug;

  await db
    .insert(researchers)
    .values({
      userId: dbUserId,
      slug: meta.slug,
      displayName: finalDisplayName,
      bio: meta.bio ?? null,
      photoUrl,
      links: links.length > 0 ? links : null,
    })
    .onConflictDoUpdate({
      target: researchers.slug,
      set: {
        userId: dbUserId,
        displayName: finalDisplayName,
        bio: meta.bio ?? null,
        photoUrl,
        links: links.length > 0 ? links : null,
        updatedAt: new Date(),
      },
    });
}

export async function POST(req: NextRequest) {
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  switch (evt.type) {
    case "user.created":
    case "user.updated": {
      const data = evt.data as unknown as ClerkUserData;
      const email = pickPrimaryEmail(data);
      if (!email) {
        return new Response("missing email", { status: 200 });
      }
      const displayName = pickDisplayName(data);

      const inserted = await db
        .insert(users)
        .values({ clerkUserId: data.id, email, displayName })
        .onConflictDoUpdate({
          target: users.clerkUserId,
          set: { email, displayName, updatedAt: new Date() },
        })
        .returning({ id: users.id });

      const dbUserId = inserted[0]?.id;
      if (dbUserId) {
        await upsertResearcherFromClerk(data, dbUserId, displayName);
      }
      return new Response("ok", { status: 200 });
    }
    case "user.deleted": {
      const data = evt.data as { id?: string };
      if (data.id) {
        await db.delete(users).where(eq(users.clerkUserId, data.id));
      }
      return new Response("ok", { status: 200 });
    }
    default:
      return new Response("ignored", { status: 200 });
  }
}
