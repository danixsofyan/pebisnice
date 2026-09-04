ALTER TABLE "projects" ADD COLUMN "tax_rate_basis_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tax_inclusive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "tax_amount" numeric(18, 2) DEFAULT '0' NOT NULL;