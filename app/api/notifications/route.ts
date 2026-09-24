import { getDb } from "../../../db";
import {
  deletedRecords,
  documents,
  reservations,
  serviceRecords,
  transactions,
  vehicleDamages,
  vehicles,
} from "../../../db/schema";

type Severity = "critical" | "warning" | "info";
type NotificationItem = {
  id: string;
  kind: "service" | "registration" | "reservation" | "document" | "finance" | "damage" | "vehicle";
  severity: Severity;
  title: string;
  detail: string;
  dueAt: string;
  targetPage: string;
  targetId: string;
};

const dateKey = (value: string | null | undefined) => String(value || "").slice(0, 10);
const dayNumber = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return Number.NaN;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
};
const localToday = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const displayDate = (value: string) =>
  new Date(`${dateKey(value)}T12:00:00Z`).toLocaleDateString("sr-Latn-RS", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
const displayPlate = (plate: string) =>
  plate.startsWith("DNFM-NEREG-") ? "neregistrovano vozilo" : plate;

export async function GET() {
  try {
    const db = getDb();
    const [
      serviceRows,
      reservationRows,
      documentRows,
      transactionRows,
      damageRows,
      vehicleRows,
      deletionRows,
    ] = await Promise.all([
      db.select().from(serviceRecords),
      db.select().from(reservations),
      db.select().from(documents),
      db.select().from(transactions),
      db.select().from(vehicleDamages),
      db.select().from(vehicles),
      db.select().from(deletedRecords),
    ]);

    const deleted = new Map<string, Set<string>>();
    for (const row of deletionRows) {
      if (!deleted.has(row.entity)) deleted.set(row.entity, new Set());
      deleted.get(row.entity)?.add(row.recordKey);
    }

    const today = localToday();
    const todayDay = dayNumber(today);
    const notifications: NotificationItem[] = [];

    for (const service of serviceRows) {
      if (
        deleted.get("services")?.has(service.code) ||
        ["Završeno", "Otkazano"].includes(service.status)
      ) continue;
      const due = dateKey(service.dueDate);
      const days = dayNumber(due) - todayDay;
      if (!Number.isFinite(days) || days > 30) continue;
      const registration = service.type.toLocaleLowerCase("sr").includes("registr");
      const overdue = days < 0;
      notifications.push({
        id: `${registration ? "registration" : "service"}:${service.code}:${due}`,
        kind: registration ? "registration" : "service",
        severity: overdue || days <= 3 ? "critical" : days <= 7 ? "warning" : "info",
        title: registration
          ? overdue ? "Registracija je istekla" : "Registracija uskoro ističe"
          : overdue ? "Servisni rok je prekoračen" : "Predstojeći servis",
        detail: `${service.vehicle} • ${displayPlate(service.plate)} • ${displayDate(due)}`,
        dueAt: due,
        targetPage: "Servisi i registracije",
        targetId: service.code,
      });
    }

    for (const reservation of reservationRows) {
      if (
        deleted.get("reservations")?.has(reservation.code) ||
        ["Završena", "Otkazana"].includes(reservation.status)
      ) continue;
      const start = dateKey(reservation.startsAt);
      const end = dateKey(reservation.endsAt);
      if (start === today) {
        notifications.push({
          id: `reservation-start:${reservation.code}:${start}`,
          kind: "reservation",
          severity: "warning",
          title: "Preuzimanje vozila danas",
          detail: `${reservation.client} • ${reservation.vehicle}`,
          dueAt: reservation.startsAt,
          targetPage: "Rezervacije",
          targetId: reservation.code,
        });
      }
      if (end === today) {
        notifications.push({
          id: `reservation-end:${reservation.code}:${end}`,
          kind: "reservation",
          severity: "critical",
          title: "Povrat vozila danas",
          detail: `${reservation.client} • ${reservation.vehicle}`,
          dueAt: reservation.endsAt,
          targetPage: "Rezervacije",
          targetId: reservation.code,
        });
      }
      if (reservation.status === "Na čekanju") {
        notifications.push({
          id: `reservation-pending:${reservation.code}`,
          kind: "reservation",
          severity: "warning",
          title: "Rezervacija čeka potvrdu",
          detail: `${reservation.code} • ${reservation.client} • ${reservation.vehicle}`,
          dueAt: reservation.startsAt,
          targetPage: "Rezervacije",
          targetId: reservation.code,
        });
      }
    }

    for (const document of documentRows) {
      if (
        deleted.get("documents")?.has(document.storageKey) ||
        !document.expiresAt
      ) continue;
      const expires = dateKey(document.expiresAt);
      const days = dayNumber(expires) - todayDay;
      if (!Number.isFinite(days) || days > 30) continue;
      notifications.push({
        id: `document:${document.id}:${expires}`,
        kind: "document",
        severity: days < 0 || days <= 3 ? "critical" : days <= 7 ? "warning" : "info",
        title: days < 0 ? "Dokument je istekao" : "Dokument uskoro ističe",
        detail: `${document.name} • ${document.linkedTo || document.folder} • ${displayDate(expires)}`,
        dueAt: expires,
        targetPage: "Dokumentacija",
        targetId: String(document.id),
      });
    }

    for (const transaction of transactionRows) {
      if (
        deleted.get("transactions")?.has(transaction.reference) ||
        transaction.status !== "Na čekanju"
      ) continue;
      notifications.push({
        id: `finance:${transaction.reference}`,
        kind: "finance",
        severity: "warning",
        title: "Transakcija čeka obradu",
        detail: `${transaction.description} • ${transaction.amount.toLocaleString("sr-RS")} RSD`,
        dueAt: transaction.date,
        targetPage: "Finansije",
        targetId: transaction.reference,
      });
    }

    for (const damage of damageRows) {
      if (!["Prijavljena", "U obradi"].includes(damage.status)) continue;
      notifications.push({
        id: `damage:${damage.code}`,
        kind: "damage",
        severity: damage.status === "Prijavljena" ? "critical" : "warning",
        title: damage.status === "Prijavljena" ? "Nova prijavljena šteta" : "Šteta je u obradi",
        detail: `${damage.vehicle} • ${displayPlate(damage.plate)} • ${damage.description}`,
        dueAt: damage.date,
        targetPage: "Vozila",
        targetId: damage.code,
      });
    }

    for (const vehicle of vehicleRows) {
      if (
        deleted.get("vehicles")?.has(vehicle.plate) ||
        vehicle.registered
      ) continue;
      notifications.push({
        id: `vehicle-unregistered:${vehicle.plate}`,
        kind: "vehicle",
        severity: "info",
        title: "Vozilo nije registrovano",
        detail: `${vehicle.name} • ${vehicle.location}`,
        dueAt: dateKey(vehicle.createdAt),
        targetPage: "Vozila",
        targetId: vehicle.plate,
      });
    }

    const severityOrder: Record<Severity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    notifications.sort((a, b) => {
      const severity = severityOrder[a.severity] - severityOrder[b.severity];
      if (severity) return severity;
      return String(a.dueAt).localeCompare(String(b.dueAt));
    });

    return Response.json({
      notifications: notifications.slice(0, 40),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Obaveštenja trenutno nisu dostupna.",
      },
      { status: 500 },
    );
  }
}

