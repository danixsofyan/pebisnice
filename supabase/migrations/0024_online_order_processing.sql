ALTER TYPE "public"."online_order_status" ADD VALUE 'processing' BEFORE 'accepted';--> statement-breakpoint
ALTER TABLE "online_orders" ADD COLUMN "claimed_at" timestamp with time zone;