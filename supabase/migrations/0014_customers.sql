CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone_enc" text,
	"phone_hash" text,
	"email_enc" text,
	"address_enc" text,
	"note" text,
	"created_by" text,
	"updated_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_phone_hash_idx" ON "customers" USING btree ("project_id","phone_hash") WHERE "customers"."phone_hash" is not null and "customers"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "customers_project_idx" ON "customers" USING btree ("project_id") WHERE "customers"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "customers_created_by_idx" ON "customers" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "customers_updated_by_idx" ON "customers" USING btree ("updated_by");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;--> statement-breakpoint
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();--> statement-breakpoint

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customers" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_customers_tenant ON customers;--> statement-breakpoint
CREATE POLICY policy_customers_tenant ON customers
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
