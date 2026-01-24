const {
  pgTable,
  serial,
  varchar,
  integer,
  json,
  timestamp,
  customType,
} = require("drizzle-orm/pg-core");
const { players } = require("./players");

// Custom bytea type for images
const bytea = customType({
  dataType() {
    return "bytea";
  },
});

const levels = pgTable("OuiTank-levels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 30 }).notNull().unique(),
  creatorId: integer("creator_id")
    .notNull()
    .references(() => players.id),
  maxPlayers: integer("max_players").notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  content: json("content").notNull(),
  creationTimestamp: timestamp("creation_timestamp").defaultNow(),
});

const levelsImg = pgTable("OuiTank-levels_img", {
  id: serial("id").primaryKey(),
  levelId: integer("level_id")
    .notNull()
    .references(() => levels.id),
  img: bytea("img").notNull(),
});

module.exports = { levels, levelsImg };
