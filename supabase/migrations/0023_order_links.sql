CREATE TABLE "order_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"project_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_links" ADD CONSTRAINT "order_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_links" ADD CONSTRAINT "order_links_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_links_slug_idx" ON "order_links" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "order_links_branch_idx" ON "order_links" USING btree ("branch_id");--> statement-breakpoint

ALTER TABLE "order_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS app_full_access ON order_links;--> statement-breakpoint
CREATE POLICY app_full_access ON order_links FOR ALL TO pebisnice_app USING (true) WITH CHECK (true);
