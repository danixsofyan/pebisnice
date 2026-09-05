ALTER TYPE "public"."movement_type" ADD VALUE 'purchase_return';--> statement-breakpoint
CREATE TABLE "purchase_return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"return_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"qty" integer NOT NULL,
	"unit_cost" numeric(18, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
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
ALTER TABLE "purchase_order_items" ADD COLUMN "qty_returned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_return_id_purchase_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."purchase_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_return_items_return_idx" ON "purchase_return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "purchase_return_items_project_idx" ON "purchase_return_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "purchase_returns_po_idx" ON "purchase_returns" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "purchase_returns_project_idx" ON "purchase_returns" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "purchase_returns_created_by_idx" ON "purchase_returns" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "purchase_returns_updated_by_idx" ON "purchase_returns" USING btree ("updated_by");--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_purchase_returns_updated_at ON purchase_returns;--> statement-breakpoint
CREATE TRIGGER trg_purchase_returns_updated_at BEFORE UPDATE ON purchase_returns
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();--> statement-breakpoint

ALTER TABLE "purchase_returns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "purchase_returns" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_purchase_returns_tenant ON purchase_returns;--> statement-breakpoint
CREATE POLICY policy_purchase_returns_tenant ON purchase_returns
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
ALTER TABLE "purchase_return_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "purchase_return_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_purchase_return_items_tenant ON purchase_return_items;--> statement-breakpoint
CREATE POLICY policy_purchase_return_items_tenant ON purchase_return_items
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
