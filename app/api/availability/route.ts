import { getDb } from "../../../db";
import { getFleetAvailability } from "../../server/vehicleAvailability";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startsAt = url.searchParams.get("startsAt") || "";
    const endsAt = url.searchParams.get("endsAt") || "";
    const excludedReservationCode =
      url.searchParams.get("excludeReservationCode") || undefined;
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    )
      return Response.json(
        { error: "Izabrani period nije ispravan." },
        { status: 400 },
      );

    const availability = await getFleetAvailability(
      getDb(),
      startsAt,
      endsAt,
      excludedReservationCode,
    );
    return Response.json({
      availability: Array.from(availability, ([vehicleId, result]) => ({
        vehicleId,
        ...result,
      })),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Dostupnost vozila nije proverena.",
      },
      { status: 500 },
    );
  }
}
