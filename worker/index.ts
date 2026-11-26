/** Cloudflare Worker entry point for DNFM. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const databaseSchema = [
  `CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    plate TEXT NOT NULL,
    year INTEGER NOT NULL,
    km INTEGER DEFAULT 0 NOT NULL,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'Dostupno' NOT NULL,
    service TEXT DEFAULT 'Nije zakazano' NOT NULL,
    vin TEXT DEFAULT '' NOT NULL,
    fuel TEXT DEFAULT '' NOT NULL,
    transmission TEXT DEFAULT '' NOT NULL,
    is_registered INTEGER DEFAULT 1 NOT NULL,
    registration_expires_at TEXT,
    out_of_service INTEGER DEFAULT 0 NOT NULL,
    archived_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles (plate)`,
  `CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    code TEXT NOT NULL,
    vehicle_id INTEGER,
    client_id INTEGER,
    client TEXT NOT NULL,
    vehicle TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    location TEXT NOT NULL,
    price INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'Potvrđena' NOT NULL,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_code ON reservations (code)`,
  `CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'Aktivan' NOT NULL,
    notes TEXT DEFAULT '' NOT NULL,
    reservations INTEGER DEFAULT 0 NOT NULL,
    value INTEGER DEFAULT 0 NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email ON clients (email)`,
  `CREATE TABLE IF NOT EXISTS service_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    code TEXT NOT NULL,
    vehicle_id INTEGER,
    vehicle TEXT NOT NULL,
    plate TEXT NOT NULL,
    type TEXT NOT NULL,
    due_date TEXT NOT NULL,
    ends_at TEXT DEFAULT '' NOT NULL,
    mileage INTEGER DEFAULT 0 NOT NULL,
    cost INTEGER DEFAULT 0 NOT NULL,
    workshop TEXT DEFAULT '' NOT NULL,
    status TEXT DEFAULT 'Planirano' NOT NULL,
    notes TEXT DEFAULT '' NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_service_records_code ON service_records (code)`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    reference TEXT NOT NULL,
    vehicle_id INTEGER,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    kind TEXT NOT NULL,
    amount INTEGER NOT NULL,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'Plaćeno' NOT NULL,
    payment_method TEXT DEFAULT 'Kartica' NOT NULL,
    notes TEXT DEFAULT '' NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_reference ON transactions (reference)`,
  `CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    vehicle_id INTEGER,
    folder TEXT NOT NULL,
    linked_to TEXT DEFAULT '' NOT NULL,
    uploaded_by TEXT DEFAULT 'Marko Nikolić' NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    storage_key TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_storage_key ON documents (storage_key)`,
  `CREATE TABLE IF NOT EXISTS team_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    branch TEXT NOT NULL,
    status TEXT DEFAULT 'Pozvan' NOT NULL,
    permissions TEXT DEFAULT '[]' NOT NULL,
    last_active TEXT DEFAULT 'Još nije aktivan' NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_team_users_email ON team_users (email)`,
  `CREATE TABLE IF NOT EXISTS deleted_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    entity TEXT NOT NULL,
    record_key TEXT NOT NULL,
    deleted_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_by TEXT DEFAULT 'Marko Nikolić' NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_deleted_records_entity_key ON deleted_records (entity, record_key)`,
  `CREATE TABLE IF NOT EXISTS vehicle_damages (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    code TEXT NOT NULL,
    vehicle_id INTEGER,
    vehicle TEXT NOT NULL,
    plate TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    cost INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'Prijavljena' NOT NULL,
    notes TEXT DEFAULT '' NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_damages_code ON vehicle_damages (code)`,
  `CREATE TABLE IF NOT EXISTS vehicle_availability_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    code TEXT NOT NULL,
    vehicle_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    status TEXT DEFAULT 'Aktivna' NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_availability_blocks_code ON vehicle_availability_blocks (code)`,
] as const;

const missingColumns = [
  ["vehicles", "archived_at", "TEXT"],
  ["vehicles", "out_of_service", "INTEGER DEFAULT 0 NOT NULL"],
  ["vehicles", "registration_expires_at", "TEXT"],
  ["reservations", "vehicle_id", "INTEGER"],
  ["reservations", "client_id", "INTEGER"],
  ["reservations", "completed_at", "TEXT"],
  ["service_records", "vehicle_id", "INTEGER"],
  ["service_records", "ends_at", "TEXT DEFAULT '' NOT NULL"],
  ["transactions", "vehicle_id", "INTEGER"],
  ["documents", "vehicle_id", "INTEGER"],
  ["vehicle_damages", "vehicle_id", "INTEGER"],
] as const;

const relationIndexes = [
  `CREATE INDEX IF NOT EXISTS idx_reservations_vehicle_id ON reservations (vehicle_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reservations_client_id ON reservations (client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_service_records_vehicle_id ON service_records (vehicle_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_vehicle_id ON transactions (vehicle_id)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_vehicle_id ON documents (vehicle_id)`,
  `CREATE INDEX IF NOT EXISTS idx_vehicle_damages_vehicle_id ON vehicle_damages (vehicle_id)`,
  `CREATE INDEX IF NOT EXISTS idx_vehicle_availability_blocks_vehicle_id ON vehicle_availability_blocks (vehicle_id)`,
] as const;

const relationBackfill = [
  `UPDATE reservations
   SET vehicle_id = (
     SELECT MIN(vehicle.id)
     FROM vehicles AS vehicle
     WHERE lower(trim(vehicle.name)) = lower(trim(reservations.vehicle))
   )
   WHERE vehicle_id IS NULL
     AND 1 = (
       SELECT COUNT(*)
       FROM vehicles AS vehicle
       WHERE lower(trim(vehicle.name)) = lower(trim(reservations.vehicle))
     )`,
  `UPDATE reservations
   SET client_id = (
     SELECT MIN(client.id)
     FROM clients AS client
     WHERE lower(trim(client.name)) = lower(trim(reservations.client))
   )
   WHERE client_id IS NULL
     AND 1 = (
       SELECT COUNT(*)
       FROM clients AS client
       WHERE lower(trim(client.name)) = lower(trim(reservations.client))
     )`,
  `UPDATE service_records
   SET vehicle_id = (
     SELECT MIN(vehicle.id) FROM vehicles AS vehicle
     WHERE lower(trim(vehicle.plate)) = lower(trim(service_records.plate))
   )
   WHERE vehicle_id IS NULL
     AND 1 = (
       SELECT COUNT(*) FROM vehicles AS vehicle
       WHERE lower(trim(vehicle.plate)) = lower(trim(service_records.plate))
     )`,
  `UPDATE vehicle_damages
   SET vehicle_id = (
     SELECT MIN(vehicle.id) FROM vehicles AS vehicle
     WHERE lower(trim(vehicle.plate)) = lower(trim(vehicle_damages.plate))
   )
   WHERE vehicle_id IS NULL
     AND 1 = (
       SELECT COUNT(*) FROM vehicles AS vehicle
       WHERE lower(trim(vehicle.plate)) = lower(trim(vehicle_damages.plate))
     )`,
  `UPDATE documents
   SET vehicle_id = (
     SELECT MIN(vehicle.id) FROM vehicles AS vehicle
     WHERE lower(trim(vehicle.plate)) = lower(trim(documents.linked_to))
   )
   WHERE vehicle_id IS NULL
     AND 1 = (
       SELECT COUNT(*) FROM vehicles AS vehicle
       WHERE lower(trim(vehicle.plate)) = lower(trim(documents.linked_to))
     )`,
  `UPDATE transactions
   SET vehicle_id = (
     SELECT MIN(vehicle.id) FROM vehicles AS vehicle
     WHERE lower(transactions.description) LIKE lower('[' || vehicle.plate || '] %')
   )
   WHERE vehicle_id IS NULL
     AND 1 = (
       SELECT COUNT(*) FROM vehicles AS vehicle
       WHERE lower(transactions.description) LIKE lower('[' || vehicle.plate || '] %')
     )`,
] as const;

const reservationProtectionSchema = [
  `DROP TRIGGER IF EXISTS prevent_reservation_overlap_insert`,
  `DROP TRIGGER IF EXISTS prevent_reservation_overlap_update`,
  `DROP TRIGGER IF EXISTS prevent_archived_vehicle_reservation_insert`,
  `DROP TRIGGER IF EXISTS prevent_archived_vehicle_reservation_update`,
  `DROP TRIGGER IF EXISTS prevent_vehicle_archive_with_active_reservations`,
  `DROP TRIGGER IF EXISTS prevent_vehicle_delete_with_linked_data`,
  `DROP TRIGGER IF EXISTS require_reservation_vehicle_id_insert`,
  `DROP TRIGGER IF EXISTS require_reservation_vehicle_id_update`,
  `DROP TRIGGER IF EXISTS require_service_vehicle_id_insert`,
  `DROP TRIGGER IF EXISTS require_service_vehicle_id_update`,
  `DROP TRIGGER IF EXISTS require_damage_vehicle_id_insert`,
  `DROP TRIGGER IF EXISTS require_damage_vehicle_id_update`,
  `DROP TRIGGER IF EXISTS validate_transaction_vehicle_id_insert`,
  `DROP TRIGGER IF EXISTS validate_transaction_vehicle_id_update`,
  `DROP TRIGGER IF EXISTS validate_document_vehicle_id_insert`,
  `DROP TRIGGER IF EXISTS validate_document_vehicle_id_update`,
  `DROP TRIGGER IF EXISTS validate_block_vehicle_id_insert`,
  `DROP TRIGGER IF EXISTS validate_block_vehicle_id_update`,
  `CREATE TRIGGER IF NOT EXISTS prevent_reservation_overlap_insert
  BEFORE INSERT ON reservations
  WHEN NEW.status NOT IN ('Završena', 'Otkazana')
    AND EXISTS (
      SELECT 1
      FROM reservations AS existing
      WHERE existing.vehicle_id = NEW.vehicle_id
        AND existing.status NOT IN ('Završena', 'Otkazana')
        AND julianday(existing.starts_at) < julianday(NEW.ends_at)
        AND julianday(existing.ends_at) > julianday(NEW.starts_at)
        AND NOT EXISTS (
          SELECT 1
          FROM deleted_records AS deleted
          WHERE deleted.entity = 'reservations'
            AND deleted.record_key = existing.code
        )
    )
  BEGIN
    SELECT RAISE(ABORT, 'RESERVATION_CONFLICT');
  END`,
  `CREATE TRIGGER IF NOT EXISTS prevent_reservation_overlap_update
  BEFORE UPDATE OF vehicle_id, starts_at, ends_at, status ON reservations
  WHEN NEW.status NOT IN ('Završena', 'Otkazana')
    AND EXISTS (
      SELECT 1
      FROM reservations AS existing
      WHERE existing.id <> OLD.id
        AND existing.vehicle_id = NEW.vehicle_id
        AND existing.status NOT IN ('Završena', 'Otkazana')
        AND julianday(existing.starts_at) < julianday(NEW.ends_at)
        AND julianday(existing.ends_at) > julianday(NEW.starts_at)
        AND NOT EXISTS (
          SELECT 1
          FROM deleted_records AS deleted
          WHERE deleted.entity = 'reservations'
            AND deleted.record_key = existing.code
        )
    )
  BEGIN
    SELECT RAISE(ABORT, 'RESERVATION_CONFLICT');
  END`,
  `CREATE TRIGGER IF NOT EXISTS prevent_archived_vehicle_reservation_insert
  BEFORE INSERT ON reservations
  WHEN NEW.vehicle_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = NEW.vehicle_id
        AND vehicles.archived_at IS NOT NULL
    )
  BEGIN
    SELECT RAISE(ABORT, 'ARCHIVED_VEHICLE');
  END`,
  `CREATE TRIGGER IF NOT EXISTS prevent_archived_vehicle_reservation_update
  BEFORE UPDATE OF vehicle_id, status ON reservations
  WHEN NEW.status NOT IN ('Završena', 'Otkazana')
    AND NEW.vehicle_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = NEW.vehicle_id
        AND vehicles.archived_at IS NOT NULL
    )
  BEGIN
    SELECT RAISE(ABORT, 'ARCHIVED_VEHICLE');
  END`,
  `CREATE TRIGGER IF NOT EXISTS prevent_vehicle_archive_with_active_reservations
  BEFORE UPDATE OF archived_at ON vehicles
  WHEN OLD.archived_at IS NULL
    AND NEW.archived_at IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM reservations
      WHERE reservations.vehicle_id = OLD.id
        AND reservations.status NOT IN ('Završena', 'Otkazana')
        AND NOT EXISTS (
          SELECT 1 FROM deleted_records
          WHERE deleted_records.entity = 'reservations'
            AND deleted_records.record_key = reservations.code
        )
    )
  BEGIN
    SELECT RAISE(ABORT, 'VEHICLE_HAS_ACTIVE_RESERVATIONS');
  END`,
  `CREATE TRIGGER IF NOT EXISTS prevent_vehicle_delete_with_linked_data
  BEFORE DELETE ON vehicles
  WHEN EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.vehicle_id = OLD.id
    )
    OR EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.vehicle_id = OLD.id
    )
    OR EXISTS (
      SELECT 1 FROM documents
      WHERE documents.vehicle_id = OLD.id
    )
    OR EXISTS (
      SELECT 1 FROM service_records
      WHERE service_records.vehicle_id = OLD.id
    )
    OR EXISTS (
      SELECT 1 FROM vehicle_damages
      WHERE vehicle_damages.vehicle_id = OLD.id
    )
    OR EXISTS (
      SELECT 1 FROM vehicle_availability_blocks
      WHERE vehicle_availability_blocks.vehicle_id = OLD.id
    )
  BEGIN
    SELECT RAISE(ABORT, 'VEHICLE_HAS_LINKED_DATA');
  END`,
  `CREATE TRIGGER IF NOT EXISTS require_reservation_vehicle_id_insert
  BEFORE INSERT ON reservations
  WHEN NEW.vehicle_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
  END`,
  `CREATE TRIGGER IF NOT EXISTS require_reservation_vehicle_id_update
  BEFORE UPDATE OF vehicle_id ON reservations
  WHEN NEW.vehicle_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
  END`,
  `CREATE TRIGGER IF NOT EXISTS require_service_vehicle_id_insert
  BEFORE INSERT ON service_records
  WHEN NEW.vehicle_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
  END`,
  `CREATE TRIGGER IF NOT EXISTS require_service_vehicle_id_update
  BEFORE UPDATE OF vehicle_id ON service_records
  WHEN NEW.vehicle_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
  END`,
  `CREATE TRIGGER IF NOT EXISTS require_damage_vehicle_id_insert
  BEFORE INSERT ON vehicle_damages
  WHEN NEW.vehicle_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
  END`,
  `CREATE TRIGGER IF NOT EXISTS require_damage_vehicle_id_update
  BEFORE UPDATE OF vehicle_id ON vehicle_damages
  WHEN NEW.vehicle_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
  END`,
  `CREATE TRIGGER IF NOT EXISTS validate_transaction_vehicle_id_insert
  BEFORE INSERT ON transactions
  WHEN NEW.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'INVALID_VEHICLE_ID');
  END`,
  `CREATE TRIGGER IF NOT EXISTS validate_transaction_vehicle_id_update
  BEFORE UPDATE OF vehicle_id ON transactions
  WHEN NEW.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'INVALID_VEHICLE_ID');
  END`,
  `CREATE TRIGGER IF NOT EXISTS validate_document_vehicle_id_insert
  BEFORE INSERT ON documents
  WHEN NEW.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'INVALID_VEHICLE_ID');
  END`,
  `CREATE TRIGGER IF NOT EXISTS validate_document_vehicle_id_update
  BEFORE UPDATE OF vehicle_id ON documents
  WHEN NEW.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'INVALID_VEHICLE_ID');
  END`,
  `CREATE TRIGGER IF NOT EXISTS validate_block_vehicle_id_insert
  BEFORE INSERT ON vehicle_availability_blocks
  WHEN NEW.vehicle_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
  END`,
  `CREATE TRIGGER IF NOT EXISTS validate_block_vehicle_id_update
  BEFORE UPDATE OF vehicle_id ON vehicle_availability_blocks
  WHEN NEW.vehicle_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id)
  BEGIN
    SELECT RAISE(ABORT, 'VEHICLE_ID_REQUIRED');
  END`,
] as const;

let databaseInitialization: Promise<void> | undefined;

async function addMissingColumns(env: Env) {
  for (const [table, column, type] of missingColumns) {
    const result = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{
      name: string;
    }>();
    if (!result.results.some((item: { name: string }) => item.name === column)) {
      await env.DB.prepare(
        `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`,
      ).run();
    }
  }
}

function ensureDatabase(env: Env) {
  if (!databaseInitialization) {
    databaseInitialization = (async () => {
      await env.DB.batch(
        databaseSchema.map((statement) => env.DB.prepare(statement)),
      );
      await addMissingColumns(env);
      await env.DB.prepare(
        `UPDATE vehicles
         SET archived_at = COALESCE(archived_at, CURRENT_TIMESTAMP)
         WHERE archived_at IS NULL
           AND EXISTS (
             SELECT 1 FROM deleted_records
             WHERE deleted_records.entity = 'vehicles'
               AND deleted_records.record_key = vehicles.plate
           )`,
      ).run();
      await env.DB.prepare(
        `UPDATE reservations
         SET completed_at = ends_at
         WHERE status = 'Završena'
           AND completed_at IS NULL`,
      ).run();
      await env.DB.prepare(
        `UPDATE vehicles
         SET out_of_service = 1
         WHERE status = 'Van upotrebe'`,
      ).run();
      await env.DB.batch(
        relationIndexes.map((statement) => env.DB.prepare(statement)),
      );
      await env.DB.batch(
        relationBackfill.map((statement) => env.DB.prepare(statement)),
      );
      await env.DB.batch(
        reservationProtectionSchema.map((statement) =>
          env.DB.prepare(statement),
        ),
      );
    })().catch((error) => {
      databaseInitialization = undefined;
      throw error;
    });
  }

  return databaseInitialization;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    await ensureDatabase(env);

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
