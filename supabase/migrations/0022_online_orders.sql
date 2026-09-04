CREATE TYPE "public"."online_order_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "online_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"product_variant_id" uuid,
	"product_name" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" numeric(18, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "online_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone_enc" text,
	"status" "online_order_status" DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"note" text,
	"transaction_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "wa_number" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "price" numeric(18, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "online_order_items" ADD CONSTRAINT "online_order_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "online_order_items" ADD CONSTRAINT "online_order_items_order_id_online_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."online_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "online_order_items" ADD CONSTRAINT "online_order_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "online_order_items_order_idx" ON "online_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "online_order_items_project_idx" ON "online_order_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "online_orders_project_status_idx" ON "online_orders" USING btree ("project_id","status") WHERE "online_orders"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "online_orders_branch_idx" ON "online_orders" USING btree ("branch_id");--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_online_orders_updated_at ON online_orders;--> statement-breakpoint
CREATE TRIGGER trg_online_orders_updated_at BEFORE UPDATE ON online_orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();--> statement-breakpoint

ALTER TABLE "online_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "online_orders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_online_orders_tenant ON online_orders;--> statement-breakpoint
CREATE POLICY policy_online_orders_tenant ON online_orders
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
ALTER TABLE "online_order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "online_order_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_online_order_items_tenant ON online_order_items;--> statement-breakpoint
CREATE POLICY policy_online_order_items_tenant ON online_order_items
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
