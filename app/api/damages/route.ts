import { clean } from "../../lib";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { vehicleDamages, vehicles } from "../../../db/schema";

export async function GET() {
  try {
    const db = getDb();
    const [rows, vehicleRows] = await Promise.all([
      db.select().from(vehicleDamages).orderBy(desc(vehicleDamages.id)),
      db.select().from(vehicles),
    ]);
    const vehiclesById = new Map(
      vehicleRows.map((vehicle) => [vehicle.id, vehicle]),
    );
    return Response.json({
      damages: rows.map((row) => {
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
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Štete nisu učitane." },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const b = (await request.json()) as Record<string, unknown>;
    const vehicleId = Number(b.vehicleId);
    const db = getDb();
    const [linkedVehicle] = Number.isInteger(vehicleId) && vehicleId > 0
      ? await db.select().from(vehicles).where(eq(vehicles.id, vehicleId))
      : [];
    if (!linkedVehicle)
      return Response.json({ error: "Izaberite postojeće vozilo." }, { status: 400 });
    const values = {
      code: `ST-${Date.now().toString().slice(-6)}`,
      vehicleId,
      vehicle: linkedVehicle.name,
      plate: linkedVehicle.plate,
      description: clean(b.description),
      date: clean(b.date),
      cost: Math.max(0, Math.round(Number(b.cost) || 0)),
      status: clean(b.status) || "Prijavljena",
      notes: clean(b.notes),
    };
    if (!values.vehicle || !values.plate || !values.description || !values.date)
      return Response.json(
        { error: "Popunite opis i datum štete." },
        { status: 400 },
      );
    const [damage] = await db
      .insert(vehicleDamages)
      .values(values)
      .returning();
    return Response.json({ damage }, { status: 201 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Šteta nije sačuvana." },
      { status: 500 },
    );
  }
}
export async function PATCH(request: Request) {
  try {
    const b = (await request.json()) as Record<string, unknown>;
    const code = clean(b.code);
    const vehicleId = Number(b.vehicleId);
    const db = getDb();
    const [linkedVehicle] = Number.isInteger(vehicleId) && vehicleId > 0
      ? await db.select().from(vehicles).where(eq(vehicles.id, vehicleId))
      : [];
    if (!linkedVehicle)
      return Response.json({ error: "Izaberite postojeće vozilo." }, { status: 400 });
    const values = {
      vehicleId,
      vehicle: linkedVehicle.name,
      plate: linkedVehicle.plate,
      description: clean(b.description),
      date: clean(b.date),
      cost: Math.max(0, Math.round(Number(b.cost) || 0)),
      status: clean(b.status) || "Prijavljena",
      notes: clean(b.notes),
    };
    if (
      !code ||
      !values.vehicle ||
      !values.plate ||
      !values.description ||
      !values.date
    )
      return Response.json(
        { error: "Popunite opis i datum štete." },
        { status: 400 },
      );
    const [damage] = await db
      .update(vehicleDamages)
      .set(values)
      .where(eq(vehicleDamages.code, code))
      .returning();
    if (!damage)
      return Response.json({ error: "Šteta nije pronađena." }, { status: 404 });
    return Response.json({ damage });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Izmene nisu sačuvane." },
      { status: 500 },
    );
  }
}
export async function DELETE(request: Request) {
  try {
    const code = clean(new URL(request.url).searchParams.get("code"));
    if (!code)
      return Response.json(
        { error: "Nedostaje zapis štete." },
        { status: 400 },
      );
    const deleted = await getDb()
      .delete(vehicleDamages)
      .where(eq(vehicleDamages.code, code))
      .returning({ code: vehicleDamages.code });
    if (!deleted.length)
      return Response.json({ error: "Šteta nije pronađena." }, { status: 404 });
    return Response.json({ deleted: true, code });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Šteta nije obrisana." },
      { status: 500 },
    );
  }
}
