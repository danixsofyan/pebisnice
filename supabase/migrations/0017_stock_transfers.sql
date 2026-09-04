ALTER TYPE "public"."movement_type" ADD VALUE 'transfer_out';--> statement-breakpoint
ALTER TYPE "public"."movement_type" ADD VALUE 'transfer_in';--> statement-breakpoint
CREATE TABLE "stock_transfer_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"transfer_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"qty" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"from_branch_id" uuid NOT NULL,
	"to_branch_id" uuid NOT NULL,
	"note" text,
	"created_by" text,
	"updated_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_branch_id_branches_id_fk" FOREIGN KEY ("from_branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_branch_id_branches_id_fk" FOREIGN KEY ("to_branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transfer_items_transfer_idx" ON "stock_transfer_items" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "transfer_items_project_idx" ON "stock_transfer_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "transfer_items_variant_idx" ON "stock_transfer_items" USING btree ("product_variant_id");--> statement-breakpoint
CREATE INDEX "transfers_project_idx" ON "stock_transfers" USING btree ("project_id") WHERE "stock_transfers"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "transfers_from_idx" ON "stock_transfers" USING btree ("from_branch_id");--> statement-breakpoint
CREATE INDEX "transfers_to_idx" ON "stock_transfers" USING btree ("to_branch_id");--> statement-breakpoint
CREATE INDEX "transfers_created_by_idx" ON "stock_transfers" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "transfers_updated_by_idx" ON "stock_transfers" USING btree ("updated_by");--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_stock_transfers_updated_at ON stock_transfers;--> statement-breakpoint
CREATE TRIGGER trg_stock_transfers_updated_at
  BEFORE UPDATE ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();--> statement-breakpoint

ALTER TABLE "stock_transfers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stock_transfers" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_stock_transfers_tenant ON stock_transfers;--> statement-breakpoint
CREATE POLICY policy_stock_transfers_tenant ON stock_transfers
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_stock_transfer_items_tenant ON stock_transfer_items;--> statement-breakpoint
CREATE POLICY policy_stock_transfer_items_tenant ON stock_transfer_items
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
