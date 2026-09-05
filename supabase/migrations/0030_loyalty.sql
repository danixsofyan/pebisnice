CREATE TYPE "public"."loyalty_ledger_type" AS ENUM('earn', 'redeem', 'adjust');--> statement-breakpoint
CREATE TABLE "loyalty_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"transaction_id" uuid,
	"type" "loyalty_ledger_type" NOT NULL,
	"points" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "loyalty_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "loyalty_earn_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "loyalty_redeem_value" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "loyalty_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "loyalty_ledger_customer_idx" ON "loyalty_ledger" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "loyalty_ledger_project_idx" ON "loyalty_ledger" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "loyalty_ledger_tx_idx" ON "loyalty_ledger" USING btree ("transaction_id");--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_loyalty_ledger_immutable ON loyalty_ledger;--> statement-breakpoint
CREATE TRIGGER trg_loyalty_ledger_immutable BEFORE UPDATE OR DELETE ON loyalty_ledger
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_mutation();--> statement-breakpoint

ALTER TABLE "loyalty_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_loyalty_ledger_tenant ON loyalty_ledger;--> statement-breakpoint
CREATE POLICY policy_loyalty_ledger_tenant ON loyalty_ledger
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
