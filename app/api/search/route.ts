import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { clients, deletedRecords, reservations, vehicles } from "../../../db/schema";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim().toLocaleLowerCase("sr") || "";
    if (query.length < 2) return Response.json({ results: [] });
    const db = getDb();
    const [vehicleRows, reservationRows, clientRows, deletionRows] = await Promise.all([
      db.select().from(vehicles).orderBy(desc(vehicles.id)),
      db.select().from(reservations).orderBy(desc(reservations.id)),
      db.select().from(clients).orderBy(desc(clients.id)),
      db.select().from(deletedRecords),
    ]);
    const deleted = new Map<string, Set<string>>();
    for (const row of deletionRows) {
      if (!deleted.has(row.entity)) deleted.set(row.entity, new Set());
      deleted.get(row.entity)?.add(row.recordKey);
    }
    const contains = (...values: unknown[]) => values.join(" ").toLocaleLowerCase("sr").includes(query);
    const results = [
      ...vehicleRows.filter((row) => !deleted.get("vehicles")?.has(row.plate) && contains(row.name, row.plate, row.vin, row.location)).map((row) => ({ type: "vehicle", id: row.plate, title: row.name, subtitle: `${row.plate} • ${row.location}`, data: row })),
      ...reservationRows.filter((row) => !deleted.get("reservations")?.has(row.code) && contains(row.code, row.client, row.vehicle, row.location)).map((row) => ({ type: "reservation", id: row.code, title: row.client, subtitle: `${row.code} • ${row.vehicle}`, data: row })),
      ...clientRows.filter((row) => !deleted.get("clients")?.has(row.email) && contains(row.name, row.email, row.phone, row.city)).map((row) => ({ type: "client", id: row.email, title: row.name, subtitle: `${row.phone} • ${row.city}`, data: row })),
    ].slice(0, 8);
    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Pretraga nije dostupna." }, { status: 500 });
  }
}
