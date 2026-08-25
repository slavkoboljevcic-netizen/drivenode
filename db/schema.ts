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

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  city: text("city").notNull(),
  phone: text("phone").notNull(),
  status: text("status").notNull().default("Aktivan"),
  notes: text("notes").notNull().default(""),
  reservations: integer("reservations").notNull().default(0),
  value: integer("value").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_clients_email").on(table.email)]);

export const serviceRecords = sqliteTable("service_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  vehicle: text("vehicle").notNull(),
  plate: text("plate").notNull(),
  type: text("type").notNull(),
  dueDate: text("due_date").notNull(),
  mileage: integer("mileage").notNull().default(0),
  cost: integer("cost").notNull().default(0),
  workshop: text("workshop").notNull().default(""),
  status: text("status").notNull().default("Planirano"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_service_records_code").on(table.code)]);

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reference: text("reference").notNull(), description: text("description").notNull(),
  category: text("category").notNull(), kind: text("kind").notNull(), amount: integer("amount").notNull(),
  date: text("date").notNull(), location: text("location").notNull(), status: text("status").notNull().default("Plaćeno"),
  paymentMethod: text("payment_method").notNull().default("Kartica"), notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_transactions_reference").on(table.reference)]);
