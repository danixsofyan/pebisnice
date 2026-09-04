CREATE TYPE "public"."mutation_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."mutation_source" AS ENUM('import', 'moota', 'manual');--> statement-breakpoint
CREATE TABLE "financial_mutations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"branch_id" uuid,
	"bank" text NOT NULL,
	"source" "mutation_source" DEFAULT 'import' NOT NULL,
	"external_id" text,
	"direction" "mutation_direction" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"balance_after" numeric(18, 2),
	"mutation_date" date NOT NULL,
	"description" text NOT NULL,
	"reference" text,
	"dedup_hash" text NOT NULL,
	"reconciled" boolean DEFAULT false NOT NULL,
	"matched_type" text,
	"matched_id" uuid,
	"note" text,
	"created_by" text,
	"updated_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "financial_mutations" ADD CONSTRAINT "financial_mutations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_mutations" ADD CONSTRAINT "financial_mutations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_mutations" ADD CONSTRAINT "financial_mutations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_mutations" ADD CONSTRAINT "financial_mutations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mutations_dedup_idx" ON "financial_mutations" USING btree ("project_id","dedup_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "mutations_external_idx" ON "financial_mutations" USING btree ("project_id","source","external_id") WHERE "financial_mutations"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "mutations_date_idx" ON "financial_mutations" USING btree ("project_id","mutation_date" DESC NULLS LAST) WHERE "financial_mutations"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "mutations_reconciled_idx" ON "financial_mutations" USING btree ("project_id","reconciled") WHERE "financial_mutations"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "mutations_created_by_idx" ON "financial_mutations" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "mutations_updated_by_idx" ON "financial_mutations" USING btree ("updated_by");--> statement-breakpoint
ALTER TABLE "financial_mutations" ADD CONSTRAINT "chk_financial_mutations_amount_positive" CHECK ("amount" > 0);--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_financial_mutations_updated_at ON financial_mutations;--> statement-breakpoint
CREATE TRIGGER trg_financial_mutations_updated_at
  BEFORE UPDATE ON financial_mutations
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();--> statement-breakpoint

ALTER TABLE "financial_mutations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "financial_mutations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_financial_mutations_tenant ON financial_mutations;--> statement-breakpoint
CREATE POLICY policy_financial_mutations_tenant ON financial_mutations
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
