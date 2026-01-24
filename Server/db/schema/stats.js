const {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  unique,
  boolean,
} = require("drizzle-orm/pg-core");
const { players } = require("./players");
const { levels } = require("./levels");

const ratings = pgTable(
  "OuiTank-ratings",
  {
    id: serial("id").primaryKey(),
    stars: integer("stars").notNull(),
    levelId: integer("level_id")
      .notNull()
      .references(() => levels.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
  },
  (table) => ({
    uniqueRating: unique().on(table.levelId, table.playerId),
  }),
);

const logings = pgTable("OuiTank-logings", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id),
  ipAddress: varchar("ip_address").notNull(),
  attemptTimestamp: timestamp("attempt_timestamp").defaultNow(),
  status: varchar("status", { length: 30 }).notNull(),
});

const rounds = pgTable("OuiTank-rounds", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id),
  levelId: integer("level_id")
    .notNull()
    .references(() => levels.id),
  wins: integer("wins").notNull(),
  kills: integer("kills").notNull(),
  deaths: integer("deaths").notNull(),
  shots: integer("shots").notNull(),
  hits: integer("hits").notNull(),
  plants: integer("plants").notNull(),
  blocksDestroyed: integer("blocks_destroyed").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

const soloRounds = pgTable("OuiTank-solo_rounds", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id), // Optional
  levelId: integer("level_id")
    .notNull()
    .references(() => levels.id),
  success: boolean("success").notNull(), // true = won, false = failed
  timeMs: integer("time_ms").notNull(), // Round duration in milliseconds
  kills: integer("kills").notNull(),
  deaths: integer("deaths").notNull(),
  shots: integer("shots").notNull(),
  hits: integer("hits").notNull(),
  plants: integer("plants").notNull(),
  blocksDestroyed: integer("blocks_destroyed").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

module.exports = { ratings, logings, rounds, soloRounds };
