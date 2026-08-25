import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { vehicles } from "../../../db/schema";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function GET() {
  try {
    const rows = await getDb().select().from(vehicles).orderBy(desc(vehicles.id));
    return Response.json({ vehicles: rows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Greška pri učitavanju vozila." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = clean(body.name);
    const plate = clean(body.plate).toUpperCase();
    const location = clean(body.location);
    const status = clean(body.status) || "Dostupno";
    const service = clean(body.service) || "Nije zakazano";
    const vin = clean(body.vin).toUpperCase();
    const fuel = clean(body.fuel);
    const transmission = clean(body.transmission);
    const year = Number(body.year);
    const km = Number(body.km);
    if (!name || !plate || !location || !Number.isInteger(year) || year < 1990 || year > 2027 || !Number.isFinite(km) || km < 0) {
      return Response.json({ error: "Popunite sva obavezna polja ispravnim podacima." }, { status: 400 });
    }
    const db = getDb();
    const duplicate = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.plate, plate)).limit(1);
    if (duplicate.length) return Response.json({ error: "Vozilo sa ovim registarskim tablicama već postoji." }, { status: 409 });
    const [vehicle] = await db.insert(vehicles).values({ name, plate, location, status, service, vin, fuel, transmission, year, km: Math.round(km) }).returning();
    return Response.json({ vehicle }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Greška pri dodavanju vozila.";
    if (message.includes("UNIQUE")) return Response.json({ error: "Vozilo sa ovim registarskim tablicama već postoji." }, { status: 409 });
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const originalPlate = clean(body.originalPlate).toUpperCase();
    const name = clean(body.name);
    const plate = clean(body.plate).toUpperCase();
    const location = clean(body.location);
    const status = clean(body.status);
    const service = clean(body.service) || "Nije zakazano";
    const vin = clean(body.vin).toUpperCase();
    const fuel = clean(body.fuel);
    const transmission = clean(body.transmission);
    const year = Number(body.year);
    const km = Number(body.km);
    if (!originalPlate || !name || !plate || !location || !status || !Number.isInteger(year) || year < 1990 || year > 2027 || !Number.isFinite(km) || km < 0) {
      return Response.json({ error: "Popunite sva polja ispravnim podacima." }, { status: 400 });
    }
    const db = getDb();
    const existing = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.plate, originalPlate)).limit(1);
    const values = { name, plate, year, km: Math.round(km), location, status, service, vin, fuel, transmission };
    const [vehicle] = existing.length
      ? await db.update(vehicles).set(values).where(eq(vehicles.plate, originalPlate)).returning()
      : await db.insert(vehicles).values(values).returning();
    return Response.json({ vehicle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vozilo nije izmenjeno.";
    if (message.includes("UNIQUE")) return Response.json({ error: "Vozilo sa ovim tablicama već postoji." }, { status: 409 });
    return Response.json({ error: message }, { status: 500 });
  }
}
