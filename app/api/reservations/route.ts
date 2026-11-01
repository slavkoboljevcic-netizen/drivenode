import {
  clean,
  reservationBlocksVehicle,
  reservationPeriodsOverlap,
} from "../../lib";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { deletedRecords, reservations, vehicles } from "../../../db/schema";

type ReservationConflict = typeof reservations.$inferSelect;

const formatConflictDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("sr-Latn-RS", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : value;
};

const conflictResponse = (
  vehicle: string,
  conflict?: ReservationConflict,
) =>
  Response.json(
    {
      error: conflict
        ? `Vozilo „${vehicle}“ je već rezervisano u izabranom periodu (${conflict.code}: ${formatConflictDate(conflict.startsAt)} – ${formatConflictDate(conflict.endsAt)}). Izaberite drugo vozilo ili promenite period.`
        : `Vozilo „${vehicle}“ je upravo rezervisano u izabranom periodu. Osvežite podatke i izaberite drugo vozilo ili promenite period.`,
      code: "RESERVATION_CONFLICT",
    },
    { status: 409 },
  );

const isDatabaseConflict = (error: unknown) =>
  error instanceof Error && error.message.includes("RESERVATION_CONFLICT");

async function findReservationConflict(
  db: ReturnType<typeof getDb>,
  vehicleId: number | null,
  vehicle: string,
  startsAt: string,
  endsAt: string,
  excludedCode?: string,
) {
  const [vehicleReservations, hiddenRows] = await Promise.all([
    db
      .select()
      .from(reservations)
      .where(
        vehicleId === null
          ? and(
              isNull(reservations.vehicleId),
              sql`lower(trim(${reservations.vehicle})) = lower(trim(${vehicle}))`,
            )
          : or(
              eq(reservations.vehicleId, vehicleId),
              and(
                isNull(reservations.vehicleId),
                sql`lower(trim(${reservations.vehicle})) = lower(trim(${vehicle}))`,
              ),
            ),
      ),
    db
      .select({ code: deletedRecords.recordKey })
      .from(deletedRecords)
      .where(eq(deletedRecords.entity, "reservations")),
  ]);
  const hiddenCodes = new Set(hiddenRows.map((row) => row.code));

  return vehicleReservations.find(
    (reservation) =>
      reservation.code !== excludedCode &&
      !hiddenCodes.has(reservation.code) &&
      reservationBlocksVehicle(reservation.status) &&
      reservationPeriodsOverlap(
        reservation.startsAt,
        reservation.endsAt,
        startsAt,
        endsAt,
      ),
  );
}

export async function GET() {
  try {
    const db = getDb();
    const [rows, vehicleRows, hiddenRows] = await Promise.all([
      db.select().from(reservations).orderBy(desc(reservations.id)),
      db.select().from(vehicles),
      db
        .select({ code: deletedRecords.recordKey })
        .from(deletedRecords)
        .where(eq(deletedRecords.entity, "reservations")),
    ]);
    const hiddenCodes = new Set(hiddenRows.map((row) => row.code));
    const vehiclesById = new Map(vehicleRows.map((vehicle) => [vehicle.id, vehicle]));
    return Response.json({
      reservations: rows
        .filter((row) => !hiddenCodes.has(row.code))
        .map((row) => {
          const linkedVehicle = row.vehicleId
            ? vehiclesById.get(row.vehicleId)
            : undefined;
          return {
            ...row,
            vehicle: linkedVehicle?.name || row.vehicle,
            vehiclePlate: linkedVehicle?.plate || "",
          };
        }),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Greška pri učitavanju rezervacija." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let requestedVehicle = "izabrano";
  try {
    const body = await request.json() as Record<string, unknown>;
    const client = clean(body.client);
    const vehicleId = Number(body.vehicleId);
    const startsAt = clean(body.startsAt);
    const endsAt = clean(body.endsAt);
    const location = clean(body.location);
    const status = clean(body.status) || "Potvrđena";
    const price = Number(body.price);
    if (!client || !Number.isInteger(vehicleId) || vehicleId < 1 || !startsAt || !endsAt || !location || !Number.isFinite(price) || price < 0) {
      return Response.json({ error: "Popunite sva obavezna polja ispravnim podacima." }, { status: 400 });
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      return Response.json({ error: "Datum vraćanja mora biti posle datuma preuzimanja." }, { status: 400 });
    }
    const db = getDb();
    const [linkedVehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId));
    if (!linkedVehicle) {
      return Response.json({ error: "Izabrano vozilo više ne postoji." }, { status: 400 });
    }
    const vehicle = linkedVehicle.name;
    requestedVehicle = vehicle;
    if (reservationBlocksVehicle(status)) {
      const conflict = await findReservationConflict(
        db,
        vehicleId,
        vehicle,
        startsAt,
        endsAt,
      );
      if (conflict) return conflictResponse(vehicle, conflict);
    }
    const code = `DN-${Date.now().toString().slice(-6)}`;
    const [reservation] = await db.insert(reservations).values({ code, vehicleId, client, vehicle, startsAt, endsAt, location, status, price: Math.round(price) }).returning();
    return Response.json({ reservation }, { status: 201 });
  } catch (error) {
    if (isDatabaseConflict(error)) return conflictResponse(requestedVehicle);
    return Response.json({ error: error instanceof Error ? error.message : "Rezervacija nije sačuvana." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let requestedVehicle = "izabrano";
  try {
    const body = await request.json() as Record<string, unknown>;
    const code = clean(body.code);
    const status = clean(body.status);
    const allowed = ["Na čekanju", "Potvrđena", "Aktivna", "Povrat danas", "Završena", "Otkazana"];
    if (!code || !allowed.includes(status)) {
      return Response.json({ error: "Izaberite ispravan status rezervacije." }, { status: 400 });
    }
    const db = getDb();
    const [current] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.code, code));
    if (!current) return Response.json({ error: "Rezervacija nije pronađena." }, { status: 404 });

    const hasDetails = Boolean(clean(body.client));
    let proposed = { ...current, status };
    if (hasDetails) {
      const vehicleId = Number(body.vehicleId);
      if (!Number.isInteger(vehicleId) || vehicleId < 1) {
        return Response.json({ error: "Izaberite postojeće vozilo." }, { status: 400 });
      }
      const [linkedVehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, vehicleId));
      if (!linkedVehicle) {
        return Response.json({ error: "Izabrano vozilo više ne postoji." }, { status: 400 });
      }
      proposed = {
        ...current,
        client: clean(body.client),
        vehicleId,
        vehicle: linkedVehicle.name,
        startsAt: clean(body.startsAt),
        endsAt: clean(body.endsAt),
        location: clean(body.location),
        price: Math.round(Number(body.price)),
        status,
      };
    }
    requestedVehicle = proposed.vehicle || requestedVehicle;
    const start = new Date(proposed.startsAt);
    const end = new Date(proposed.endsAt);
    if (
      !proposed.client ||
      !proposed.vehicle ||
      !proposed.location ||
      !Number.isFinite(proposed.price) ||
      proposed.price < 0 ||
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    ) {
      return Response.json({ error: "Podaci rezervacije nisu ispravni." }, { status: 400 });
    }
    if (reservationBlocksVehicle(status)) {
      const conflict = await findReservationConflict(
        db,
        proposed.vehicleId,
        proposed.vehicle,
        proposed.startsAt,
        proposed.endsAt,
        code,
      );
      if (conflict) return conflictResponse(proposed.vehicle, conflict);
    }
    const values = hasDetails
      ? {
          client: proposed.client,
          vehicleId: proposed.vehicleId,
          vehicle: proposed.vehicle,
          startsAt: proposed.startsAt,
          endsAt: proposed.endsAt,
          location: proposed.location,
          price: proposed.price,
          status,
        }
      : { status };
    const [reservation] = await db
      .update(reservations)
      .set(values)
      .where(eq(reservations.code, code))
      .returning();
    return Response.json({ reservation });
  } catch (error) {
    if (isDatabaseConflict(error)) return conflictResponse(requestedVehicle);
    return Response.json({ error: error instanceof Error ? error.message : "Status nije sačuvan." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const code = clean(new URL(request.url).searchParams.get("code"));
    if (!code) return Response.json({ error: "Nedostaje rezervacija." }, { status: 400 });
    const deleted = await getDb().delete(reservations).where(eq(reservations.code, code)).returning({ code: reservations.code });
    if (!deleted.length) return Response.json({ error: "Rezervacija nije pronađena." }, { status: 404 });
    return Response.json({ deleted: true, code });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Rezervacija nije obrisana." }, { status: 500 }); }
}
