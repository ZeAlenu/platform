CREATE TABLE "research_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"researcher_id" uuid,
	"slug" text NOT NULL,
	"title_he" text NOT NULL,
	"excerpt" text,
	"language" text DEFAULT 'he' NOT NULL,
	"tag_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"body_markdown" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"pr_url" text,
	"pr_number" integer,
	"branch_name" text,
	"review_notes" text,
	"submitted_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_submissions" ADD CONSTRAINT "research_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_submissions" ADD CONSTRAINT "research_submissions_researcher_id_researchers_id_fk" FOREIGN KEY ("researcher_id") REFERENCES "public"."researchers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "research_submissions_slug_unique" ON "research_submissions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "research_submissions_user_idx" ON "research_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "research_submissions_status_idx" ON "research_submissions" USING btree ("status");
