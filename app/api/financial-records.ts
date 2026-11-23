import type {
  deletedRecords,
  reservations,
  serviceRecords,
  transactions,
  vehicles,
} from "../../db/schema";

type TransactionRow = typeof transactions.$inferSelect;
type ServiceRow = typeof serviceRecords.$inferSelect;
type ReservationRow = typeof reservations.$inferSelect;
type VehicleRow = typeof vehicles.$inferSelect;
type DeletedRow = typeof deletedRecords.$inferSelect;

const cityFromLocation = (location: string) =>
  location.split(" • ")[0]?.trim() || "Nije određena";

const dateFromValue = (value: string) => value.slice(0, 10);

export const businessDateKey = (value: string | Date) => {
  const raw = value instanceof Date ? value.toISOString() : value;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)) return dateFromValue(raw);
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return dateFromValue(raw);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const reservationRevenueDate = (reservation: {
  completedAt?: string | null;
  endsAt: string;
}) =>
  reservation.completedAt
    ? businessDateKey(reservation.completedAt)
    : dateFromValue(reservation.endsAt);

const normalized = (value: string) => value.trim().toLocaleLowerCase("sr-Latn");

const daysBetween = (first: string, second: string) => {
  const firstTime = new Date(`${dateFromValue(first)}T12:00:00`).getTime();
  const secondTime = new Date(`${dateFromValue(second)}T12:00:00`).getTime();
  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) return Infinity;
  return Math.abs(firstTime - secondTime) / 86400000;
};

export function buildFinancialRecords({
  deleted,
  manual,
  reservationRows,
  services,
  vehicleRows,
}: {
  deleted: DeletedRow[];
  manual: TransactionRow[];
  reservationRows: ReservationRow[];
  services: ServiceRow[];
  vehicleRows: VehicleRow[];
}) {
  const hidden = new Map<string, Set<string>>();
  for (const row of deleted) {
    if (!hidden.has(row.entity)) hidden.set(row.entity, new Set());
    hidden.get(row.entity)?.add(row.recordKey);
  }

  const hiddenTransactions = hidden.get("transactions") || new Set<string>();
  const vehiclesById = new Map(vehicleRows.map((vehicle) => [vehicle.id, vehicle]));
  const vehicleNames = new Map(
    vehicleRows.map((vehicle) => [vehicle.id, vehicle.name]),
  );
  const vehicleLocations = new Map(
    vehicleRows.map((vehicle) => [vehicle.id, cityFromLocation(vehicle.location)]),
  );
  const legacyLocations = new Map(
    vehicleRows.map((vehicle) => [vehicle.plate, cityFromLocation(vehicle.location)]),
  );

  const visibleManualRecords = manual.filter(
    (transaction) => !hiddenTransactions.has(transaction.reference),
  );
  const completedReservations = reservationRows.filter(
    (reservation) =>
      reservation.status === "Završena" &&
      reservation.price > 0 &&
      !hidden.get("reservations")?.has(reservation.code),
  );
  const rentalIncomeRecords = visibleManualRecords.filter(
    (transaction) =>
      transaction.kind === "Prihod" &&
      transaction.status !== "Stornirano" &&
      normalized(transaction.category).includes("najam"),
  );
  const matchesReservation = (
    transaction: TransactionRow,
    reservation: ReservationRow,
  ) =>
    transaction.amount === reservation.price &&
    normalized(cityFromLocation(transaction.location)) ===
      normalized(cityFromLocation(reservation.location)) &&
    daysBetween(transaction.date, reservationRevenueDate(reservation)) <= 7;
  const reservationByManualReference = new Map<string, ReservationRow>();
  for (const transaction of rentalIncomeRecords) {
    const searchable = normalized(
      `${transaction.description} ${transaction.notes}`,
    );
    const directMatch = completedReservations.find((reservation) =>
      searchable.includes(normalized(reservation.code)),
    );
    if (directMatch) {
      reservationByManualReference.set(transaction.reference, directMatch);
      continue;
    }

    const candidates = completedReservations.filter((reservation) =>
      matchesReservation(transaction, reservation),
    );
    if (candidates.length !== 1) continue;
    const [candidate] = candidates;
    const competingTransactions = rentalIncomeRecords.filter((record) =>
      matchesReservation(record, candidate),
    );
    if (competingTransactions.length === 1)
      reservationByManualReference.set(transaction.reference, candidate);
  }
  const linkedReservationCodes = new Set(
    Array.from(reservationByManualReference.values()).map(
      (reservation) => reservation.code,
    ),
  );
  const resolveReservationVehicleId = (reservation: ReservationRow) => {
    if (reservation.vehicleId) return reservation.vehicleId;
    const matchingVehicles = vehicleRows.filter(
      (vehicle) => normalized(vehicle.name) === normalized(reservation.vehicle),
    );
    return matchingVehicles.length === 1 ? matchingVehicles[0].id : null;
  };
  const manualRecords = visibleManualRecords.map((transaction) => {
    const reservation = reservationByManualReference.get(transaction.reference);
    if (!reservation) return transaction;
    return {
      ...transaction,
      vehicleId:
        transaction.vehicleId || resolveReservationVehicleId(reservation),
      notes:
        transaction.notes ||
        `Povezano sa završenom rezervacijom ${reservation.code}.`,
    };
  });
  const serviceRecordsAsTransactions: TransactionRow[] = services
    .filter(
      (service) =>
        service.cost > 0 && !hidden.get("services")?.has(service.code),
    )
    .map((service) => ({
      id: -service.id,
      vehicleId: service.vehicleId,
      reference: `AUTO-${service.code}`,
      description: `${service.type} — ${service.vehicleId ? vehicleNames.get(service.vehicleId) || service.vehicle : service.vehicle}`,
      category: service.type === "Registracija" ? "Registracija" : "Servis",
      kind: "Rashod",
      amount: service.cost,
      date: service.dueDate,
      location:
        (service.vehicleId
          ? vehicleLocations.get(service.vehicleId)
          : undefined) ||
        legacyLocations.get(service.plate) ||
        "Nije određena",
      status:
        service.status === "Završeno"
          ? "Plaćeno"
          : service.status === "Otkazano"
            ? "Stornirano"
            : "Na čekanju",
      paymentMethod: "Automatski",
      notes: `Povezano sa zapisom ${service.code} u Servisima i registracijama.`,
      createdAt: service.createdAt,
    }));
  const reservationRecordsAsTransactions: TransactionRow[] =
    completedReservations
    .filter((reservation) => !linkedReservationCodes.has(reservation.code))
    .map((reservation) => {
      const vehicleId = resolveReservationVehicleId(reservation);
      const vehicle = vehicleId
        ? vehiclesById.get(vehicleId)
        : undefined;
      return {
        id: -1_000_000 - reservation.id,
        vehicleId,
        reference: `AUTO-RES-${reservation.code}`,
        description: `Najam ${reservation.code} — ${reservation.client} • ${vehicle?.name || reservation.vehicle}`,
        category: "Najam vozila",
        kind: "Prihod",
        amount: reservation.price,
        date: reservationRevenueDate(reservation),
        location: cityFromLocation(reservation.location),
        status: "Plaćeno",
        paymentMethod: "Automatski",
        notes: `Automatski prihod povezan sa završenom rezervacijom ${reservation.code}.`,
        createdAt: reservation.completedAt || reservation.endsAt,
      };
    });

  return [
    ...manualRecords,
    ...serviceRecordsAsTransactions,
    ...reservationRecordsAsTransactions,
  ]
    .filter((record) => !hiddenTransactions.has(record.reference))
    .sort((first, second) =>
      String(second.createdAt).localeCompare(String(first.createdAt)),
    );
}
