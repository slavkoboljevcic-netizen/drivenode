import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { clients } from "../../../db/schema";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const validate = (values: { name: string; email: string; city: string; phone: string }) => {
  if (values.name.length < 3 || !values.name.includes(" ")) return "Unesite ime i prezime klijenta.";
  if (!emailPattern.test(values.email)) return "Unesite ispravnu email adresu.";
  const phoneDigits = values.phone.replace(/\D/g, "");
  if (phoneDigits.length < 8 || phoneDigits.length > 15) return "Broj telefona mora imati između 8 i 15 cifara.";
  if (values.city.length < 2) return "Izaberite grad klijenta.";
  return "";
};

export async function GET() {
  try {
    return Response.json({ clients: await getDb().select().from(clients).orderBy(desc(clients.id)) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Klijenti nisu učitani." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const values = { name: clean(body.name), email: clean(body.email).toLowerCase(), city: clean(body.city), phone: clean(body.phone), status: clean(body.status) || "Aktivan", notes: clean(body.notes), reservations: Number(body.reservations) || 0, value: Number(body.value) || 0 };
    const validationError = validate(values);
    if (validationError) return Response.json({ error: validationError }, { status: 400 });
    const duplicate = await getDb().select({ id: clients.id }).from(clients).where(eq(clients.email, values.email)).limit(1);
    if (duplicate.length) return Response.json({ error: "Klijent sa ovom email adresom već postoji." }, { status: 409 });
    const [client] = await getDb().insert(clients).values(values).returning();
    return Response.json({ client }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Klijent nije sačuvan.";
    return Response.json({ error: message.includes("UNIQUE") ? "Klijent sa ovom email adresom već postoji." : message }, { status: message.includes("UNIQUE") ? 409 : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const originalEmail = clean(body.originalEmail).toLowerCase();
    const values = { name: clean(body.name), email: clean(body.email).toLowerCase(), city: clean(body.city), phone: clean(body.phone), status: clean(body.status), notes: clean(body.notes), reservations: Number(body.reservations) || 0, value: Number(body.value) || 0 };
    const validationError = validate(values);
    if (!originalEmail || validationError || !values.status) return Response.json({ error: validationError || "Popunite sva obavezna polja." }, { status: 400 });
    const db = getDb();
    const existing = await db.select({ id: clients.id }).from(clients).where(eq(clients.email, originalEmail)).limit(1);
    const [client] = existing.length ? await db.update(clients).set(values).where(eq(clients.email, originalEmail)).returning() : await db.insert(clients).values(values).returning();
    return Response.json({ client });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Klijent nije izmenjen.";
    return Response.json({ error: message.includes("UNIQUE") ? "Email adresa je već u upotrebi." : message }, { status: message.includes("UNIQUE") ? 409 : 500 });
  }
}
