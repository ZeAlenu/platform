import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

import { db } from "@/db";
import { users, type User } from "@/db/schema";

export type ClerkSyncedUser = User;

export async function getDbUserByClerkId(clerkUserId: string): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return rows[0] ?? null;
}

export async function currentDbUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return getDbUserByClerkId(userId);
}

export async function requireDbUser(): Promise<User> {
  const user = await currentDbUser();
  if (!user) throw new Error("Authentication required");
  return user;
}

export async function ensureDbUserFromClerk(): Promise<User | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const existing = await getDbUserByClerkId(clerkUser.id);
  if (existing) return existing;

  const inserted = await db
    .insert(users)
    .values({
      clerkUserId: clerkUser.id,
      email,
      displayName:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
    })
    .returning();
  return inserted[0] ?? null;
}
