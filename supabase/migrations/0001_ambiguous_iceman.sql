ALTER TABLE "inventory" DROP CONSTRAINT "inventory_product_variant_id_unique";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "file_uploads" DROP CONSTRAINT "file_uploads_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction_items" DROP CONSTRAINT "transaction_items_product_variant_id_product_variants_id_fk";
--> statement-breakpoint
DROP INDEX "audit_created_at_idx";--> statement-breakpoint
DROP INDEX "variants_product_id_idx";--> statement-breakpoint
DROP INDEX "products_project_id_idx";--> statement-breakpoint
DROP INDEX "projects_user_id_idx";--> statement-breakpoint
DROP INDEX "stores_project_id_idx";--> statement-breakpoint
DROP INDEX "team_project_id_idx";--> statement-breakpoint
DROP INDEX "team_project_email_unique";--> statement-breakpoint
DROP INDEX "tx_store_id_idx";--> statement-breakpoint
DROP INDEX "tx_order_date_idx";--> statement-breakpoint
DROP INDEX "tx_settlement_date_idx";--> statement-breakpoint
DROP INDEX "tx_store_order_unique";--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "file_uploads" ALTER COLUMN "uploaded_at" SET DATA TYPE timestamp with time zone USING "uploaded_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "file_uploads" ALTER COLUMN "uploaded_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "file_uploads" ALTER COLUMN "processed_at" SET DATA TYPE timestamp with time zone USING "processed_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "last_opname_date" SET DATA TYPE timestamp with time zone USING "last_opname_date" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "hpp" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "hpp" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "hpp_updated_at" SET DATA TYPE timestamp with time zone USING "hpp_updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "hpp_updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "expires" SET DATA TYPE timestamp with time zone USING "expires" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "token_expires_at" SET DATA TYPE timestamp with time zone USING "token_expires_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "last_synced_at" SET DATA TYPE timestamp with time zone USING "last_synced_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "invited_at" SET DATA TYPE timestamp with time zone USING "invited_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "invited_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "accepted_at" SET DATA TYPE timestamp with time zone USING "accepted_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "transaction_fees" ALTER COLUMN "amount" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transaction_items" ALTER COLUMN "unit_price" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transaction_items" ALTER COLUMN "hpp_at_time" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transaction_items" ALTER COLUMN "hpp_at_time" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "order_date" SET DATA TYPE timestamp with time zone USING "order_date" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "settlement_date" SET DATA TYPE timestamp with time zone USING "settlement_date" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "gross_amount" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "discount_amount" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "discount_amount" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "net_amount" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "total_fees" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "total_fees" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "emailVerified" SET DATA TYPE timestamp with time zone USING "emailVerified" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verificationTokens" ALTER COLUMN "expires" SET DATA TYPE timestamp with time zone USING "expires" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "quantity_after" integer;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transaction_fees" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "transaction_fees" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint

--> statement-breakpoint
-- Backfill project_id. Urutan penting: induk lebih dulu, anak menyusul.
UPDATE "product_variants" v SET "project_id" = p."project_id"
  FROM "products" p WHERE p."id" = v."product_id" AND v."project_id" IS NULL;--> statement-breakpoint
UPDATE "transactions" t SET "project_id" = s."project_id"
  FROM "stores" s WHERE s."id" = t."store_id" AND t."project_id" IS NULL;--> statement-breakpoint
UPDATE "transaction_fees" f SET "project_id" = t."project_id"
  FROM "transactions" t WHERE t."id" = f."transaction_id" AND f."project_id" IS NULL;--> statement-breakpoint
UPDATE "transaction_items" i SET "project_id" = t."project_id"
  FROM "transactions" t WHERE t."id" = i."transaction_id" AND i."project_id" IS NULL;--> statement-breakpoint
UPDATE "inventory" inv SET "project_id" = v."project_id"
  FROM "product_variants" v WHERE v."id" = inv."product_variant_id" AND inv."project_id" IS NULL;--> statement-breakpoint
UPDATE "inventory_movements" m SET "project_id" = v."project_id"
  FROM "product_variants" v WHERE v."id" = m."product_variant_id" AND m."project_id" IS NULL;--> statement-breakpoint
UPDATE "file_uploads" u SET "project_id" = s."project_id"
  FROM "stores" s WHERE s."id" = u."store_id" AND u."project_id" IS NULL;--> statement-breakpoint
-- Rekonstruksi quantity_after sebagai saldo berjalan per varian.
WITH running AS (
  SELECT "id", SUM("qty") OVER (
    PARTITION BY "product_variant_id" ORDER BY "created_at", "id" ROWS UNBOUNDED PRECEDING
  ) AS qty_after
  FROM "inventory_movements"
)
UPDATE "inventory_movements" m SET "quantity_after" = r.qty_after
  FROM running r WHERE r."id" = m."id" AND m."quantity_after" IS NULL;--> statement-breakpoint
ALTER TABLE "file_uploads" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "quantity_after" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_fees" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_items" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_fees" ADD CONSTRAINT "transaction_fees_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "uploads_project_id_idx" ON "file_uploads" USING btree ("project_id") WHERE "file_uploads"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "uploads_store_id_idx" ON "file_uploads" USING btree ("store_id") WHERE "file_uploads"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "uploads_user_id_idx" ON "file_uploads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "uploads_created_by_idx" ON "file_uploads" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "uploads_updated_by_idx" ON "file_uploads" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "inventory_project_id_idx" ON "inventory" USING btree ("project_id") WHERE "inventory"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "inventory_created_by_idx" ON "inventory" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "inventory_updated_by_idx" ON "inventory" USING btree ("updated_by");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_variant_unique" ON "inventory" USING btree ("product_variant_id") WHERE "inventory"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "movements_project_id_idx" ON "inventory_movements" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "movements_created_by_idx" ON "inventory_movements" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "movements_created_at_idx" ON "inventory_movements" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "variants_project_id_idx" ON "product_variants" USING btree ("project_id") WHERE "product_variants"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "variants_created_by_idx" ON "product_variants" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "variants_updated_by_idx" ON "product_variants" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "products_created_by_idx" ON "products" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "products_updated_by_idx" ON "products" USING btree ("updated_by");--> statement-breakpoint
CREATE UNIQUE INDEX "products_project_sku_unique" ON "products" USING btree ("project_id","sku") WHERE "products"."deleted_at" is null and "products"."sku" is not null;--> statement-breakpoint
CREATE INDEX "projects_created_by_idx" ON "projects" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "projects_updated_by_idx" ON "projects" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "stores_created_by_idx" ON "stores" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "stores_updated_by_idx" ON "stores" USING btree ("updated_by");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_platform_store_unique" ON "stores" USING btree ("project_id","platform","platform_store_id") WHERE "stores"."deleted_at" is null and "stores"."platform_store_id" is not null;--> statement-breakpoint
CREATE INDEX "team_user_id_idx" ON "team_members" USING btree ("user_id") WHERE "team_members"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "team_created_by_idx" ON "team_members" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "team_updated_by_idx" ON "team_members" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "fees_project_id_idx" ON "transaction_fees" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "items_project_id_idx" ON "transaction_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "items_variant_id_idx" ON "transaction_items" USING btree ("product_variant_id");--> statement-breakpoint
CREATE INDEX "tx_project_id_idx" ON "transactions" USING btree ("project_id") WHERE "transactions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "tx_created_by_idx" ON "transactions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "tx_updated_by_idx" ON "transactions" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "audit_created_at_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "variants_product_id_idx" ON "product_variants" USING btree ("product_id") WHERE "product_variants"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "products_project_id_idx" ON "products" USING btree ("project_id") WHERE "products"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id") WHERE "projects"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "stores_project_id_idx" ON "stores" USING btree ("project_id") WHERE "stores"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "team_project_id_idx" ON "team_members" USING btree ("project_id") WHERE "team_members"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "team_project_email_unique" ON "team_members" USING btree ("project_id","email") WHERE "team_members"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "tx_store_id_idx" ON "transactions" USING btree ("store_id") WHERE "transactions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "tx_order_date_idx" ON "transactions" USING btree ("order_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tx_settlement_date_idx" ON "transactions" USING btree ("settlement_date" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "tx_store_order_unique" ON "transactions" USING btree ("store_id","order_id") WHERE "transactions"."deleted_at" is null;