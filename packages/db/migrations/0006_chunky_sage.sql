CREATE TABLE "OuiTank-play_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL,
	"duration_ms" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "OuiTank-rounds" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "OuiTank-play_sessions" ADD CONSTRAINT "OuiTank-play_sessions_player_id_OuiTank-players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."OuiTank-players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "play_sessions_player_id_idx" ON "OuiTank-play_sessions" USING btree ("player_id");