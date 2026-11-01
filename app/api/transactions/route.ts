import { clean } from "../../lib";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  deletedRecords,
  serviceRecords,
  transactions,
  vehicles,
} from "../../../db/schema";

const optionalVehicleId = (value: unknown) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function GET() {
  try {
    const db = getDb();
    const [manual, services, vehicleRows, deleted] = await Promise.all([
      db.select().from(transactions).orderBy(desc(transactions.id)),
      db.select().from(serviceRecords).orderBy(desc(serviceRecords.id)),
      db
        .select({
          id: vehicles.id,
          name: vehicles.name,
          plate: vehicles.plate,
          location: vehicles.location,
        })
        .from(vehicles),
      db
        .select({
          entity: deletedRecords.entity,
          key: deletedRecords.recordKey,
        })
        .from(deletedRecords),
    ]);
    const hiddenServices = new Set(
      deleted
        .filter((item) => item.entity === "services")
        .map((item) => item.key),
    );
    const locations = new Map(
      vehicleRows.map((vehicle) => [
        vehicle.id,
        vehicle.location.split(" • ")[0],
      ]),
    );
    const legacyLocations = new Map(
      vehicleRows.map((vehicle) => [
        vehicle.plate,
        vehicle.location.split(" • ")[0],
      ]),
    );
    const vehicleNames = new Map(
      vehicleRows.map((vehicle) => [vehicle.id, vehicle.name]),
    );
    const automatic = services
      .filter(
        (service) => service.cost > 0 && !hiddenServices.has(service.code),
      )
      .map((service) => ({
        id: -service.id,
        vehicleId: service.vehicleId,
        reference: `AUTO-${service.code}`,
        description: `${service.type} — ${service.vehicleId ? vehicleNames.get(service.vehicleId) || service.vehicle : service.vehicle}`,
        category:
          service.type === "Registracija" ? "Registracija" : "Servis",
        kind: "Rashod",
        amount: service.cost,
        date: service.dueDate,
        location:
          (service.vehicleId ? locations.get(service.vehicleId) : undefined) ||
          legacyLocations.get(service.plate) ||
          "Nije određena",
        status: service.status === "Otkazano" ? "Stornirano" : "Plaćeno",
        paymentMethod: "Automatski",
        notes: `Povezano sa zapisom ${service.code} u Servisima i registracijama.`,
        createdAt: service.createdAt,
      }));
    return Response.json({
      transactions: [...manual, ...automatic].sort((first, second) =>
        String(second.createdAt).localeCompare(String(first.createdAt)),
      ),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Transakcije nisu učitane.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const vehicleId = optionalVehicleId(body.vehicleId);
    const db = getDb();
    if (body.vehicleId != null && !vehicleId) {
      return Response.json(
        { error: "Izabrano vozilo nije ispravno." },
        { status: 400 },
      );
    }
    if (vehicleId) {
      const [vehicle] = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(eq(vehicles.id, vehicleId));
      if (!vehicle)
        return Response.json(
          { error: "Izabrano vozilo više ne postoji." },
          { status: 400 },
        );
    }
    const values = {
      reference: `FIN-${Date.now().toString().slice(-6)}`,
      vehicleId,
      description: clean(body.description),
      category: clean(body.category),
      kind: clean(body.kind),
      amount: Math.round(Number(body.amount)),
      date: clean(body.date),
      location: clean(body.location),
      status: clean(body.status) || "Plaćeno",
      paymentMethod: clean(body.paymentMethod) || "Kartica",
      notes: clean(body.notes),
    };
    if (
      !values.description ||
      !values.category ||
      !["Prihod", "Rashod"].includes(values.kind) ||
      !Number.isFinite(values.amount) ||
      values.amount <= 0 ||
      !values.date ||
      !values.location
    )
      return Response.json(
        { error: "Popunite sva obavezna polja." },
        { status: 400 },
      );
    const [transaction] = await db
      .insert(transactions)
      .values(values)
      .returning();
    return Response.json({ transaction }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Transakcija nije sačuvana.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const reference = clean(body.reference);
    const status = clean(body.status);
    if (
      !reference ||
      !["Plaćeno", "Na čekanju", "Stornirano"].includes(status)
    )
      return Response.json(
        { error: "Status nije ispravan." },
        { status: 400 },
      );
    const full = clean(body.description);
    const values = full
      ? {
          vehicleId: optionalVehicleId(body.vehicleId),
          description: full,
          category: clean(body.category),
          kind: clean(body.kind),
          amount: Math.round(Number(body.amount)),
          date: clean(body.date),
          location: clean(body.location),
          status,
          paymentMethod: clean(body.paymentMethod),
          notes: clean(body.notes),
        }
      : { status };
    if (
      full &&
      (!values.category ||
        !["Prihod", "Rashod"].includes(String(values.kind)) ||
        !Number.isFinite(Number(values.amount)) ||
        Number(values.amount) <= 0 ||
        !values.date ||
        !values.location)
    )
      return Response.json(
        { error: "Popunite sva obavezna polja." },
        { status: 400 },
      );
    const [transaction] = await getDb()
      .update(transactions)
      .set(values)
      .where(eq(transactions.reference, reference))
      .returning();
    if (!transaction)
      return Response.json(
        { error: "Transakcija nije pronađena." },
        { status: 404 },
      );
    return Response.json({ transaction });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Izmene nisu sačuvane.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const reference = clean(
      new URL(request.url).searchParams.get("reference"),
    );
    if (!reference)
      return Response.json(
        { error: "Nedostaje transakcija." },
        { status: 400 },
      );
    const deleted = await getDb()
      .delete(transactions)
      .where(eq(transactions.reference, reference))
      .returning({ reference: transactions.reference });
    if (!deleted.length)
      return Response.json(
        { error: "Transakcija nije pronađena." },
        { status: 404 },
      );
    return Response.json({ deleted: true, reference });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Transakcija nije obrisana.",
      },
      { status: 500 },
    );
  }
}
