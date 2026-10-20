CREATE TABLE "OuiTank-player_settings" (
	"player_id" integer PRIMARY KEY NOT NULL,
	"settings" jsonb NOT NULL,
	"updated_timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "OuiTank-player_settings" ADD CONSTRAINT "OuiTank-player_settings_player_id_OuiTank-players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."OuiTank-players"("id") ON DELETE cascade ON UPDATE no action;