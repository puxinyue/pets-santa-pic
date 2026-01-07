CREATE TABLE "image_generation_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"original_image_url" text NOT NULL,
	"generated_image_url" text,
	"prompt" text NOT NULL,
	"style" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"kie_task_id" text NOT NULL,
	"credits_used" integer DEFAULT 20 NOT NULL,
	"error_message" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	"completedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "payment_history" ALTER COLUMN "stripe_payment_intent_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_history" ALTER COLUMN "stripe_session_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "image_generation_tasks" ADD CONSTRAINT "image_generation_tasks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;