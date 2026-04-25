import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull().default("reader"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_clerk_user_id_unique").on(t.clerkUserId),
    uniqueIndex("users_email_unique").on(t.email),
  ],
);

export const researchers = pgTable(
  "researchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    photoUrl: text("photo_url"),
    links: jsonb("links"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("researchers_slug_unique").on(t.slug)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    nameHe: text("name_he").notNull(),
    nameEn: text("name_en"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tags_slug_unique").on(t.slug)],
);

export const researchPapers = pgTable(
  "research_papers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    bodyMarkdown: text("body_markdown"),
    language: text("language").notNull().default("he"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    draft: boolean("draft").notNull().default(true),
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      sql`(setweight(to_tsvector('simple', immutable_unaccent(coalesce(title, ''))), 'A') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(excerpt, ''))), 'B') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(body_markdown, ''))), 'C'))`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("research_papers_slug_unique").on(t.slug),
    index("research_papers_search_tsv_idx").using("gin", t.searchTsv),
  ],
);

export const researchAuthors = pgTable(
  "research_authors",
  {
    paperId: uuid("paper_id")
      .notNull()
      .references(() => researchPapers.id, { onDelete: "cascade" }),
    researcherId: uuid("researcher_id")
      .notNull()
      .references(() => researchers.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.paperId, t.researcherId] })],
);

export const researchTags = pgTable(
  "research_tags",
  {
    paperId: uuid("paper_id")
      .notNull()
      .references(() => researchPapers.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.paperId, t.tagId] })],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Researcher = typeof researchers.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type ResearchPaper = typeof researchPapers.$inferSelect;
