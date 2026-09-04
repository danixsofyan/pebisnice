-- =============================================================
-- Pebisnice v2.0 — skrip penerapan skema
--
-- DIBUAT OTOMATIS oleh scripts/build-deploy-sql.ts. Jangan diedit manual;
-- ubah migration-nya lalu jalankan `pnpm db:build-deploy`.
--
-- CARA PAKAI
--   1. Backup database lebih dulu.
--   2. Deploy kode aplikasi TERLEBIH DAHULU. Migration ini mengaktifkan RLS;
--      kode lama yang belum memakai withTenant() akan melihat tabel kosong.
--   3. Jalankan periksa-dulu di bawah. Bila ada duplikat, bersihkan sebelum
--      melanjutkan.
--   4. Tempel seluruh berkas ini ke SQL editor Supabase dan jalankan.
--   5. Jalankan verifikasi di bagian akhir.
--
-- Skrip ini idempoten untuk migration 0000 (dilewati sebagai baseline) dan
-- mencatat seluruh migration ke tabel pelacak drizzle, sehingga
-- `pnpm db:migrate` berikutnya hanya menjalankan yang benar-benar baru.
-- =============================================================

-- -------------------------------------------------------------
-- PERIKSA DULU — jalankan terpisah, pastikan keduanya 0 baris
-- -------------------------------------------------------------
-- SELECT provider, "providerAccountId", COUNT(*) FROM accounts
--   GROUP BY 1,2 HAVING COUNT(*) > 1;
-- SELECT identifier, token, COUNT(*) FROM "verificationTokens"
--   GROUP BY 1,2 HAVING COUNT(*) > 1;

BEGIN;

-- -------------------------------------------------------------
-- BASELINE: composite primary key yang hilang karena bug v1.0
-- -------------------------------------------------------------
DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_provider_providerAccountId_pk'
  ) THEN
    ALTER TABLE accounts
      ADD CONSTRAINT "accounts_provider_providerAccountId_pk"
      PRIMARY KEY (provider, "providerAccountId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'verificationTokens_identifier_token_pk'
  ) THEN
    ALTER TABLE "verificationTokens"
      ADD CONSTRAINT "verificationTokens_identifier_token_pk"
      PRIMARY KEY (identifier, token);
  END IF;
END;
$baseline$;


-- -------------------------------------------------------------
-- 0000_goofy_jimmy_woo — DILEWATI (baseline: tabel sudah ada di produksi)
-- -------------------------------------------------------------

-- -------------------------------------------------------------
-- 0001_ambiguous_iceman
-- -------------------------------------------------------------
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_product_variant_id_unique";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";

ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_project_id_projects_id_fk";

ALTER TABLE "file_uploads" DROP CONSTRAINT "file_uploads_user_id_users_id_fk";

ALTER TABLE "transaction_items" DROP CONSTRAINT "transaction_items_product_variant_id_product_variants_id_fk";

DROP INDEX "audit_created_at_idx";
DROP INDEX "variants_product_id_idx";
DROP INDEX "products_project_id_idx";
DROP INDEX "projects_user_id_idx";
DROP INDEX "stores_project_id_idx";
DROP INDEX "team_project_id_idx";
DROP INDEX "team_project_email_unique";
DROP INDEX "tx_store_id_idx";
DROP INDEX "tx_order_date_idx";
DROP INDEX "tx_settlement_date_idx";
DROP INDEX "tx_store_order_unique";
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "file_uploads" ALTER COLUMN "uploaded_at" SET DATA TYPE timestamp with time zone USING "uploaded_at" AT TIME ZONE 'UTC';
ALTER TABLE "file_uploads" ALTER COLUMN "uploaded_at" SET DEFAULT now();
ALTER TABLE "file_uploads" ALTER COLUMN "processed_at" SET DATA TYPE timestamp with time zone USING "processed_at" AT TIME ZONE 'UTC';
ALTER TABLE "inventory" ALTER COLUMN "last_opname_date" SET DATA TYPE timestamp with time zone USING "last_opname_date" AT TIME ZONE 'UTC';
ALTER TABLE "inventory" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "inventory" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "inventory_movements" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "inventory_movements" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "product_variants" ALTER COLUMN "hpp" SET DATA TYPE numeric(18, 2);
ALTER TABLE "product_variants" ALTER COLUMN "hpp" SET DEFAULT '0';
ALTER TABLE "product_variants" ALTER COLUMN "hpp_updated_at" SET DATA TYPE timestamp with time zone USING "hpp_updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "product_variants" ALTER COLUMN "hpp_updated_at" SET DEFAULT now();
ALTER TABLE "product_variants" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "product_variants" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "products" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "products" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "projects" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "projects" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "projects" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "projects" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "sessions" ALTER COLUMN "expires" SET DATA TYPE timestamp with time zone USING "expires" AT TIME ZONE 'UTC';
ALTER TABLE "stores" ALTER COLUMN "token_expires_at" SET DATA TYPE timestamp with time zone USING "token_expires_at" AT TIME ZONE 'UTC';
ALTER TABLE "stores" ALTER COLUMN "last_synced_at" SET DATA TYPE timestamp with time zone USING "last_synced_at" AT TIME ZONE 'UTC';
ALTER TABLE "stores" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "stores" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "stores" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "stores" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "team_members" ALTER COLUMN "invited_at" SET DATA TYPE timestamp with time zone USING "invited_at" AT TIME ZONE 'UTC';
ALTER TABLE "team_members" ALTER COLUMN "invited_at" SET DEFAULT now();
ALTER TABLE "team_members" ALTER COLUMN "accepted_at" SET DATA TYPE timestamp with time zone USING "accepted_at" AT TIME ZONE 'UTC';
ALTER TABLE "transaction_fees" ALTER COLUMN "amount" SET DATA TYPE numeric(18, 2);
ALTER TABLE "transaction_items" ALTER COLUMN "unit_price" SET DATA TYPE numeric(18, 2);
ALTER TABLE "transaction_items" ALTER COLUMN "hpp_at_time" SET DATA TYPE numeric(18, 2);
ALTER TABLE "transaction_items" ALTER COLUMN "hpp_at_time" SET DEFAULT '0';
ALTER TABLE "transactions" ALTER COLUMN "order_date" SET DATA TYPE timestamp with time zone USING "order_date" AT TIME ZONE 'UTC';
ALTER TABLE "transactions" ALTER COLUMN "settlement_date" SET DATA TYPE timestamp with time zone USING "settlement_date" AT TIME ZONE 'UTC';
ALTER TABLE "transactions" ALTER COLUMN "gross_amount" SET DATA TYPE numeric(18, 2);
ALTER TABLE "transactions" ALTER COLUMN "discount_amount" SET DATA TYPE numeric(18, 2);
ALTER TABLE "transactions" ALTER COLUMN "discount_amount" SET DEFAULT '0';
ALTER TABLE "transactions" ALTER COLUMN "net_amount" SET DATA TYPE numeric(18, 2);
ALTER TABLE "transactions" ALTER COLUMN "total_fees" SET DATA TYPE numeric(18, 2);
ALTER TABLE "transactions" ALTER COLUMN "total_fees" SET DEFAULT '0';
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "users" ALTER COLUMN "emailVerified" SET DATA TYPE timestamp with time zone USING "emailVerified" AT TIME ZONE 'UTC';
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "verificationTokens" ALTER COLUMN "expires" SET DATA TYPE timestamp with time zone USING "expires" AT TIME ZONE 'UTC';
ALTER TABLE "file_uploads" ADD COLUMN "project_id" uuid;
ALTER TABLE "file_uploads" ADD COLUMN "created_by" text;
ALTER TABLE "file_uploads" ADD COLUMN "updated_by" text;
ALTER TABLE "file_uploads" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "file_uploads" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "file_uploads" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "file_uploads" ADD COLUMN "deleted_at" timestamp with time zone;
ALTER TABLE "inventory" ADD COLUMN "project_id" uuid;
ALTER TABLE "inventory" ADD COLUMN "created_by" text;
ALTER TABLE "inventory" ADD COLUMN "updated_by" text;
ALTER TABLE "inventory" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "inventory" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "inventory" ADD COLUMN "deleted_at" timestamp with time zone;
ALTER TABLE "inventory_movements" ADD COLUMN "project_id" uuid;
ALTER TABLE "inventory_movements" ADD COLUMN "quantity_after" integer;
ALTER TABLE "inventory_movements" ADD COLUMN "created_by" text;
ALTER TABLE "product_variants" ADD COLUMN "project_id" uuid;
ALTER TABLE "product_variants" ADD COLUMN "created_by" text;
ALTER TABLE "product_variants" ADD COLUMN "updated_by" text;
ALTER TABLE "product_variants" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "product_variants" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "product_variants" ADD COLUMN "deleted_at" timestamp with time zone;
ALTER TABLE "products" ADD COLUMN "created_by" text;
ALTER TABLE "products" ADD COLUMN "updated_by" text;
ALTER TABLE "products" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "products" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "products" ADD COLUMN "deleted_at" timestamp with time zone;
ALTER TABLE "projects" ADD COLUMN "created_by" text;
ALTER TABLE "projects" ADD COLUMN "updated_by" text;
ALTER TABLE "projects" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp with time zone;
ALTER TABLE "stores" ADD COLUMN "created_by" text;
ALTER TABLE "stores" ADD COLUMN "updated_by" text;
ALTER TABLE "stores" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "stores" ADD COLUMN "deleted_at" timestamp with time zone;
ALTER TABLE "team_members" ADD COLUMN "created_by" text;
ALTER TABLE "team_members" ADD COLUMN "updated_by" text;
ALTER TABLE "team_members" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "team_members" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "team_members" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "team_members" ADD COLUMN "deleted_at" timestamp with time zone;
ALTER TABLE "transaction_fees" ADD COLUMN "project_id" uuid;
ALTER TABLE "transaction_fees" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "transaction_items" ADD COLUMN "project_id" uuid;
ALTER TABLE "transaction_items" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "transactions" ADD COLUMN "project_id" uuid;
ALTER TABLE "transactions" ADD COLUMN "created_by" text;
ALTER TABLE "transactions" ADD COLUMN "updated_by" text;
ALTER TABLE "transactions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "transactions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "transactions" ADD COLUMN "deleted_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;


-- Backfill project_id. Urutan penting: induk lebih dulu, anak menyusul.
UPDATE "product_variants" v SET "project_id" = p."project_id"
  FROM "products" p WHERE p."id" = v."product_id" AND v."project_id" IS NULL;
UPDATE "transactions" t SET "project_id" = s."project_id"
  FROM "stores" s WHERE s."id" = t."store_id" AND t."project_id" IS NULL;
UPDATE "transaction_fees" f SET "project_id" = t."project_id"
  FROM "transactions" t WHERE t."id" = f."transaction_id" AND f."project_id" IS NULL;
UPDATE "transaction_items" i SET "project_id" = t."project_id"
  FROM "transactions" t WHERE t."id" = i."transaction_id" AND i."project_id" IS NULL;
UPDATE "inventory" inv SET "project_id" = v."project_id"
  FROM "product_variants" v WHERE v."id" = inv."product_variant_id" AND inv."project_id" IS NULL;
UPDATE "inventory_movements" m SET "project_id" = v."project_id"
  FROM "product_variants" v WHERE v."id" = m."product_variant_id" AND m."project_id" IS NULL;
UPDATE "file_uploads" u SET "project_id" = s."project_id"
  FROM "stores" s WHERE s."id" = u."store_id" AND u."project_id" IS NULL;
-- Rekonstruksi quantity_after sebagai saldo berjalan per varian.
WITH running AS (
  SELECT "id", SUM("qty") OVER (
    PARTITION BY "product_variant_id" ORDER BY "created_at", "id" ROWS UNBOUNDED PRECEDING
  ) AS qty_after
  FROM "inventory_movements"
)
UPDATE "inventory_movements" m SET "quantity_after" = r.qty_after
  FROM running r WHERE r."id" = m."id" AND m."quantity_after" IS NULL;
ALTER TABLE "file_uploads" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "inventory" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "inventory_movements" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "inventory_movements" ALTER COLUMN "quantity_after" SET NOT NULL;
ALTER TABLE "product_variants" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "transaction_fees" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "transaction_items" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "transactions" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "stores" ADD CONSTRAINT "stores_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "stores" ADD CONSTRAINT "stores_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "transaction_fees" ADD CONSTRAINT "transaction_fees_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "uploads_project_id_idx" ON "file_uploads" USING btree ("project_id") WHERE "file_uploads"."deleted_at" is null;
CREATE INDEX "uploads_store_id_idx" ON "file_uploads" USING btree ("store_id") WHERE "file_uploads"."deleted_at" is null;
CREATE INDEX "uploads_user_id_idx" ON "file_uploads" USING btree ("user_id");
CREATE INDEX "uploads_created_by_idx" ON "file_uploads" USING btree ("created_by");
CREATE INDEX "uploads_updated_by_idx" ON "file_uploads" USING btree ("updated_by");
CREATE INDEX "inventory_project_id_idx" ON "inventory" USING btree ("project_id") WHERE "inventory"."deleted_at" is null;
CREATE INDEX "inventory_created_by_idx" ON "inventory" USING btree ("created_by");
CREATE INDEX "inventory_updated_by_idx" ON "inventory" USING btree ("updated_by");
CREATE UNIQUE INDEX "inventory_variant_unique" ON "inventory" USING btree ("product_variant_id") WHERE "inventory"."deleted_at" is null;
CREATE INDEX "movements_project_id_idx" ON "inventory_movements" USING btree ("project_id");
CREATE INDEX "movements_created_by_idx" ON "inventory_movements" USING btree ("created_by");
CREATE INDEX "movements_created_at_idx" ON "inventory_movements" USING btree ("created_at" DESC NULLS LAST);
CREATE INDEX "variants_project_id_idx" ON "product_variants" USING btree ("project_id") WHERE "product_variants"."deleted_at" is null;
CREATE INDEX "variants_created_by_idx" ON "product_variants" USING btree ("created_by");
CREATE INDEX "variants_updated_by_idx" ON "product_variants" USING btree ("updated_by");
CREATE INDEX "products_created_by_idx" ON "products" USING btree ("created_by");
CREATE INDEX "products_updated_by_idx" ON "products" USING btree ("updated_by");
CREATE UNIQUE INDEX "products_project_sku_unique" ON "products" USING btree ("project_id","sku") WHERE "products"."deleted_at" is null and "products"."sku" is not null;
CREATE INDEX "projects_created_by_idx" ON "projects" USING btree ("created_by");
CREATE INDEX "projects_updated_by_idx" ON "projects" USING btree ("updated_by");
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("userId");
CREATE INDEX "stores_created_by_idx" ON "stores" USING btree ("created_by");
CREATE INDEX "stores_updated_by_idx" ON "stores" USING btree ("updated_by");
CREATE UNIQUE INDEX "stores_platform_store_unique" ON "stores" USING btree ("project_id","platform","platform_store_id") WHERE "stores"."deleted_at" is null and "stores"."platform_store_id" is not null;
CREATE INDEX "team_user_id_idx" ON "team_members" USING btree ("user_id") WHERE "team_members"."deleted_at" is null;
CREATE INDEX "team_created_by_idx" ON "team_members" USING btree ("created_by");
CREATE INDEX "team_updated_by_idx" ON "team_members" USING btree ("updated_by");
CREATE INDEX "fees_project_id_idx" ON "transaction_fees" USING btree ("project_id");
CREATE INDEX "items_project_id_idx" ON "transaction_items" USING btree ("project_id");
CREATE INDEX "items_variant_id_idx" ON "transaction_items" USING btree ("product_variant_id");
CREATE INDEX "tx_project_id_idx" ON "transactions" USING btree ("project_id") WHERE "transactions"."deleted_at" is null;
CREATE INDEX "tx_created_by_idx" ON "transactions" USING btree ("created_by");
CREATE INDEX "tx_updated_by_idx" ON "transactions" USING btree ("updated_by");
CREATE INDEX "audit_created_at_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);
CREATE INDEX "variants_product_id_idx" ON "product_variants" USING btree ("product_id") WHERE "product_variants"."deleted_at" is null;
CREATE INDEX "products_project_id_idx" ON "products" USING btree ("project_id") WHERE "products"."deleted_at" is null;
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id") WHERE "projects"."deleted_at" is null;
CREATE INDEX "stores_project_id_idx" ON "stores" USING btree ("project_id") WHERE "stores"."deleted_at" is null;
CREATE INDEX "team_project_id_idx" ON "team_members" USING btree ("project_id") WHERE "team_members"."deleted_at" is null;
CREATE UNIQUE INDEX "team_project_email_unique" ON "team_members" USING btree ("project_id","email") WHERE "team_members"."deleted_at" is null;
CREATE INDEX "tx_store_id_idx" ON "transactions" USING btree ("store_id") WHERE "transactions"."deleted_at" is null;
CREATE INDEX "tx_order_date_idx" ON "transactions" USING btree ("order_date" DESC NULLS LAST);
CREATE INDEX "tx_settlement_date_idx" ON "transactions" USING btree ("settlement_date" DESC NULLS LAST);
CREATE UNIQUE INDEX "tx_store_order_unique" ON "transactions" USING btree ("store_id","order_id") WHERE "transactions"."deleted_at" is null;

-- -------------------------------------------------------------
-- 0002_branches_and_branch_scoped_inventory
-- -------------------------------------------------------------
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

DROP INDEX "inventory_variant_unique";
ALTER TABLE "inventory" ADD COLUMN "branch_id" uuid;
ALTER TABLE "inventory_movements" ADD COLUMN "branch_id" uuid;
ALTER TABLE "stores" ADD COLUMN "branch_id" uuid;
ALTER TABLE "team_members" ADD COLUMN "branch_id" uuid;
ALTER TABLE "branches" ADD CONSTRAINT "branches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "branches" ADD CONSTRAINT "branches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "branches" ADD CONSTRAINT "branches_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "branches_project_id_idx" ON "branches" USING btree ("project_id") WHERE "branches"."deleted_at" is null;
CREATE INDEX "branches_created_by_idx" ON "branches" USING btree ("created_by");
CREATE INDEX "branches_updated_by_idx" ON "branches" USING btree ("updated_by");
CREATE UNIQUE INDEX "branches_project_code_unique" ON "branches" USING btree ("project_id","code") WHERE "branches"."deleted_at" is null;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "stores" ADD CONSTRAINT "stores_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;

-- Setiap project mendapat satu cabang default. Project lama otomatis punya
-- "Pusat" supaya stok yang sudah ada punya rumah.
INSERT INTO "branches" ("project_id", "name", "code", "created_by", "updated_by")
SELECT p."id", 'Pusat', 'PUSAT', p."user_id", p."user_id"
FROM "projects" p
WHERE p."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "branches" b WHERE b."project_id" = p."id" AND b."deleted_at" IS NULL
  );
-- Arahkan seluruh stok, ledger, dan store yang sudah ada ke cabang default.
UPDATE "inventory" inv SET "branch_id" = b."id"
  FROM "branches" b
  WHERE b."project_id" = inv."project_id" AND b."code" = 'PUSAT' AND inv."branch_id" IS NULL;
UPDATE "inventory_movements" m SET "branch_id" = b."id"
  FROM "branches" b
  WHERE b."project_id" = m."project_id" AND b."code" = 'PUSAT' AND m."branch_id" IS NULL;
UPDATE "stores" s SET "branch_id" = b."id"
  FROM "branches" b
  WHERE b."project_id" = s."project_id" AND b."code" = 'PUSAT' AND s."branch_id" IS NULL;
ALTER TABLE "inventory" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "inventory_movements" ALTER COLUMN "branch_id" SET NOT NULL;
CREATE INDEX "inventory_branch_id_idx" ON "inventory" USING btree ("branch_id") WHERE "inventory"."deleted_at" is null;
CREATE UNIQUE INDEX "inventory_branch_variant_unique" ON "inventory" USING btree ("branch_id","product_variant_id") WHERE "inventory"."deleted_at" is null;
CREATE INDEX "movements_branch_variant_idx" ON "inventory_movements" USING btree ("branch_id","product_variant_id");
CREATE INDEX "stores_branch_id_idx" ON "stores" USING btree ("branch_id") WHERE "stores"."deleted_at" is null;
CREATE INDEX "team_branch_id_idx" ON "team_members" USING btree ("branch_id") WHERE "team_members"."deleted_at" is null;

-- -------------------------------------------------------------
-- 0003_triggers_and_rls
-- -------------------------------------------------------------
-- Trigger, immutability, dan Row-Level Security.
-- Mengikuti docs/db-standards.md §3, §10, dan §11.

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION fn_prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Tabel % bersifat immutable, tidak dapat diubah atau dihapus', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;


DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY[
        'users', 'projects', 'branches', 'stores', 'products', 'product_variants',
        'transactions', 'inventory', 'team_members', 'file_uploads'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', target, target);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
            target, target
        );
    END LOOP;
END;
$$;


DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY['audit_logs', 'inventory_movements'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_immutable ON %I', target, target);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_immutable BEFORE UPDATE OR DELETE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_prevent_mutation()',
            target, target
        );
    END LOOP;
END;
$$;


-- Row-Level Security sebagai lapis kedua isolasi tenant.
--
-- Lapis pertama tetap pengecekan permission di service layer; policy ini
-- memastikan query yang lolos dari sana pun tidak bisa menyentuh baris milik
-- project lain. `withTenant()` di lib/db/tenant.ts yang mengisi setting-nya.
--
-- Bila app.current_project_id belum di-set, current_setting(..., true)
-- mengembalikan NULL sehingga perbandingan bernilai NULL dan seluruh baris
-- tersaring — gagal tertutup, bukan gagal terbuka.
--
-- Tabel yang sengaja TIDAK memakai policy ini:
--   users, accounts, sessions, verificationTokens  -> milik Auth.js, lintas tenant
--   projects                                       -> perlu dibaca sebelum tenant dipilih
--   audit_logs                                     -> project_id nullable (event login
--                                                     tidak terikat project); dibatasi DAL
--
-- PENTING: RLS tidak berlaku untuk role superuser maupun role ber-BYPASSRLS.
-- Supaya policy ini benar-benar aktif, aplikasi harus terhubung memakai role
-- terbatas, bukan role `postgres` bawaan Supabase. Lihat docs/PLAN.md.
DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY[
        'branches', 'stores', 'products', 'product_variants', 'transactions',
        'transaction_fees', 'transaction_items', 'inventory',
        'inventory_movements', 'team_members', 'file_uploads'
    ] LOOP
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

-- -------------------------------------------------------------
-- 0004_extend_team_roles
-- -------------------------------------------------------------
ALTER TYPE "public"."team_role" ADD VALUE 'manager' BEFORE 'finance';
ALTER TYPE "public"."team_role" ADD VALUE 'cashier' BEFORE 'operator';
ALTER TYPE "public"."team_role" ADD VALUE 'production' BEFORE 'operator';

-- -------------------------------------------------------------
-- 0005_pos_channel_and_cash_sessions
-- -------------------------------------------------------------
CREATE TYPE "public"."cash_session_status" AS ENUM('open', 'closed');
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'transfer', 'qris', 'card', 'other');
CREATE TYPE "public"."sales_channel" AS ENUM('marketplace', 'pos');
CREATE TABLE "cash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"status" "cash_session_status" DEFAULT 'open' NOT NULL,
	"opened_by" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opening_balance" numeric(18, 2) DEFAULT '0' NOT NULL,
	"closed_by" text,
	"closed_at" timestamp with time zone,
	"expected_balance" numeric(18, 2),
	"counted_balance" numeric(18, 2),
	"difference" numeric(18, 2),
	"note" text,
	"created_by" text,
	"updated_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);

DROP INDEX "tx_store_order_unique";
ALTER TABLE "transactions" ALTER COLUMN "store_id" DROP NOT NULL;
ALTER TABLE "transactions" ADD COLUMN "channel" "sales_channel" DEFAULT 'marketplace' NOT NULL;
ALTER TABLE "transactions" ADD COLUMN "branch_id" uuid;
ALTER TABLE "transactions" ADD COLUMN "cash_session_id" uuid;
ALTER TABLE "transactions" ADD COLUMN "payment_method" "payment_method";
ALTER TABLE "transactions" ADD COLUMN "paid_amount" numeric(18, 2);
ALTER TABLE "transactions" ADD COLUMN "change_amount" numeric(18, 2);
ALTER TABLE "transactions" ADD COLUMN "voided_at" timestamp with time zone;
ALTER TABLE "transactions" ADD COLUMN "voided_by" text;
ALTER TABLE "transactions" ADD COLUMN "void_reason" text;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "cash_sessions_project_id_idx" ON "cash_sessions" USING btree ("project_id") WHERE "cash_sessions"."deleted_at" is null;
CREATE INDEX "cash_sessions_branch_id_idx" ON "cash_sessions" USING btree ("branch_id") WHERE "cash_sessions"."deleted_at" is null;
CREATE INDEX "cash_sessions_opened_by_idx" ON "cash_sessions" USING btree ("opened_by");
CREATE INDEX "cash_sessions_closed_by_idx" ON "cash_sessions" USING btree ("closed_by");
CREATE INDEX "cash_sessions_created_by_idx" ON "cash_sessions" USING btree ("created_by");
CREATE INDEX "cash_sessions_updated_by_idx" ON "cash_sessions" USING btree ("updated_by");
CREATE UNIQUE INDEX "cash_sessions_one_open_per_branch" ON "cash_sessions" USING btree ("branch_id") WHERE "cash_sessions"."status" = 'open' and "cash_sessions"."deleted_at" is null;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cash_session_id_cash_sessions_id_fk" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "tx_channel_idx" ON "transactions" USING btree ("project_id","channel") WHERE "transactions"."deleted_at" is null;
CREATE INDEX "tx_branch_id_idx" ON "transactions" USING btree ("branch_id") WHERE "transactions"."deleted_at" is null;
CREATE INDEX "tx_cash_session_id_idx" ON "transactions" USING btree ("cash_session_id");
CREATE INDEX "tx_voided_by_idx" ON "transactions" USING btree ("voided_by");
CREATE UNIQUE INDEX "tx_project_order_unique" ON "transactions" USING btree ("project_id","order_id") WHERE "transactions"."deleted_at" is null and "transactions"."channel" = 'pos';
CREATE UNIQUE INDEX "tx_store_order_unique" ON "transactions" USING btree ("store_id","order_id") WHERE "transactions"."deleted_at" is null and "transactions"."store_id" is not null;
-- Bentuk baris harus konsisten dengan channel-nya. Tanpa ini, baris POS tanpa
-- cabang atau baris marketplace tanpa store bisa tersimpan diam-diam.
ALTER TABLE "transactions" ADD CONSTRAINT "chk_transactions_channel_shape" CHECK (
  (
    "channel" = 'marketplace'
    AND "store_id" IS NOT NULL
    AND "branch_id" IS NULL
    AND "cash_session_id" IS NULL
  ) OR (
    "channel" = 'pos'
    AND "store_id" IS NULL
    AND "branch_id" IS NOT NULL
    AND "cash_session_id" IS NOT NULL
    AND "payment_method" IS NOT NULL
    AND "paid_amount" IS NOT NULL
    AND "change_amount" IS NOT NULL
  )
);

-- Void selalu lengkap: waktu, pelaku, dan alasan, atau tidak sama sekali.
ALTER TABLE "transactions" ADD CONSTRAINT "chk_transactions_void_complete" CHECK (
  ("voided_at" IS NULL AND "voided_by" IS NULL AND "void_reason" IS NULL)
  OR ("voided_at" IS NOT NULL AND "voided_by" IS NOT NULL AND "void_reason" IS NOT NULL)
);

ALTER TABLE "transactions" ADD CONSTRAINT "chk_transactions_amounts_non_negative" CHECK (
  "gross_amount" >= 0 AND "discount_amount" >= 0 AND "total_fees" >= 0
  AND ("paid_amount" IS NULL OR "paid_amount" >= 0)
  AND ("change_amount" IS NULL OR "change_amount" >= 0)
);

-- Sesi kas: modal dan hasil hitung tidak boleh negatif; selisih boleh.
ALTER TABLE "cash_sessions" ADD CONSTRAINT "chk_cash_sessions_non_negative" CHECK (
  "opening_balance" >= 0
  AND ("counted_balance" IS NULL OR "counted_balance" >= 0)
  AND ("expected_balance" IS NULL OR "expected_balance" >= 0)
);

-- Sesi tertutup wajib punya seluruh angka penutupnya.
ALTER TABLE "cash_sessions" ADD CONSTRAINT "chk_cash_sessions_closed_complete" CHECK (
  "status" = 'open'
  OR (
    "closed_at" IS NOT NULL
    AND "closed_by" IS NOT NULL
    AND "expected_balance" IS NOT NULL
    AND "counted_balance" IS NOT NULL
    AND "difference" IS NOT NULL
  )
);

-- Tabel baru harus ikut mendapat trigger dan RLS; migration 0003 mendaftarnya
-- satu per satu sehingga cash_sessions belum tercakup di sana.
DROP TRIGGER IF EXISTS trg_cash_sessions_updated_at ON cash_sessions;
CREATE TRIGGER trg_cash_sessions_updated_at
  BEFORE UPDATE ON cash_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE "cash_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_sessions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_cash_sessions_tenant ON cash_sessions;
CREATE POLICY policy_cash_sessions_tenant ON cash_sessions
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);

-- -------------------------------------------------------------
-- 0006_production_logs
-- -------------------------------------------------------------
CREATE TYPE "public"."product_type" AS ENUM('finished', 'material');
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

CREATE TABLE "production_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"production_log_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"cost_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "products" ADD COLUMN "type" "product_type" DEFAULT 'finished' NOT NULL;
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "production_materials" ADD CONSTRAINT "production_materials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "production_materials" ADD CONSTRAINT "production_materials_production_log_id_production_logs_id_fk" FOREIGN KEY ("production_log_id") REFERENCES "public"."production_logs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "production_materials" ADD CONSTRAINT "production_materials_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "production_project_id_idx" ON "production_logs" USING btree ("project_id") WHERE "production_logs"."deleted_at" is null;
CREATE INDEX "production_branch_id_idx" ON "production_logs" USING btree ("branch_id") WHERE "production_logs"."deleted_at" is null;
CREATE INDEX "production_variant_id_idx" ON "production_logs" USING btree ("product_variant_id");
CREATE INDEX "production_date_idx" ON "production_logs" USING btree ("production_date" DESC NULLS LAST);
CREATE INDEX "production_created_by_idx" ON "production_logs" USING btree ("created_by");
CREATE INDEX "production_updated_by_idx" ON "production_logs" USING btree ("updated_by");
CREATE INDEX "production_materials_log_id_idx" ON "production_materials" USING btree ("production_log_id");
CREATE INDEX "production_materials_project_id_idx" ON "production_materials" USING btree ("project_id");
CREATE INDEX "production_materials_variant_id_idx" ON "production_materials" USING btree ("product_variant_id");
CREATE INDEX "products_type_idx" ON "products" USING btree ("project_id","type") WHERE "products"."deleted_at" is null;
ALTER TABLE "production_logs" ADD CONSTRAINT "chk_production_logs_positive" CHECK (
  "quantity" > 0 AND "total_material_cost" >= 0 AND "unit_cost" >= 0
);
ALTER TABLE "production_materials" ADD CONSTRAINT "chk_production_materials_positive" CHECK (
  "quantity" > 0 AND "cost_amount" >= 0
);
-- Satu bahan hanya boleh tercatat sekali per log produksi.
CREATE UNIQUE INDEX "production_materials_log_variant_unique"
  ON "production_materials" ("production_log_id", "product_variant_id");

-- Tabel baru wajib ikut mendapat trigger updated_at dan policy RLS.
DROP TRIGGER IF EXISTS trg_production_logs_updated_at ON production_logs;
CREATE TRIGGER trg_production_logs_updated_at
  BEFORE UPDATE ON production_logs
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

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

-- -------------------------------------------------------------
-- 0007_expenses
-- -------------------------------------------------------------
CREATE TYPE "public"."expense_category" AS ENUM('rent', 'salary', 'utility', 'marketing', 'shipping', 'supply', 'tax', 'other');
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

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "expenses_project_id_idx" ON "expenses" USING btree ("project_id") WHERE "expenses"."deleted_at" is null;
CREATE INDEX "expenses_branch_id_idx" ON "expenses" USING btree ("branch_id") WHERE "expenses"."deleted_at" is null;
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("project_id","expense_date" DESC NULLS LAST) WHERE "expenses"."deleted_at" is null;
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("project_id","category");
CREATE INDEX "expenses_created_by_idx" ON "expenses" USING btree ("created_by");
CREATE INDEX "expenses_updated_by_idx" ON "expenses" USING btree ("updated_by");
ALTER TABLE "expenses" ADD CONSTRAINT "chk_expenses_amount_positive" CHECK ("amount" > 0);

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_expenses_tenant ON expenses;
CREATE POLICY policy_expenses_tenant ON expenses
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);

-- -------------------------------------------------------------
-- 0008_product_image_key
-- -------------------------------------------------------------
ALTER TABLE "products" ADD COLUMN "image_key" text;

-- -------------------------------------------------------------
-- 0009_billing
-- -------------------------------------------------------------
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'expired', 'canceled', 'refunded');
CREATE TYPE "public"."plan_interval" AS ENUM('trial', 'monthly', 'yearly');
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'expired', 'canceled');
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"interval" "plan_interval" NOT NULL,
	"price" numeric(18, 2) DEFAULT '0' NOT NULL,
	"trial_days" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);

CREATE TABLE "subscription_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" uuid,
	"plan_id" uuid NOT NULL,
	"order_id" text NOT NULL,
	"gross_amount" numeric(18, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_type" text,
	"snap_token" text,
	"snap_redirect_url" text,
	"midtrans_transaction_id" text,
	"fraud_status" text,
	"raw" jsonb,
	"paid_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);

CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"canceled_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);

ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;
CREATE UNIQUE INDEX "plans_code_unique" ON "plans" USING btree ("code") WHERE "plans"."deleted_at" is null;
CREATE INDEX "plans_active_idx" ON "plans" USING btree ("is_active","sort_order") WHERE "plans"."deleted_at" is null;
CREATE UNIQUE INDEX "subscription_payments_order_id_unique" ON "subscription_payments" USING btree ("order_id");
CREATE INDEX "subscription_payments_user_idx" ON "subscription_payments" USING btree ("user_id") WHERE "subscription_payments"."deleted_at" is null;
CREATE INDEX "subscription_payments_status_idx" ON "subscription_payments" USING btree ("status");
CREATE UNIQUE INDEX "subscriptions_user_unique" ON "subscriptions" USING btree ("user_id") WHERE "subscriptions"."deleted_at" is null;
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");
CREATE INDEX "subscriptions_period_end_idx" ON "subscriptions" USING btree ("current_period_end");

DROP TRIGGER IF EXISTS trg_plans_updated_at ON plans;
CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_subscription_payments_updated_at ON subscription_payments;
CREATE TRIGGER trg_subscription_payments_updated_at
  BEFORE UPDATE ON subscription_payments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- -------------------------------------------------------------
-- 0010_platform_admin
-- -------------------------------------------------------------
ALTER TABLE "users" ADD COLUMN "is_platform_admin" boolean DEFAULT false NOT NULL;

-- -------------------------------------------------------------
-- Catat seluruh migration sebagai sudah diterapkan, supaya
-- `pnpm db:migrate` berikutnya hanya menjalankan yang baru.
-- -------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
SELECT v.hash, v.created_at
FROM (VALUES
  ('c87e766f42d6abec29822c6b82c904343d74d9063d2a13119400ca43671094f9', 1788438605874),
  ('670807c5fd4819f4fa56decc5edefb402430ca5f6481ced9a79050ac616f4ef2', 1788440434332),
  ('2c0d96bc52137620f58fb100612c26549f02d9b7ac17ca30b56848b10a24047e', 1788441441426),
  ('b6f13023b8d6e21c253fcfdf8ca0e1cc770ff70d415239ace0097e9610dcf80e', 1788441442426),
  ('dcb5105d5d3ac93c6cc1f55b8fe17a1f6c3b0c61f7d3da42c0074dd8cd87b29e', 1788474677802),
  ('24d0d59b06eff9e35b28d58879cede494129a6ed0b7c23964821b613c75e3b6b', 1788475628396),
  ('57305f684173f8f26362083ddd251b3a37c117a90fe3a481feea00a0b7ba713a', 1788476692629),
  ('b39d8622e7ffcc89fffc363ab128ff15681d58fff745da1c294005c7ce55e468', 1788477036154),
  ('3200d85a937e634f60307c6e8f2e8eef3e7e8320c75af5bf60547de4892ace60', 1788508982075),
  ('278096f0caaadb74247333b7a124e3d17a441a9b09e641e3b2646be27881f5e9', 1788511994647),
  ('694463c40a6b18464f91e8d3a7f6de9e91ccd291116bb87006777e60daa7d3f5', 1788514984456)
) AS v(hash, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM "drizzle"."__drizzle_migrations" m WHERE m.hash = v.hash
);


COMMIT;

-- =============================================================
-- VERIFIKASI — jalankan setelah COMMIT, semua harus sesuai harapan
-- =============================================================
-- Tidak boleh ada baris tanpa cabang:
--   SELECT COUNT(*) FROM inventory WHERE branch_id IS NULL;            -- harus 0
--   SELECT COUNT(*) FROM inventory_movements WHERE branch_id IS NULL;  -- harus 0
--
-- Setiap project punya cabang Pusat:
--   SELECT p.name FROM projects p
--   WHERE p.deleted_at IS NULL AND NOT EXISTS (
--     SELECT 1 FROM branches b WHERE b.project_id = p.id AND b.deleted_at IS NULL
--   );                                                                 -- harus kosong
--
-- Waktu tidak bergeser (bandingkan dengan catatan Anda):
--   SELECT order_id, order_date FROM transactions ORDER BY order_date DESC LIMIT 5;
--
-- RLS aktif di tabel bisnis:
--   SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
--   WHERE relname IN ('transactions','inventory','expenses','cash_sessions')
--   ORDER BY relname;                                                  -- semua true
--
-- PENTING: RLS tidak berlaku untuk superuser. Selama DATABASE_URL memakai
-- role `postgres` bawaan Supabase, policy di atas belum efektif. Lihat
-- supabase/migrations/README.md untuk membuat role terbatas.

