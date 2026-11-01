import { clean } from "../../lib";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { serviceRecords, vehicles } from "../../../db/schema";

const allowed = ["Planirano", "Uskoro", "U toku", "Završeno", "Otkazano"];

export async function GET() {
  try {
    const db = getDb();
    const [rows, vehicleRows] = await Promise.all([
      db.select().from(serviceRecords).orderBy(desc(serviceRecords.id)),
      db.select().from(vehicles),
    ]);
    const vehiclesById = new Map(
      vehicleRows.map((vehicle) => [vehicle.id, vehicle]),
    );
    return Response.json({
      services: rows.map((row) => {
        const vehicle = row.vehicleId
          ? vehiclesById.get(row.vehicleId)
          : undefined;
        return {
          ...row,
          vehicle: vehicle?.name || row.vehicle,
          plate: vehicle?.plate || row.plate,
        };
      }),
    });
  }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Zapisi nisu učitani." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const vehicleId = Number(body.vehicleId);
    const db = getDb();
    const [linkedVehicle] = Number.isInteger(vehicleId) && vehicleId > 0
      ? await db.select().from(vehicles).where(eq(vehicles.id, vehicleId))
      : [];
    if (!linkedVehicle) return Response.json({ error: "Izaberite postojeće vozilo." }, { status: 400 });
    const values = { code: `SER-${Date.now().toString().slice(-6)}`, vehicleId, vehicle: linkedVehicle.name, plate: linkedVehicle.plate, type: clean(body.type), dueDate: clean(body.dueDate), mileage: Number(body.mileage) || 0, cost: Number(body.cost) || 0, workshop: clean(body.workshop), status: clean(body.status) || "Planirano", notes: clean(body.notes) };
    if (!values.vehicle || !values.plate || !values.type || !values.dueDate || values.mileage < 0 || values.cost < 0 || !allowed.includes(values.status)) return Response.json({ error: "Popunite sva obavezna polja ispravnim podacima." }, { status: 400 });
    const [service] = await db.insert(serviceRecords).values(values).returning();
    return Response.json({ service }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Zapis nije sačuvan." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const code = clean(body.code);
    const vehicleId = Number(body.vehicleId);
    const db = getDb();
    const [linkedVehicle] = Number.isInteger(vehicleId) && vehicleId > 0
      ? await db.select().from(vehicles).where(eq(vehicles.id, vehicleId))
      : [];
    if (!linkedVehicle) return Response.json({ error: "Izaberite postojeće vozilo." }, { status: 400 });
    const values = { vehicleId, vehicle: linkedVehicle.name, plate: linkedVehicle.plate, type: clean(body.type), dueDate: clean(body.dueDate), mileage: Number(body.mileage) || 0, cost: Number(body.cost) || 0, workshop: clean(body.workshop), status: clean(body.status), notes: clean(body.notes) };
    if (!code || !values.vehicle || !values.plate || !values.type || !values.dueDate || !allowed.includes(values.status)) return Response.json({ error: "Podaci servisnog zapisa nisu ispravni." }, { status: 400 });
    const existing = await db.select({ id: serviceRecords.id }).from(serviceRecords).where(eq(serviceRecords.code, code)).limit(1);
    const [service] = existing.length ? await db.update(serviceRecords).set(values).where(eq(serviceRecords.code, code)).returning() : await db.insert(serviceRecords).values({ code, ...values }).returning();
    return Response.json({ service });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Izmene nisu sačuvane." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const code = clean(new URL(request.url).searchParams.get("code"));
    if (!code) return Response.json({ error: "Nedostaje servisni zapis." }, { status: 400 });
    const deleted = await getDb().delete(serviceRecords).where(eq(serviceRecords.code, code)).returning({ code: serviceRecords.code });
    if (!deleted.length) return Response.json({ error: "Servisni zapis nije pronađen." }, { status: 404 });
    return Response.json({ deleted: true, code });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Zapis nije obrisan." }, { status: 500 }); }
}
