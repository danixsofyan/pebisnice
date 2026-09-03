CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"phone" text,
	"created_by" text,
	"updated_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DROP INDEX "inventory_variant_unique";--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branches_project_id_idx" ON "branches" USING btree ("project_id") WHERE "branches"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "branches_created_by_idx" ON "branches" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "branches_updated_by_idx" ON "branches" USING btree ("updated_by");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_project_code_unique" ON "branches" USING btree ("project_id","code") WHERE "branches"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
--> statement-breakpoint
-- Setiap project mendapat satu cabang default. Project lama otomatis punya
-- "Pusat" supaya stok yang sudah ada punya rumah.
INSERT INTO "branches" ("project_id", "name", "code", "created_by", "updated_by")
SELECT p."id", 'Pusat', 'PUSAT', p."user_id", p."user_id"
FROM "projects" p
WHERE p."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "branches" b WHERE b."project_id" = p."id" AND b."deleted_at" IS NULL
  );--> statement-breakpoint
-- Arahkan seluruh stok, ledger, dan store yang sudah ada ke cabang default.
UPDATE "inventory" inv SET "branch_id" = b."id"
  FROM "branches" b
  WHERE b."project_id" = inv."project_id" AND b."code" = 'PUSAT' AND inv."branch_id" IS NULL;--> statement-breakpoint
UPDATE "inventory_movements" m SET "branch_id" = b."id"
  FROM "branches" b
  WHERE b."project_id" = m."project_id" AND b."code" = 'PUSAT' AND m."branch_id" IS NULL;--> statement-breakpoint
UPDATE "stores" s SET "branch_id" = b."id"
  FROM "branches" b
  WHERE b."project_id" = s."project_id" AND b."code" = 'PUSAT' AND s."branch_id" IS NULL;--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "branch_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "branch_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "inventory_branch_id_idx" ON "inventory" USING btree ("branch_id") WHERE "inventory"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_branch_variant_unique" ON "inventory" USING btree ("branch_id","product_variant_id") WHERE "inventory"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "movements_branch_variant_idx" ON "inventory_movements" USING btree ("branch_id","product_variant_id");--> statement-breakpoint
CREATE INDEX "stores_branch_id_idx" ON "stores" USING btree ("branch_id") WHERE "stores"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "team_branch_id_idx" ON "team_members" USING btree ("branch_id") WHERE "team_members"."deleted_at" is null;