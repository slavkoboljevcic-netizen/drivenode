/** Shared, dependency-free helpers used by the UI and API routes. */
export const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const displayPlate = (plate: string, registered?: boolean) =>
  registered === false || plate.startsWith("DNFM-NEREG-")
    ? "Nema tablica"
    : plate;

type SearchableVehicle = {
  name: string;
  plate: string;
  year: number;
  location: string;
  status: string;
  vin?: string;
  fuel?: string;
  transmission?: string;
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
    vehicleStatus.includes("iznajmljeno") ? "zauzeto rentirano" : "",
    vehicleStatus.includes("servisu") ? "servis odrzavanje maintenance" : "",
    vehicle.registered === true
      ? "registrovano registrovan registrovana sa tablicama"
      : vehicle.registered === false
        ? "neregistrovano neregistrovan neregistrovana bez tablica nema tablica"
        : "",
  ];
  const searchable = normalizeVehicleSearch(
    [
      vehicle.name,
      vehicle.plate,
      vehicle.year,
      vehicle.location,
      vehicle.status,
      vehicle.vin,
      vehicle.fuel,
      vehicle.transmission,
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
          status.includes("Uskoro")
        ? "red"
        : status.includes("Potvr") || status.includes("Rezervisano")
          ? "violet"
          : "amber";
