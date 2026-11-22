import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { vehicleAvailabilityBlocks, vehicles } from "../../../db/schema";
import { clean } from "../../lib";

const allowedStatuses = ["Aktivna", "Ukinuta"];

const validPeriod = (startsAt: string, endsAt: string) => {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return (
    Number.isFinite(start.getTime()) &&
    Number.isFinite(end.getTime()) &&
    end > start
  );
};

async function linkedVehicle(vehicleId: number) {
  if (!Number.isInteger(vehicleId) || vehicleId < 1) return null;
  const [vehicle] = await getDb()
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId));
  return vehicle || null;
}

export async function GET() {
  try {
    const blocks = await getDb()
      .select()
      .from(vehicleAvailabilityBlocks)
      .orderBy(desc(vehicleAvailabilityBlocks.id));
    return Response.json({ blocks });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Blokirani periodi nisu učitani.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const vehicleId = Number(body.vehicleId);
    const reason = clean(body.reason);
    const startsAt = clean(body.startsAt);
    const endsAt = clean(body.endsAt);
    const status = clean(body.status) || "Aktivna";
    const vehicle = await linkedVehicle(vehicleId);
    if (!vehicle)
      return Response.json(
        { error: "Izaberite postojeće vozilo." },
        { status: 400 },
      );
    if (vehicle.archivedAt)
      return Response.json(
        { error: "Arhivirano vozilo ne može dobiti novu blokadu." },
        { status: 409 },
      );
    if (
      !reason ||
      !validPeriod(startsAt, endsAt) ||
      !allowedStatuses.includes(status)
    )
      return Response.json(
        { error: "Unesite razlog i ispravan period blokade." },
        { status: 400 },
      );
    const code = `BLK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const [block] = await getDb()
      .insert(vehicleAvailabilityBlocks)
      .values({ code, vehicleId, reason, startsAt, endsAt, status })
      .returning();
    return Response.json({ block }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Blokada nije sačuvana.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const code = clean(body.code);
    const vehicleId = Number(body.vehicleId);
    const reason = clean(body.reason);
    const startsAt = clean(body.startsAt);
    const endsAt = clean(body.endsAt);
    const status = clean(body.status);
    if (
      !code ||
      !(await linkedVehicle(vehicleId)) ||
      !reason ||
      !validPeriod(startsAt, endsAt) ||
      !allowedStatuses.includes(status)
    )
      return Response.json(
        { error: "Podaci blokiranog perioda nisu ispravni." },
        { status: 400 },
      );
    const [block] = await getDb()
      .update(vehicleAvailabilityBlocks)
      .set({ vehicleId, reason, startsAt, endsAt, status })
      .where(eq(vehicleAvailabilityBlocks.code, code))
      .returning();
    if (!block)
      return Response.json(
        { error: "Blokirani period nije pronađen." },
        { status: 404 },
      );
    return Response.json({ block });
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
    const code = clean(new URL(request.url).searchParams.get("code"));
    if (!code)
      return Response.json(
        { error: "Nedostaje blokirani period." },
        { status: 400 },
      );
    const deleted = await getDb()
      .delete(vehicleAvailabilityBlocks)
      .where(eq(vehicleAvailabilityBlocks.code, code))
      .returning({ code: vehicleAvailabilityBlocks.code });
    if (!deleted.length)
      return Response.json(
        { error: "Blokirani period nije pronađen." },
        { status: 404 },
      );
    return Response.json({ deleted: true, code });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Blokada nije obrisana.",
      },
      { status: 500 },
    );
  }
}
