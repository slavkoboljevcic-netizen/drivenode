import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  plate: text("plate").notNull(),
  year: integer("year").notNull(),
  km: integer("km").notNull().default(0),
  location: text("location").notNull(),
  status: text("status").notNull().default("Dostupno"),
  service: text("service").notNull().default("Nije zakazano"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_vehicles_plate").on(table.plate)]);

export const reservations = sqliteTable("reservations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  client: text("client").notNull(),
  vehicle: text("vehicle").notNull(),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  location: text("location").notNull(),
  price: integer("price").notNull().default(0),
  status: text("status").notNull().default("Potvrđena"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_reservations_code").on(table.code),
]);
