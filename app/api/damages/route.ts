import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { vehicleDamages } from "../../../db/schema";
const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
export async function GET() {
  try {
    return Response.json({
      damages: await getDb()
        .select()
        .from(vehicleDamages)
        .orderBy(desc(vehicleDamages.id)),
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
    const values = {
      code: `ST-${Date.now().toString().slice(-6)}`,
      vehicle: clean(b.vehicle),
      plate: clean(b.plate).toUpperCase(),
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
    const [damage] = await getDb()
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
    const values = {
      vehicle: clean(b.vehicle),
      plate: clean(b.plate).toUpperCase(),
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
    const [damage] = await getDb()
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
