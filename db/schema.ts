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
  vin: text("vin").notNull().default(""),
  fuel: text("fuel").notNull().default(""),
  transmission: text("transmission").notNull().default(""),
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

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(), folder: text("folder").notNull(),
  linkedTo: text("linked_to").notNull().default(""), uploadedBy: text("uploaded_by").notNull().default("Marko Nikolić"),
  mimeType: text("mime_type").notNull(), size: integer("size").notNull(), storageKey: text("storage_key").notNull(),
  expiresAt: text("expires_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_documents_storage_key").on(table.storageKey)]);

export const teamUsers = sqliteTable("team_users", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(), email: text("email").notNull(),
  role: text("role").notNull(), branch: text("branch").notNull(), status: text("status").notNull().default("Pozvan"),
  permissions: text("permissions").notNull().default("[]"), lastActive: text("last_active").notNull().default("Još nije aktivan"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_team_users_email").on(table.email)]);

export const deletedRecords = sqliteTable("deleted_records", {
  id: integer("id").primaryKey({ autoIncrement: true }), entity: text("entity").notNull(), recordKey: text("record_key").notNull(),
  deletedAt: text("deleted_at").notNull().default(sql`CURRENT_TIMESTAMP`), deletedBy: text("deleted_by").notNull().default("Marko Nikolić"),
}, (table) => [uniqueIndex("idx_deleted_records_entity_key").on(table.entity, table.recordKey)]);
