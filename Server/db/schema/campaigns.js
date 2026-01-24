const {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
} = require("drizzle-orm/pg-core");
const { players } = require("./players");
const { levels } = require("./levels");

const campaigns = pgTable("OuiTank-campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 30 }).notNull().unique(),
  creatorId: integer("creator_id")
    .notNull()
    .references(() => players.id),
  description: varchar("description", { length: 300 }).notNull(),
  creationTimestamp: timestamp("creation_timestamp").defaultNow(),
});

const campaignLevels = pgTable("OuiTank-campaign_levels", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  levelId: integer("level_id")
    .notNull()
    .references(() => levels.id),
  orderIndex: integer("order_index").notNull(),
});

module.exports = { campaigns, campaignLevels };
