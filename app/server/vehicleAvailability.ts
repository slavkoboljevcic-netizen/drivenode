import { eq } from "drizzle-orm";
import type { getDb } from "../../db";
import {
  deletedRecords,
  reservations,
  serviceRecords,
  vehicleAvailabilityBlocks,
  vehicleDamages,
  vehicles,
} from "../../db/schema";
import { calculateFleetAvailability } from "../lib";

type Database = ReturnType<typeof getDb>;

export async function getFleetAvailability(
  db: Database,
  startsAt: string,
  endsAt: string,
  excludedReservationCode?: string,
) {
  const [
    vehicleRows,
    reservationRows,
    serviceRows,
    damageRows,
    blockRows,
    hiddenRows,
  ] = await Promise.all([
    db.select().from(vehicles),
    db.select().from(reservations),
    db.select().from(serviceRecords),
    db.select().from(vehicleDamages),
    db.select().from(vehicleAvailabilityBlocks),
    db
      .select({ entity: deletedRecords.entity, code: deletedRecords.recordKey })
      .from(deletedRecords)
      .where(eq(deletedRecords.entity, "reservations")),
  ]);
  const hiddenReservations = new Set(hiddenRows.map((row) => row.code));

  return calculateFleetAvailability(
    vehicleRows,
    reservationRows.filter((row) => !hiddenReservations.has(row.code)),
    serviceRows,
    damageRows,
    blockRows,
    startsAt,
    endsAt,
    excludedReservationCode,
  );
}
