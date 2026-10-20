const {
  pgTable,
  serial,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  check,
} = require("drizzle-orm/pg-core");
const { sql } = require("drizzle-orm");

const players = pgTable(
  "OuiTank-players",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 30 }).notNull().unique(),
    email: varchar("email", { length: 60 }).notNull().unique(),
    type: varchar("type", { length: 10 }).notNull(),
    passwordHash: varchar("password_hash", { length: 250 }),
    googleId: varchar("google_id", { length: 500 }),
    isAdmin: boolean("is_admin").notNull().default(false),
    creationTimestamp: timestamp("creation_timestamp").defaultNow(),
  },
  (table) => ({
    correctAuth: check(
      "correct_auth",
      sql`
    (${table.type} = 'google' AND ${table.googleId} IS NOT NULL) OR
    (${table.type} = 'db' AND ${table.passwordHash} IS NOT NULL)
  `
    ),
  })
);

const playerSessions = pgTable("OuiTank-player_sessions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .notNull()
    // OWNERSHIP: a session is meaningless without its player.
    .references(() => players.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 120 }).notNull().unique(),
  expirationTimestamp: timestamp("expiration_timestamp").default(
    sql`NOW() + INTERVAL '7 days'`
  ),
});

// One row per player: the account-backed copy of the web client's settings blob
// (keybindings, effects, volumes, touch controls, selected tank). Kept out of
// the players table so authentication lookups stay lean and preferences are a
// single upsert. `settings` is JSONB rather than columns: the client evolves
// this shape often (new effects/toggles) and the API validates it with Zod.
const playerSettings = pgTable("OuiTank-player_settings", {
  playerId: integer("player_id")
    .primaryKey()
    // OWNERSHIP: preferences are meaningless without their player.
    .references(() => players.id, { onDelete: "cascade" }),
  settings: jsonb("settings").notNull(),
  updatedTimestamp: timestamp("updated_timestamp").defaultNow().notNull(),
});

module.exports = { players, playerSessions, playerSettings };
