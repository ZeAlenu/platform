import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { db } from "@/db";
import { users } from "@/db/schema";

export const runtime = "nodejs";

type ClerkUserData = {
  id: string;
  email_addresses: Array<{ id: string; email_address: string }>;
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
};

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

      await db
        .insert(users)
        .values({ clerkUserId: data.id, email, displayName })
        .onConflictDoUpdate({
          target: users.clerkUserId,
          set: { email, displayName, updatedAt: new Date() },
        });
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
