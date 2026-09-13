/** Cloudflare Worker entry point for the vinext-starter template. */
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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles (plate)`,
  `CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    code TEXT NOT NULL,
    client TEXT NOT NULL,
    vehicle TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    location TEXT NOT NULL,
    price INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'Potvrđena' NOT NULL,
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
    vehicle TEXT NOT NULL,
    plate TEXT NOT NULL,
    type TEXT NOT NULL,
    due_date TEXT NOT NULL,
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
] as const;

let databaseInitialization: Promise<void> | undefined;

function ensureDatabase(env: Env) {
  if (!databaseInitialization) {
    databaseInitialization = env.DB.batch(
      databaseSchema.map((statement) => env.DB.prepare(statement)),
    ).then(() => undefined).catch((error) => {
      databaseInitialization = undefined;
      throw error;
    });
  }

  return databaseInitialization;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

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
