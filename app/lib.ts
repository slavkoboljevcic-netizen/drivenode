/** Shared, dependency-free helpers used by the UI and API routes. */
export const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const displayPlate = (plate: string, registered?: boolean) =>
  registered === false || plate.startsWith("DNFM-NEREG-")
    ? "Nema tablica"
    : plate;

type SearchableVehicle = {
  name: string;
  make?: string;
  model?: string;
  plate: string;
  year: number;
  location: string;
  status: string;
  vin?: string;
  fuel?: string;
  transmission?: string;
  category?: string;
  seats?: number;
  registered?: boolean;
};

const normalizeVehicleSearch = (value: string | number | undefined) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("sr-Latn-RS")
    .replace(/đ/g, "dj")
    .trim();

const compactVehicleSearch = (value: string) =>
  normalizeVehicleSearch(value).replace(/[^a-z0-9]/g, "");

export const vehicleMatchesSearch = (
  vehicle: SearchableVehicle,
  query: string,
) => {
  const normalizedQuery = normalizeVehicleSearch(query);
  if (!normalizedQuery) return true;

  const fuel = normalizeVehicleSearch(vehicle.fuel);
  const transmission = normalizeVehicleSearch(vehicle.transmission);
  const vehicleStatus = normalizeVehicleSearch(vehicle.status);
  const aliases = [
    transmission.includes("automats")
      ? "automatik automatski automatic"
      : "",
    transmission.includes("manuel")
      ? "manuelac manuelni rucni menjac manual"
      : "",
    fuel.includes("dizel") ? "dizel diesel" : "",
    fuel.includes("benzin") ? "benzin benzinski petrol" : "",
    fuel.includes("hibrid") ? "hibrid hybrid" : "",
    fuel.includes("elektr")
      ? "elektricno elektricni struja ev electric"
      : "",
    vehicleStatus.includes("dostupno") ? "slobodno" : "",
    vehicleStatus.includes("rezervisano") ? "rezervisano zauzeto" : "",
    vehicleStatus.includes("iznajmljeno") ? "zauzeto rentirano" : "",
    vehicleStatus.includes("servisu") ? "servis odrzavanje maintenance" : "",
    vehicleStatus.includes("van upotrebe") ? "neaktivno van funkcije" : "",
    vehicleStatus.includes("arhivirano") ? "arhiva arhivirano" : "",
    vehicle.registered === true
      ? "registrovano registrovan registrovana sa tablicama"
      : vehicle.registered === false
        ? "neregistrovano neregistrovan neregistrovana bez tablica nema tablica"
        : "",
  ];
  const searchable = normalizeVehicleSearch(
    [
      vehicle.name,
      vehicle.make,
      vehicle.model,
      vehicle.plate,
      vehicle.year,
      vehicle.location,
      vehicle.status,
      vehicle.vin,
      vehicle.fuel,
      vehicle.transmission,
      vehicle.category,
      vehicle.seats,
      ...aliases,
    ].join(" "),
  );
  const compactSearchable = compactVehicleSearch(searchable);

  return normalizedQuery.split(/\s+/).every((term) => {
    if (searchable.includes(term)) return true;
    const compactTerm = compactVehicleSearch(term);
    return compactTerm.length >= 2 && compactSearchable.includes(compactTerm);
  });
};

export const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? `${date.toLocaleDateString("sr-RS", { day: "2-digit", month: "short" })} • ${date.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}`
    : value;
};

export const bookingDate = (value: string) => {
  const date = new Date(value);
  return `${date.toLocaleDateString("sr-Latn-RS")} • ${date.toLocaleTimeString("sr-Latn-RS", { hour: "2-digit", minute: "2-digit" })}`;
};

const NON_BLOCKING_RESERVATION_STATUSES = new Set(["Završena", "Otkazana"]);

export const reservationBlocksVehicle = (status: string) =>
  !NON_BLOCKING_RESERVATION_STATUSES.has(status);

type UtilizationReservation = {
  vehicleId: number | null;
  startsAt: string;
  endsAt: string;
  status: string;
};

const UTILIZATION_STATUSES = new Set(["Aktivna", "Povrat danas", "Završena"]);
const DAY_IN_MILLISECONDS = 86_400_000;

export const calculateFleetUtilization = (
  reservations: readonly UtilizationReservation[],
  activeVehicleIds: readonly number[],
  periodStartsAt: Date,
  periodEndsAt: Date,
) => {
  const periodStart = periodStartsAt.getTime();
  const periodEnd = periodEndsAt.getTime();
  const vehicleIds = new Set(activeVehicleIds);
  const capacityMilliseconds =
    Number.isFinite(periodStart) &&
    Number.isFinite(periodEnd) &&
    periodEnd > periodStart
      ? vehicleIds.size * (periodEnd - periodStart)
      : 0;
  const periodsByVehicle = new Map<number, Array<[number, number]>>();

  if (capacityMilliseconds) {
    for (const reservation of reservations) {
      if (
        !reservation.vehicleId ||
        !vehicleIds.has(reservation.vehicleId) ||
        !UTILIZATION_STATUSES.has(reservation.status)
      ) continue;
      const start = Math.max(new Date(reservation.startsAt).getTime(), periodStart);
      const end = Math.min(new Date(reservation.endsAt).getTime(), periodEnd);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
        continue;
      const periods = periodsByVehicle.get(reservation.vehicleId) || [];
      periods.push([start, end]);
      periodsByVehicle.set(reservation.vehicleId, periods);
    }
  }

  let rentedMilliseconds = 0;
  for (const periods of Array.from(periodsByVehicle.values())) {
    periods.sort((first, second) => first[0] - second[0]);
    let currentStart = periods[0][0];
    let currentEnd = periods[0][1];
    for (let index = 1; index < periods.length; index += 1) {
      const [start, end] = periods[index];
      if (start <= currentEnd) currentEnd = Math.max(currentEnd, end);
      else {
        rentedMilliseconds += currentEnd - currentStart;
        currentStart = start;
        currentEnd = end;
      }
    }
    rentedMilliseconds += currentEnd - currentStart;
  }

  return {
    percentage: capacityMilliseconds
      ? Math.min(100, Math.round((rentedMilliseconds / capacityMilliseconds) * 100))
      : 0,
    rentedVehicleDays:
      Math.round((rentedMilliseconds / DAY_IN_MILLISECONDS) * 10) / 10,
    capacityVehicleDays:
      Math.round((capacityMilliseconds / DAY_IN_MILLISECONDS) * 10) / 10,
  };
};

export type CalculatedVehicleStatus =
  | "Dostupno"
  | "Rezervisano"
  | "Iznajmljeno"
  | "Na servisu"
  | "Van upotrebe"
  | "Arhivirano";

type StatusVehicle = {
  id: number;
  registered?: boolean;
  registrationExpiresAt?: string | null;
  outOfService?: boolean;
  archivedAt?: string | null;
};

type StatusReservation = {
  vehicleId: number | null;
  status: string;
  startsAt?: string;
  endsAt?: string;
};

type StatusService = {
  vehicleId: number | null;
  status: string;
};

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const registrationValidUntil = (value: string) => {
  const parsed = new Date(
    dateOnly.test(value) ? `${value}T23:59:59.999` : value,
  ).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};
const registrationBlocksCurrentUse = (
  vehicle: StatusVehicle,
  now: Date,
) => {
  if (vehicle.registered === false) return true;
  if (vehicle.registered !== true) return false;
  if (!vehicle.registrationExpiresAt) return true;
  const validUntil = registrationValidUntil(vehicle.registrationExpiresAt);
  return validUntil === null || now.getTime() > validUntil;
};

export const calculateVehicleStatuses = (
  vehicles: readonly StatusVehicle[],
  reservations: readonly StatusReservation[],
  services: readonly StatusService[],
  now = new Date(),
) => {
  const statusById = new Map<number, CalculatedVehicleStatus>();

  for (const vehicle of vehicles) {
    statusById.set(
      vehicle.id,
      vehicle.archivedAt
        ? "Arhivirano"
        : vehicle.outOfService || registrationBlocksCurrentUse(vehicle, now)
          ? "Van upotrebe"
          : "Dostupno",
    );
  }

  for (const service of services) {
    if (service.status !== "U toku") continue;
    const vehicleId = service.vehicleId;
    if (vehicleId && statusById.get(vehicleId) === "Dostupno")
      statusById.set(vehicleId, "Na servisu");
  }

  for (const reservation of reservations) {
    if (!["Aktivna", "Povrat danas"].includes(reservation.status)) continue;
    const vehicleId = reservation.vehicleId;
    if (
      vehicleId &&
      !["Arhivirano", "Van upotrebe", "Na servisu"].includes(
        statusById.get(vehicleId) || "",
      )
    ) statusById.set(vehicleId, "Iznajmljeno");
  }

  for (const reservation of reservations) {
    if (!reservationBlocksVehicle(reservation.status)) continue;
    const startsAt = reservation.startsAt
      ? new Date(reservation.startsAt).getTime()
      : Number.NaN;
    const endsAt = reservation.endsAt
      ? new Date(reservation.endsAt).getTime()
      : Number.NaN;
    const hasValidPeriod = Number.isFinite(startsAt) && Number.isFinite(endsAt);
    if (
      hasValidPeriod &&
      (startsAt > now.getTime() || endsAt <= now.getTime())
    ) continue;
    const vehicleId = reservation.vehicleId;
    if (vehicleId && statusById.get(vehicleId) === "Dostupno")
      statusById.set(vehicleId, "Rezervisano");
  }

  return statusById;
};

export const reservationPeriodsOverlap = (
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) => {
  const firstStartTime = new Date(firstStart).getTime();
  const firstEndTime = new Date(firstEnd).getTime();
  const secondStartTime = new Date(secondStart).getTime();
  const secondEndTime = new Date(secondEnd).getTime();

  return (
    [firstStartTime, firstEndTime, secondStartTime, secondEndTime].every(
      Number.isFinite,
    ) &&
    firstStartTime < secondEndTime &&
    firstEndTime > secondStartTime
  );
};

type VehicleReservationWindow = {
  vehicleId: number | null;
  startsAt: string;
  endsAt: string;
  status: string;
};

export const vehicleIsAvailableInPeriod = (
  vehicleId: number,
  reservations: readonly VehicleReservationWindow[],
  startsAt: string,
  endsAt: string,
) =>
  reservations.every(
    (reservation) =>
      reservation.vehicleId !== vehicleId ||
      !reservationBlocksVehicle(reservation.status) ||
      !reservationPeriodsOverlap(
        reservation.startsAt,
        reservation.endsAt,
        startsAt,
        endsAt,
      ),
  );

export type VehicleAvailabilityReasonCode =
  | "RESERVATION_OVERLAP"
  | "SERVICE_OVERLAP"
  | "ACTIVE_DAMAGE"
  | "UNREGISTERED"
  | "REGISTRATION_UNKNOWN"
  | "REGISTRATION_EXPIRES"
  | "ARCHIVED"
  | "OUT_OF_SERVICE"
  | "MANUAL_BLOCK";

export type VehicleAvailabilityReason = {
  code: VehicleAvailabilityReasonCode;
  message: string;
};

export type VehicleAvailabilityResult = {
  available: boolean;
  reasons: VehicleAvailabilityReason[];
};

type AvailabilityVehicle = {
  id: number;
  registered?: boolean;
  registrationExpiresAt?: string | null;
  outOfService?: boolean;
  archivedAt?: string | null;
};

type AvailabilityReservation = VehicleReservationWindow & {
  code?: string;
};

type AvailabilityService = {
  vehicleId: number | null;
  dueDate: string;
  endsAt?: string | null;
  status: string;
};

type AvailabilityDamage = {
  vehicleId: number | null;
  status: string;
};

type AvailabilityBlock = {
  vehicleId: number;
  startsAt: string;
  endsAt: string;
  status: string;
};

const startOfDate = (value: string) =>
  dateOnly.test(value) ? `${value}T00:00:00` : value;
const endOfDate = (value: string) => {
  if (!dateOnly.test(value)) return value;
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
};
export const calculateFleetAvailability = (
  vehicles: readonly AvailabilityVehicle[],
  reservations: readonly AvailabilityReservation[],
  services: readonly AvailabilityService[],
  damages: readonly AvailabilityDamage[],
  blocks: readonly AvailabilityBlock[],
  startsAt: string,
  endsAt: string,
  excludedReservationCode?: string,
) => {
  const results = new Map<number, VehicleAvailabilityResult>();
  const reasonsByVehicle = new Map<
    number,
    Map<VehicleAvailabilityReasonCode, string>
  >();
  const requestedEnd = new Date(endsAt).getTime();

  const addReason = (
    vehicleId: number,
    code: VehicleAvailabilityReasonCode,
    message: string,
  ) => reasonsByVehicle.get(vehicleId)?.set(code, message);

  for (const vehicle of vehicles) {
    reasonsByVehicle.set(vehicle.id, new Map());
    if (vehicle.archivedAt)
      addReason(vehicle.id, "ARCHIVED", "Vozilo je arhivirano.");
    if (vehicle.outOfService)
      addReason(
        vehicle.id,
        "OUT_OF_SERVICE",
        "Vozilo ima zabranu korišćenja.",
      );
    if (vehicle.registered === false)
      addReason(vehicle.id, "UNREGISTERED", "Vozilo nije registrovano.");
    else if (!vehicle.registrationExpiresAt)
      addReason(
        vehicle.id,
        "REGISTRATION_UNKNOWN",
        "Datum važenja registracije nije unet.",
      );
    const validUntil = vehicle.registrationExpiresAt
      ? registrationValidUntil(vehicle.registrationExpiresAt)
      : null;
    if (validUntil !== null && Number.isFinite(requestedEnd) && requestedEnd > validUntil)
      addReason(
        vehicle.id,
        "REGISTRATION_EXPIRES",
        "Registracija ne važi do kraja izabranog perioda.",
      );
  }

  for (const reservation of reservations) {
    if (
      reservation.code === excludedReservationCode ||
      !reservationBlocksVehicle(reservation.status) ||
      !reservationPeriodsOverlap(
        reservation.startsAt,
        reservation.endsAt,
        startsAt,
        endsAt,
      )
    ) continue;
    const vehicleId = reservation.vehicleId;
    if (vehicleId)
      addReason(
        vehicleId,
        "RESERVATION_OVERLAP",
        "Postoji rezervacija koja se preklapa sa izabranim periodom.",
      );
  }

  for (const service of services) {
    if (!["Planirano", "Uskoro", "U toku"].includes(service.status)) continue;
    const vehicleId = service.vehicleId;
    if (!vehicleId) continue;
    const overlaps =
      service.status === "U toku" && !service.endsAt
        ? true
        : reservationPeriodsOverlap(
            startOfDate(service.dueDate),
            endOfDate(service.endsAt || service.dueDate),
            startsAt,
            endsAt,
          );
    if (overlaps)
      addReason(
        vehicleId,
        "SERVICE_OVERLAP",
        "Servis se preklapa sa izabranim periodom.",
      );
  }

  for (const damage of damages) {
    if (!["Prijavljena", "U obradi"].includes(damage.status)) continue;
    const vehicleId = damage.vehicleId;
    if (vehicleId)
      addReason(
        vehicleId,
        "ACTIVE_DAMAGE",
        "Vozilo ima aktivnu štetu.",
      );
  }

  for (const block of blocks) {
    if (
      block.status === "Aktivna" &&
      reservationPeriodsOverlap(
        block.startsAt,
        block.endsAt,
        startsAt,
        endsAt,
      )
    )
      addReason(
        block.vehicleId,
        "MANUAL_BLOCK",
        "Period je ručno blokiran.",
      );
  }

  for (const vehicle of vehicles) {
    const reasons = Array.from(reasonsByVehicle.get(vehicle.id) || []).map(
      ([code, message]) => ({ code, message }),
    );
    results.set(vehicle.id, { available: reasons.length === 0, reasons });
  }
  return results;
};

export const statusTone = (status = "") =>
  status.includes("Dostupno") ||
  status.includes("Plaćeno") ||
  status.includes("Aktivan")
    ? "green"
    : status.includes("Iznajmljeno") ||
        status.includes("Aktivna") ||
        status.includes("U toku")
      ? "blue"
      : status.includes("Povrat") ||
          status.includes("servisu") ||
          status.includes("Van upotrebe") ||
          status.includes("Uskoro")
        ? "red"
        : status.includes("Potvr") || status.includes("Rezervisano")
          ? "violet"
          : "amber";
