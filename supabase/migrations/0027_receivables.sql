CREATE TABLE "receivable_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"receivable_id" uuid NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"method" "payment_method",
	"note" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "receivables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"customer_id" uuid,
	"branch_id" uuid,
	"transaction_id" uuid,
	"amount" numeric(18, 2) NOT NULL,
	"description" text,
	"due_date" date,
	"settled_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_receivable_id_receivables_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "public"."receivables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receivable_payments_receivable_idx" ON "receivable_payments" USING btree ("receivable_id");--> statement-breakpoint
CREATE INDEX "receivable_payments_project_idx" ON "receivable_payments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "receivables_project_idx" ON "receivables" USING btree ("project_id") WHERE "receivables"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "receivables_customer_idx" ON "receivables" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "receivables_open_idx" ON "receivables" USING btree ("project_id","settled_at") WHERE "receivables"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "receivables_created_by_idx" ON "receivables" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "receivables_updated_by_idx" ON "receivables" USING btree ("updated_by");--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_receivables_updated_at ON receivables;--> statement-breakpoint
CREATE TRIGGER trg_receivables_updated_at BEFORE UPDATE ON receivables
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();--> statement-breakpoint

ALTER TABLE "receivables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "receivables" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_receivables_tenant ON receivables;--> statement-breakpoint
CREATE POLICY policy_receivables_tenant ON receivables
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
ALTER TABLE "receivable_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "receivable_payments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_receivable_payments_tenant ON receivable_payments;--> statement-breakpoint
CREATE POLICY policy_receivable_payments_tenant ON receivable_payments
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
