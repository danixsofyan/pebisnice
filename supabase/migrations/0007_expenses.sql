CREATE TYPE "public"."expense_category" AS ENUM('rent', 'salary', 'utility', 'marketing', 'shipping', 'supply', 'tax', 'other');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"branch_id" uuid,
	"category" "expense_category" DEFAULT 'other' NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"expense_date" date NOT NULL,
	"note" text,
	"created_by" text,
	"updated_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_project_id_idx" ON "expenses" USING btree ("project_id") WHERE "expenses"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "expenses_branch_id_idx" ON "expenses" USING btree ("branch_id") WHERE "expenses"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("project_id","expense_date" DESC NULLS LAST) WHERE "expenses"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("project_id","category");--> statement-breakpoint
CREATE INDEX "expenses_created_by_idx" ON "expenses" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "expenses_updated_by_idx" ON "expenses" USING btree ("updated_by");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "chk_expenses_amount_positive" CHECK ("amount" > 0);--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;--> statement-breakpoint
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();--> statement-breakpoint

ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expenses" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_expenses_tenant ON expenses;--> statement-breakpoint
CREATE POLICY policy_expenses_tenant ON expenses
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
