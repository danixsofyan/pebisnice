CREATE TYPE "public"."product_type" AS ENUM('finished', 'material');--> statement-breakpoint
CREATE TABLE "production_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"production_date" date NOT NULL,
	"total_material_cost" numeric(18, 2) DEFAULT '0' NOT NULL,
	"unit_cost" numeric(18, 2) DEFAULT '0' NOT NULL,
	"note" text,
	"created_by" text,
	"updated_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "production_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"production_log_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"cost_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "type" "product_type" DEFAULT 'finished' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_materials" ADD CONSTRAINT "production_materials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_materials" ADD CONSTRAINT "production_materials_production_log_id_production_logs_id_fk" FOREIGN KEY ("production_log_id") REFERENCES "public"."production_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_materials" ADD CONSTRAINT "production_materials_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_project_id_idx" ON "production_logs" USING btree ("project_id") WHERE "production_logs"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "production_branch_id_idx" ON "production_logs" USING btree ("branch_id") WHERE "production_logs"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "production_variant_id_idx" ON "production_logs" USING btree ("product_variant_id");--> statement-breakpoint
CREATE INDEX "production_date_idx" ON "production_logs" USING btree ("production_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "production_created_by_idx" ON "production_logs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "production_updated_by_idx" ON "production_logs" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "production_materials_log_id_idx" ON "production_materials" USING btree ("production_log_id");--> statement-breakpoint
CREATE INDEX "production_materials_project_id_idx" ON "production_materials" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "production_materials_variant_id_idx" ON "production_materials" USING btree ("product_variant_id");--> statement-breakpoint
CREATE INDEX "products_type_idx" ON "products" USING btree ("project_id","type") WHERE "products"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "production_logs" ADD CONSTRAINT "chk_production_logs_positive" CHECK (
  "quantity" > 0 AND "total_material_cost" >= 0 AND "unit_cost" >= 0
);--> statement-breakpoint
ALTER TABLE "production_materials" ADD CONSTRAINT "chk_production_materials_positive" CHECK (
  "quantity" > 0 AND "cost_amount" >= 0
);--> statement-breakpoint
-- Satu bahan hanya boleh tercatat sekali per log produksi.
CREATE UNIQUE INDEX "production_materials_log_variant_unique"
  ON "production_materials" ("production_log_id", "product_variant_id");--> statement-breakpoint

-- Tabel baru wajib ikut mendapat trigger updated_at dan policy RLS.
DROP TRIGGER IF EXISTS trg_production_logs_updated_at ON production_logs;--> statement-breakpoint
CREATE TRIGGER trg_production_logs_updated_at
  BEFORE UPDATE ON production_logs
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();--> statement-breakpoint

DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY['production_logs', 'production_materials'] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', target);
        EXECUTE format('DROP POLICY IF EXISTS policy_%s_tenant ON %I', target, target);
        EXECUTE format(
            'CREATE POLICY policy_%s_tenant ON %I
             USING (project_id = current_setting(''app.current_project_id'', true)::uuid)
             WITH CHECK (project_id = current_setting(''app.current_project_id'', true)::uuid)',
            target, target
        );
    END LOOP;
END;
$$;
