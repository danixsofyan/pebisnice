ALTER TYPE "public"."team_role" ADD VALUE 'manager' BEFORE 'finance';--> statement-breakpoint
ALTER TYPE "public"."team_role" ADD VALUE 'cashier' BEFORE 'operator';--> statement-breakpoint
ALTER TYPE "public"."team_role" ADD VALUE 'production' BEFORE 'operator';