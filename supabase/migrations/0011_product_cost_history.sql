CREATE TABLE "product_cost_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"cost" numeric(18, 2) NOT NULL,
	"previous_cost" numeric(18, 2),
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cost_history_variant_idx" ON "product_cost_history" USING btree ("product_variant_id","effective_from");--> statement-breakpoint
CREATE INDEX "cost_history_project_idx" ON "product_cost_history" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "cost_history_changed_by_idx" ON "product_cost_history" USING btree ("changed_by");--> statement-breakpoint

ALTER TABLE "product_cost_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_cost_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_product_cost_history_tenant ON product_cost_history;--> statement-breakpoint
CREATE POLICY policy_product_cost_history_tenant ON product_cost_history
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
