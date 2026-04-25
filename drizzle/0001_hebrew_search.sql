CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$ SELECT public.unaccent('public.unaccent', $1) $$;--> statement-breakpoint
ALTER TABLE "research_papers" DROP COLUMN "search_tsv";--> statement-breakpoint
ALTER TABLE "research_papers" ADD COLUMN "search_tsv" "tsvector" GENERATED ALWAYS AS ((setweight(to_tsvector('simple', immutable_unaccent(coalesce(title, ''))), 'A') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(excerpt, ''))), 'B') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(body_markdown, ''))), 'C'))) STORED;--> statement-breakpoint
CREATE INDEX "research_papers_search_tsv_idx" ON "research_papers" USING gin ("search_tsv");--> statement-breakpoint
CREATE INDEX "research_papers_title_trgm_idx" ON "research_papers" USING gin (immutable_unaccent("title") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "research_papers_excerpt_trgm_idx" ON "research_papers" USING gin (immutable_unaccent(coalesce("excerpt", '')) gin_trgm_ops);
