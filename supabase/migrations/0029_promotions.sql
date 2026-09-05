CREATE TYPE "public"."promo_type" AS ENUM('percent', 'nominal');--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"discount_type" "promo_type" NOT NULL,
	"percent_basis_points" integer DEFAULT 0 NOT NULL,
	"amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"min_spend" numeric(18, 2) DEFAULT '0' NOT NULL,
	"max_discount" numeric(18, 2),
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"updated_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "promotion_id" uuid;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_code_idx" ON "promotions" USING btree ("project_id","code") WHERE "promotions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "promotions_project_idx" ON "promotions" USING btree ("project_id") WHERE "promotions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "promotions_created_by_idx" ON "promotions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "promotions_updated_by_idx" ON "promotions" USING btree ("updated_by");--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_promotions_updated_at ON promotions;--> statement-breakpoint
CREATE TRIGGER trg_promotions_updated_at BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();--> statement-breakpoint

ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "promotions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_promotions_tenant ON promotions;--> statement-breakpoint
CREATE POLICY policy_promotions_tenant ON promotions
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
