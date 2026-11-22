import {
  calculateVehicleStatuses,
  clean,
  reservationBlocksVehicle,
} from "../../lib";
import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { getFleetAvailability } from "../../server/vehicleAvailability";
import {
  deletedRecords,
  documents,
  reservations,
  serviceRecords,
  transactions,
  vehicleAvailabilityBlocks,
  vehicleDamages,
  vehicles,
} from "../../../db/schema";

const asRegistered = (value: unknown) => !(
  value === false || value === 0 || value === "0" || value === "false" || value === "Nije registrovano"
);
const asOutOfService = (value: unknown) =>
  value === true || value === 1 || value === "1" || value === "true" || value === "Van upotrebe";
const makeInternalPlate = () => `DNFM-NEREG-${crypto.randomUUID().toUpperCase()}`;
const validId = (value: unknown) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};
const validOptionalDate = (value: string | null) =>
  !value || Number.isFinite(new Date(`${value}T12:00:00`).getTime());

const isArchiveBlocked = (error: unknown) =>
  error instanceof Error && error.message.includes("VEHICLE_HAS_ACTIVE_RESERVATIONS");

type VehicleRow = typeof vehicles.$inferSelect;

async function withCalculatedStatuses(
  db: ReturnType<typeof getDb>,
  vehicleRows: VehicleRow[],
  allVehicleRows?: VehicleRow[],
) {
  const [statusVehicleRows, reservationRows, serviceRows, deletionRows] = await Promise.all([
    allVehicleRows
      ? Promise.resolve(allVehicleRows)
      : db.select().from(vehicles),
    db.select().from(reservations),
    db.select().from(serviceRecords),
    db.select().from(deletedRecords),
  ]);
  const hiddenReservations = new Set(
    deletionRows
      .filter((row) => row.entity === "reservations")
      .map((row) => row.recordKey),
  );
  const hiddenServices = new Set(
    deletionRows
      .filter((row) => row.entity === "services")
      .map((row) => row.recordKey),
  );
  const statuses = calculateVehicleStatuses(
    statusVehicleRows,
    reservationRows.filter((row) => !hiddenReservations.has(row.code)),
    serviceRows.filter((row) => !hiddenServices.has(row.code)),
  );
  return vehicleRows.map((vehicle) => ({
    ...vehicle,
    status: statuses.get(vehicle.id) || "Dostupno",
  }));
}

export async function GET(request: Request) {
  try {
    const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
    const reservable = new URL(request.url).searchParams.get("reservable") === "true";
    const db = getDb();
    const rows = await db.select().from(vehicles).orderBy(desc(vehicles.id));
    const calculatedRows = await withCalculatedStatuses(db, rows, rows);
    const now = new Date();
    const currentAvailability = reservable
      ? await getFleetAvailability(
          db,
          now.toISOString(),
          new Date(now.getTime() + 60_000).toISOString(),
        )
      : null;
    const visibleRows = includeArchived
      ? calculatedRows
      : calculatedRows.filter((vehicle) => !vehicle.archivedAt);
    return Response.json({
      vehicles: reservable
        ? visibleRows.filter(
            (vehicle) => currentAvailability?.get(vehicle.id)?.available,
          )
        : visibleRows,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Greška pri učitavanju vozila." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = clean(body.name);
    let plate = clean(body.plate);
    const location = clean(body.location);
    const service = clean(body.service) || "Nije zakazano";
    const vin = clean(body.vin).toUpperCase();
    const fuel = clean(body.fuel);
    const transmission = clean(body.transmission);
    const registered = asRegistered(body.registered);
    const registrationExpiresAt = registered
      ? clean(body.registrationExpiresAt) || null
      : null;
    const outOfService = asOutOfService(body.outOfService);
    if (!registered && !plate) plate = makeInternalPlate();
    const year = Number(body.year);
    const km = Number(body.km);
    if (registered && !plate) {
      return Response.json({ error: "Unesite registarsku oznaku. Prihvaćeni su svi formati tablica." }, { status: 400 });
    }
    if (!name || !location || (registered && !registrationExpiresAt) || !validOptionalDate(registrationExpiresAt) || !Number.isInteger(year) || year < 1990 || year > 2027 || !Number.isFinite(km) || km < 0) {
      return Response.json({ error: "Popunite sva obavezna polja ispravnim podacima." }, { status: 400 });
    }
    const db = getDb();
    const duplicate = await db.select({ id: vehicles.id }).from(vehicles).where(sql`lower(${vehicles.plate}) = lower(${plate})`).limit(1);
    if (duplicate.length) return Response.json({ error: "Vozilo sa ovim registarskim tablicama već postoji." }, { status: 409 });
    const [vehicle] = await db.insert(vehicles).values({ name, plate, location, status: "Dostupno", service, vin, fuel, transmission, registered, registrationExpiresAt, outOfService, year, km: Math.round(km) }).returning();
    const [calculatedVehicle] = await withCalculatedStatuses(db, [vehicle]);
    return Response.json({ vehicle: calculatedVehicle }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Greška pri dodavanju vozila.";
    if (message.includes("UNIQUE")) return Response.json({ error: "Vozilo sa ovim registarskim tablicama već postoji." }, { status: 409 });
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = validId(body.id);
    if (!id) return Response.json({ error: "Nedostaje vozilo." }, { status: 400 });

    const db = getDb();
    const [current] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    if (!current) return Response.json({ error: "Vozilo nije pronađeno." }, { status: 404 });

    const action = clean(body.action);
    if (action === "archive") {
      if (current.archivedAt) {
        const [calculatedVehicle] = await withCalculatedStatuses(db, [current]);
        return Response.json({ vehicle: calculatedVehicle });
      }

      const [vehicleReservations, hiddenRows] = await Promise.all([
        db
          .select()
          .from(reservations)
          .where(
            or(
              eq(reservations.vehicleId, id),
              and(
                isNull(reservations.vehicleId),
                sql`lower(trim(${reservations.vehicle})) = lower(trim(${current.name}))`,
              ),
            ),
          ),
        db
          .select({ code: deletedRecords.recordKey })
          .from(deletedRecords)
          .where(eq(deletedRecords.entity, "reservations")),
      ]);
      const hiddenCodes = new Set(hiddenRows.map((row) => row.code));
      const blockingReservation = vehicleReservations.find(
        (reservation) =>
          !hiddenCodes.has(reservation.code) &&
          reservationBlocksVehicle(reservation.status),
      );
      if (blockingReservation) {
        return Response.json(
          {
            error: `Vozilo ima aktivnu ili buduću rezervaciju ${blockingReservation.code}. Završite ili otkažite rezervaciju pre arhiviranja.`,
            code: "VEHICLE_HAS_ACTIVE_RESERVATIONS",
          },
          { status: 409 },
        );
      }

      const [vehicle] = await db
        .update(vehicles)
        .set({ archivedAt: new Date().toISOString() })
        .where(eq(vehicles.id, id))
        .returning();
      const [calculatedVehicle] = await withCalculatedStatuses(db, [vehicle]);
      return Response.json({ vehicle: calculatedVehicle });
    }

    if (action === "restore") {
      const [vehicle] = await db
        .update(vehicles)
        .set({ archivedAt: null })
        .where(eq(vehicles.id, id))
        .returning();
      await db
        .delete(deletedRecords)
        .where(
          and(
            eq(deletedRecords.entity, "vehicles"),
            eq(deletedRecords.recordKey, current.plate),
          ),
        );
      const [calculatedVehicle] = await withCalculatedStatuses(db, [vehicle]);
      return Response.json({ vehicle: calculatedVehicle });
    }

    if (current.archivedAt) {
      return Response.json({ error: "Arhivirano vozilo prvo vratite u aktivnu flotu." }, { status: 409 });
    }

    const originalPlate = clean(body.originalPlate);
    const name = clean(body.name);
    let plate = clean(body.plate);
    const location = clean(body.location);
    const service = clean(body.service) || "Nije zakazano";
    const vin = clean(body.vin).toUpperCase();
    const fuel = clean(body.fuel);
    const transmission = clean(body.transmission);
    const registered = asRegistered(body.registered);
    const registrationExpiresAt = registered
      ? clean(body.registrationExpiresAt) || null
      : null;
    const outOfService = asOutOfService(body.outOfService);
    if (!registered && !plate) plate = originalPlate || makeInternalPlate();
    const year = Number(body.year);
    const km = Number(body.km);
    if (!name || (registered && (!plate || !registrationExpiresAt)) || !location || !validOptionalDate(registrationExpiresAt) || !Number.isInteger(year) || year < 1990 || year > 2027 || !Number.isFinite(km) || km < 0) {
      return Response.json({ error: "Popunite sva polja ispravnim podacima." }, { status: 400 });
    }
    const duplicate = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(
        and(
          sql`lower(${vehicles.plate}) = lower(${plate})`,
          ne(vehicles.id, id),
        ),
      )
      .limit(1);
    if (duplicate.length) return Response.json({ error: "Vozilo sa ovim tablicama već postoji." }, { status: 409 });
    const values = { name, plate, year, km: Math.round(km), location, service, vin, fuel, transmission, registered, registrationExpiresAt, outOfService };
    const [vehicle] = await db
      .update(vehicles)
      .set(values)
      .where(eq(vehicles.id, id))
      .returning();
    const [calculatedVehicle] = await withCalculatedStatuses(db, [vehicle]);
    return Response.json({ vehicle: calculatedVehicle });
  } catch (error) {
    if (isArchiveBlocked(error)) {
      return Response.json({ error: "Vozilo ima aktivne ili buduće rezervacije i ne može biti arhivirano.", code: "VEHICLE_HAS_ACTIVE_RESERVATIONS" }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Vozilo nije izmenjeno.";
    if (message.includes("UNIQUE")) return Response.json({ error: "Vozilo sa ovim tablicama već postoji." }, { status: 409 });
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = validId(new URL(request.url).searchParams.get("id"));
    if (!id) return Response.json({ error: "Nedostaje vozilo." }, { status: 400 });
    const db = getDb();
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    if (!vehicle) return Response.json({ error: "Vozilo nije pronađeno." }, { status: 404 });
    if (!vehicle.archivedAt) {
      return Response.json({ error: "Vozilo prvo arhivirajte. Trajno brisanje nije dostupno za aktivnu flotu." }, { status: 409 });
    }

    const [reservationRows, transactionRows, documentRows, serviceRows, damageRows, blockRows] = await Promise.all([
      db
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          or(
            eq(reservations.vehicleId, id),
            and(
              isNull(reservations.vehicleId),
              sql`lower(trim(${reservations.vehicle})) = lower(trim(${vehicle.name}))`,
            ),
          ),
        )
        .limit(1),
      db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          or(
            eq(transactions.vehicleId, id),
            and(
              isNull(transactions.vehicleId),
              sql`instr(lower(${transactions.description}), lower(${vehicle.plate})) > 0`,
            ),
          ),
        )
        .limit(1),
      db
        .select({ id: documents.id })
        .from(documents)
        .where(
          or(
            eq(documents.vehicleId, id),
            and(
              isNull(documents.vehicleId),
              sql`lower(trim(${documents.linkedTo})) = lower(trim(${vehicle.plate}))`,
            ),
          ),
        )
        .limit(1),
      db
        .select({ id: serviceRecords.id })
        .from(serviceRecords)
        .where(
          or(
            eq(serviceRecords.vehicleId, id),
            and(
              isNull(serviceRecords.vehicleId),
              sql`lower(trim(${serviceRecords.plate})) = lower(trim(${vehicle.plate}))`,
            ),
          ),
        )
        .limit(1),
      db
        .select({ id: vehicleDamages.id })
        .from(vehicleDamages)
        .where(
          or(
            eq(vehicleDamages.vehicleId, id),
            and(
              isNull(vehicleDamages.vehicleId),
              sql`lower(trim(${vehicleDamages.plate})) = lower(trim(${vehicle.plate}))`,
            ),
          ),
        )
        .limit(1),
      db
        .select({ id: vehicleAvailabilityBlocks.id })
        .from(vehicleAvailabilityBlocks)
        .where(eq(vehicleAvailabilityBlocks.vehicleId, id))
        .limit(1),
    ]);

    const linkedData = [
      reservationRows.length && "rezervacije",
      transactionRows.length && "prihode ili troškove",
      documentRows.length && "dokumente",
      serviceRows.length && "servise",
      damageRows.length && "štete",
      blockRows.length && "blokirane periode",
    ].filter(Boolean);
    if (linkedData.length) {
      return Response.json(
        { error: `Trajno brisanje nije dozvoljeno jer vozilo ima povezane ${linkedData.join(", ")}. Vozilo ostaje arhivirano sa kompletnom istorijom.`, code: "VEHICLE_HAS_LINKED_DATA" },
        { status: 409 },
      );
    }

    await db
      .delete(deletedRecords)
      .where(
        and(
          eq(deletedRecords.entity, "vehicles"),
          eq(deletedRecords.recordKey, vehicle.plate),
        ),
      );
    const deleted = await db.delete(vehicles).where(eq(vehicles.id, id)).returning({ id: vehicles.id });
    return Response.json({ deleted: true, id: deleted[0].id });
  } catch (error) {
    if (error instanceof Error && error.message.includes("VEHICLE_HAS_LINKED_DATA")) {
      return Response.json({ error: "Trajno brisanje je odbijeno jer vozilo ima povezane podatke. Vozilo ostaje arhivirano sa kompletnom istorijom.", code: "VEHICLE_HAS_LINKED_DATA" }, { status: 409 });
    }
    return Response.json({ error: error instanceof Error ? error.message : "Vozilo nije obrisano." }, { status: 500 });
  }
}
