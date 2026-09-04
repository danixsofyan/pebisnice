CREATE TABLE "sale_return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"return_id" uuid NOT NULL,
	"product_variant_id" uuid,
	"product_name" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" numeric(18, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"refund_amount" numeric(18, 2) NOT NULL,
	"reason" text,
	"created_by" text,
	"updated_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_return_id_sale_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."sale_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "return_items_return_idx" ON "sale_return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "return_items_project_idx" ON "sale_return_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "return_items_variant_idx" ON "sale_return_items" USING btree ("product_variant_id");--> statement-breakpoint
CREATE INDEX "returns_transaction_idx" ON "sale_returns" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "returns_project_idx" ON "sale_returns" USING btree ("project_id") WHERE "sale_returns"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "returns_created_by_idx" ON "sale_returns" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "returns_updated_by_idx" ON "sale_returns" USING btree ("updated_by");--> statement-breakpoint

ALTER TABLE "sale_returns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sale_returns" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_sale_returns_tenant ON sale_returns;--> statement-breakpoint
CREATE POLICY policy_sale_returns_tenant ON sale_returns
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
ALTER TABLE "sale_return_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sale_return_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_sale_return_items_tenant ON sale_return_items;--> statement-breakpoint
CREATE POLICY policy_sale_return_items_tenant ON sale_return_items
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_sale_returns_updated_at ON sale_returns;--> statement-breakpoint
CREATE TRIGGER trg_sale_returns_updated_at
  BEFORE UPDATE ON sale_returns
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
