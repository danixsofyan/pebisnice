ALTER TABLE "product_variants" ADD COLUMN "production_wage" numeric(18, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_logs" ADD COLUMN "produced_by" uuid;--> statement-breakpoint
ALTER TABLE "production_logs" ADD COLUMN "wage_amount" numeric(18, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_logs" ADD CONSTRAINT "production_logs_produced_by_team_members_id_fk" FOREIGN KEY ("produced_by") REFERENCES "public"."team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_produced_by_idx" ON "production_logs" USING btree ("produced_by","production_date");