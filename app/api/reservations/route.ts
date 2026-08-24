import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { reservations } from "../../../db/schema";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function GET() {
  try {
    const rows = await getDb().select().from(reservations).orderBy(desc(reservations.id));
    return Response.json({ reservations: rows });
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
    const [reservation] = await getDb().update(reservations).set({ status }).where(eq(reservations.code, code)).returning();
    return Response.json({ reservation: reservation || { code, status }, demo: !reservation });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Status nije sačuvan." }, { status: 500 });
  }
}
