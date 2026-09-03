CREATE TYPE "public"."cash_session_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'transfer', 'qris', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."sales_channel" AS ENUM('marketplace', 'pos');--> statement-breakpoint
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
--> statement-breakpoint
DROP INDEX "tx_store_order_unique";--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "store_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "channel" "sales_channel" DEFAULT 'marketplace' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "cash_session_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_method" "payment_method";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "paid_amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "change_amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "voided_by" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "void_reason" text;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_sessions_project_id_idx" ON "cash_sessions" USING btree ("project_id") WHERE "cash_sessions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "cash_sessions_branch_id_idx" ON "cash_sessions" USING btree ("branch_id") WHERE "cash_sessions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "cash_sessions_opened_by_idx" ON "cash_sessions" USING btree ("opened_by");--> statement-breakpoint
CREATE INDEX "cash_sessions_closed_by_idx" ON "cash_sessions" USING btree ("closed_by");--> statement-breakpoint
CREATE INDEX "cash_sessions_created_by_idx" ON "cash_sessions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "cash_sessions_updated_by_idx" ON "cash_sessions" USING btree ("updated_by");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_sessions_one_open_per_branch" ON "cash_sessions" USING btree ("branch_id") WHERE "cash_sessions"."status" = 'open' and "cash_sessions"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cash_session_id_cash_sessions_id_fk" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tx_channel_idx" ON "transactions" USING btree ("project_id","channel") WHERE "transactions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "tx_branch_id_idx" ON "transactions" USING btree ("branch_id") WHERE "transactions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "tx_cash_session_id_idx" ON "transactions" USING btree ("cash_session_id");--> statement-breakpoint
CREATE INDEX "tx_voided_by_idx" ON "transactions" USING btree ("voided_by");--> statement-breakpoint
CREATE UNIQUE INDEX "tx_project_order_unique" ON "transactions" USING btree ("project_id","order_id") WHERE "transactions"."deleted_at" is null and "transactions"."channel" = 'pos';--> statement-breakpoint
CREATE UNIQUE INDEX "tx_store_order_unique" ON "transactions" USING btree ("store_id","order_id") WHERE "transactions"."deleted_at" is null and "transactions"."store_id" is not null;--> statement-breakpoint
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
);--> statement-breakpoint

-- Void selalu lengkap: waktu, pelaku, dan alasan, atau tidak sama sekali.
ALTER TABLE "transactions" ADD CONSTRAINT "chk_transactions_void_complete" CHECK (
  ("voided_at" IS NULL AND "voided_by" IS NULL AND "void_reason" IS NULL)
  OR ("voided_at" IS NOT NULL AND "voided_by" IS NOT NULL AND "void_reason" IS NOT NULL)
);--> statement-breakpoint

ALTER TABLE "transactions" ADD CONSTRAINT "chk_transactions_amounts_non_negative" CHECK (
  "gross_amount" >= 0 AND "discount_amount" >= 0 AND "total_fees" >= 0
  AND ("paid_amount" IS NULL OR "paid_amount" >= 0)
  AND ("change_amount" IS NULL OR "change_amount" >= 0)
);--> statement-breakpoint

-- Sesi kas: modal dan hasil hitung tidak boleh negatif; selisih boleh.
ALTER TABLE "cash_sessions" ADD CONSTRAINT "chk_cash_sessions_non_negative" CHECK (
  "opening_balance" >= 0
  AND ("counted_balance" IS NULL OR "counted_balance" >= 0)
  AND ("expected_balance" IS NULL OR "expected_balance" >= 0)
);--> statement-breakpoint

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
);--> statement-breakpoint

-- Tabel baru harus ikut mendapat trigger dan RLS; migration 0003 mendaftarnya
-- satu per satu sehingga cash_sessions belum tercakup di sana.
DROP TRIGGER IF EXISTS trg_cash_sessions_updated_at ON cash_sessions;--> statement-breakpoint
CREATE TRIGGER trg_cash_sessions_updated_at
  BEFORE UPDATE ON cash_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();--> statement-breakpoint

ALTER TABLE "cash_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cash_sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS policy_cash_sessions_tenant ON cash_sessions;--> statement-breakpoint
CREATE POLICY policy_cash_sessions_tenant ON cash_sessions
  USING (project_id = current_setting('app.current_project_id', true)::uuid)
  WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);
