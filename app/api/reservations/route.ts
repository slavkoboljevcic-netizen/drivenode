import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { deletedRecords, reservations } from "../../../db/schema";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(reservations).orderBy(desc(reservations.id));
    const hiddenRows = await db
      .select({ code: deletedRecords.recordKey })
      .from(deletedRecords)
      .where(eq(deletedRecords.entity, "reservations"));
    const hiddenCodes = new Set(hiddenRows.map((row) => row.code));
    return Response.json({ reservations: rows.filter((row) => !hiddenCodes.has(row.code)) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Greška pri učitavanju rezervacija." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const client = clean(body.client);
    const vehicle = clean(body.vehicle);
    const startsAt = clean(body.startsAt);
    const endsAt = clean(body.endsAt);
    const location = clean(body.location);
    const status = clean(body.status) || "Potvrđena";
    const price = Number(body.price);
    if (!client || !vehicle || !startsAt || !endsAt || !location || !Number.isFinite(price) || price < 0) {
      return Response.json({ error: "Popunite sva obavezna polja ispravnim podacima." }, { status: 400 });
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      return Response.json({ error: "Datum vraćanja mora biti posle datuma preuzimanja." }, { status: 400 });
    }
    const code = `DN-${Date.now().toString().slice(-6)}`;
    const [reservation] = await getDb().insert(reservations).values({ code, client, vehicle, startsAt, endsAt, location, status, price: Math.round(price) }).returning();
    return Response.json({ reservation }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Rezervacija nije sačuvana." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const code = clean(body.code);
    const status = clean(body.status);
    const allowed = ["Na čekanju", "Potvrđena", "Aktivna", "Povrat danas", "Završena", "Otkazana"];
    if (!code || !allowed.includes(status)) {
      return Response.json({ error: "Izaberite ispravan status rezervacije." }, { status: 400 });
    }
    const hasDetails = Boolean(clean(body.client));
    const values = hasDetails ? { client: clean(body.client), vehicle: clean(body.vehicle), startsAt: clean(body.startsAt), endsAt: clean(body.endsAt), location: clean(body.location), price: Math.round(Number(body.price)), status } : { status };
    if (hasDetails) {
      const start = new Date(String(values.startsAt)); const end = new Date(String(values.endsAt));
      if (!values.client || !values.vehicle || !values.location || !Number.isFinite(Number(values.price)) || Number(values.price) < 0 || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return Response.json({ error: "Podaci rezervacije nisu ispravni." }, { status: 400 });
    }
    const [reservation] = await getDb().update(reservations).set(values).where(eq(reservations.code, code)).returning();
    if (!reservation) return Response.json({ error: "Rezervacija nije pronađena." }, { status: 404 });
    return Response.json({ reservation });
  } catch (error) {
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
