import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { documents, vehicles } from "../../../db/schema";

const bucket = () => (env as unknown as { FILES: R2Bucket }).FILES;
const optionalVehicleId = (value: unknown) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("download"));
    if (id) {
      const [row] = await getDb()
        .select()
        .from(documents)
        .where(eq(documents.id, id))
        .limit(1);
      if (!row)
        return new Response("Dokument nije pronađen.", { status: 404 });
      const object = await bucket().get(row.storageKey);
      if (!object)
        return new Response("Fajl nije pronađen.", { status: 404 });
      return new Response(object.body, {
        headers: {
          "Content-Type": row.mimeType,
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
        },
      });
    }
    return Response.json({
      documents: await getDb()
        .select()
        .from(documents)
        .orderBy(desc(documents.id)),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Dokumenti nisu učitani.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size)
      return Response.json(
        { error: "Izaberite fajl za otpremanje." },
        { status: 400 },
      );
    if (file.size > 10 * 1024 * 1024)
      return Response.json(
        { error: "Maksimalna veličina fajla je 10 MB." },
        { status: 400 },
      );
    const folder = String(form.get("folder") || "Ostalo");
    const vehicleId = optionalVehicleId(form.get("vehicleId"));
    const db = getDb();
    if (form.get("vehicleId") && !vehicleId)
      return Response.json(
        { error: "Izabrano vozilo nije ispravno." },
        { status: 400 },
      );
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
    const key = `documents/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await bucket().put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
      },
    });
    const [document] = await db
      .insert(documents)
      .values({
        name: file.name,
        vehicleId,
        folder,
        linkedTo: String(form.get("linkedTo") || ""),
        uploadedBy: "Marko Nikolić",
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        storageKey: key,
        expiresAt: String(form.get("expiresAt") || "") || null,
      })
      .returning();
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Dokument nije otpremljen.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id: number;
      vehicleId?: number | null;
      name: string;
      folder: string;
      linkedTo: string;
      expiresAt?: string;
    };
    const vehicleId = optionalVehicleId(body.vehicleId);
    const db = getDb();
    if (body.vehicleId != null && !vehicleId)
      return Response.json(
        { error: "Povezano vozilo nije ispravno." },
        { status: 400 },
      );
    if (vehicleId) {
      const [vehicle] = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(eq(vehicles.id, vehicleId));
      if (!vehicle)
        return Response.json(
          { error: "Povezano vozilo više ne postoji." },
          { status: 400 },
        );
    }
    const [document] = await db
      .update(documents)
      .set({
        name: body.name.trim(),
        vehicleId,
        folder: body.folder,
        linkedTo: body.linkedTo.trim(),
        expiresAt: body.expiresAt || null,
      })
      .where(eq(documents.id, Number(body.id)))
      .returning();
    if (!document)
      return Response.json(
        { error: "Dokument nije pronađen." },
        { status: 404 },
      );
    return Response.json({ document });
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
    const id = Number(new URL(request.url).searchParams.get("id"));
    const db = getDb();
    const [row] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);
    if (!row)
      return Response.json(
        { error: "Dokument nije pronađen." },
        { status: 404 },
      );
    await bucket().delete(row.storageKey);
    await db.delete(documents).where(eq(documents.id, id));
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Dokument nije obrisan.",
      },
      { status: 500 },
    );
  }
}
