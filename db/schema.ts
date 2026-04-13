import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
} from "drizzle-orm/pg-core";

// Better Auth required tables
export const user = pgTable("user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image:         text("image"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id:        text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token:     text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId:    text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id:                   text("id").primaryKey(),
  accountId:            text("account_id").notNull(),
  providerId:           text("provider_id").notNull(),
  userId:               text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken:          text("access_token"),
  refreshToken:         text("refresh_token"),
  idToken:              text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt:timestamp("refresh_token_expires_at"),
  scope:                text("scope"),
  password:             text("password"),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
  updatedAt:            timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expires_at").notNull(),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
});

// App-specific tables

export const portfolios = pgTable("portfolio", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  currency:    text("currency").notNull().default("USD"),
  isDefault:   boolean("is_default").notNull().default(false),
  isPaper:     boolean("is_paper").notNull().default(false),
  initialCash: numeric("initial_cash", { precision: 18, scale: 2 }).notNull().default("100000"),
  cashBalance: numeric("cash_balance", { precision: 18, scale: 2 }).notNull().default("100000"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transaction", {
  id:          text("id").primaryKey(),
  portfolioId: text("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  symbol:      text("symbol").notNull(),
  side:        text("side").$type<"buy" | "sell">().notNull(),
  quantity:    numeric("quantity", { precision: 18, scale: 8 }).notNull(),
  price:       numeric("price", { precision: 18, scale: 8 }).notNull(),
  fee:         numeric("fee", { precision: 10, scale: 4 }).notNull().default("0"),
  notes:       text("notes"),
  executedAt:  timestamp("executed_at").notNull(),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const alerts = pgTable("alert", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  symbol:      text("symbol").notNull(),
  condition:   text("condition").$type<"above" | "below">().notNull(),
  targetPrice: numeric("target_price", { precision: 18, scale: 8 }).notNull(),
  isActive:    boolean("is_active").notNull().default(true),
  notifyVia:   text("notify_via").$type<"email" | "push" | "both">().notNull().default("email"),
  triggeredAt: timestamp("triggered_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const journalEntries = pgTable("journal_entry", {
  id:            text("id").primaryKey(),
  userId:        text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  symbol:        text("symbol"),
  transactionId: text("transaction_id"),
  title:         text("title").notNull(),
  body:          text("body").notNull(),
  mood:          integer("mood"),
  tags:          text("tags").array(),
  entryDate:     text("entry_date").notNull(), // ISO date string YYYY-MM-DD
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export const watchlistItem = pgTable("watchlist_item", {
  id:        text("id").primaryKey(),
  userId:    text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  symbol:    text("symbol").notNull(),
  priority:  text("priority").$type<"high" | "medium" | "low">().notNull().default("medium"),
  pinned:    boolean("pinned").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
