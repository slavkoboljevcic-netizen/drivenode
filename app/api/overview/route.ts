import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { clients, deletedRecords, reservations, serviceRecords, transactions, vehicles } from "../../../db/schema";

const dayKey = (value: string | Date) => new Date(value).toISOString().slice(0, 10);
const money = (value: number) => `${value.toLocaleString("sr-RS")} RSD`;

export async function GET() {
  try {
    const db = getDb();
    const [vehicleRows, reservationRows, clientRows, serviceRows, transactionRows, deletionRows] = await Promise.all([
      db.select().from(vehicles).orderBy(desc(vehicles.id)),
      db.select().from(reservations).orderBy(desc(reservations.id)),
      db.select().from(clients).orderBy(desc(clients.id)),
      db.select().from(serviceRecords).orderBy(desc(serviceRecords.id)),
      db.select().from(transactions).orderBy(desc(transactions.id)),
      db.select().from(deletedRecords),
    ]);

    const deleted = new Map<string, Set<string>>();
    for (const row of deletionRows) {
      if (!deleted.has(row.entity)) deleted.set(row.entity, new Set());
      deleted.get(row.entity)?.add(row.recordKey);
    }
    const activeVehicles = vehicleRows.filter((row) => !deleted.get("vehicles")?.has(row.plate));
    const activeReservations = reservationRows.filter((row) => !deleted.get("reservations")?.has(row.code));
    const activeClients = clientRows.filter((row) => !deleted.get("clients")?.has(row.email));
    const activeServices = serviceRows.filter((row) => !deleted.get("services")?.has(row.code));
    const activeTransactions = transactionRows.filter((row) => !deleted.get("transactions")?.has(row.reference));

    const now = new Date();
    const today = dayKey(now);
    const month = today.slice(0, 7);
    const todayReservations = activeReservations.filter((row) => dayKey(row.startsAt) === today || dayKey(row.endsAt) === today);
    const activeRentalCount = activeReservations.filter((row) => ["Aktivna", "Povrat danas"].includes(row.status)).length;
    const todayRevenue = activeTransactions.filter((row) => row.kind === "Prihod" && row.status === "Plaćeno" && row.date === today).reduce((sum, row) => sum + row.amount, 0);
    const monthRevenue = activeTransactions.filter((row) => row.kind === "Prihod" && row.status === "Plaćeno" && row.date.startsWith(month)).reduce((sum, row) => sum + row.amount, 0);
    const monthExpenses = activeTransactions.filter((row) => row.kind === "Rashod" && row.status === "Plaćeno" && row.date.startsWith(month)).reduce((sum, row) => sum + row.amount, 0);
    const dueSoon = activeServices.filter((row) => row.status !== "Završeno" && row.status !== "Otkazano" && new Date(`${row.dueDate}T12:00:00`).getTime() <= now.getTime() + 30 * 86400000);
    const returnsToday = activeReservations.filter((row) => dayKey(row.endsAt) === today);
    const newReservations = activeReservations.filter((row) => String(row.createdAt).slice(0, 10) === today);
    const utilization = activeVehicles.length ? Math.round((activeRentalCount / activeVehicles.length) * 100) : 0;

    const activities = [
      ...activeReservations.map((row) => ({ id: row.code, kind: "reservation", title: `Rezervacija ${row.code}`, detail: `${row.client} • ${row.vehicle}`, at: row.createdAt, status: row.status })),
      ...activeVehicles.map((row) => ({ id: row.plate, kind: "vehicle", title: "Dodato vozilo", detail: `${row.name} • ${row.plate}`, at: row.createdAt, status: row.status })),
      ...activeClients.map((row) => ({ id: row.email, kind: "client", title: "Dodat klijent", detail: row.name, at: row.createdAt, status: row.status })),
      ...activeServices.map((row) => ({ id: row.code, kind: "service", title: row.type, detail: `${row.vehicle} • ${row.plate}`, at: row.createdAt, status: row.status })),
      ...activeTransactions.map((row) => ({ id: row.reference, kind: "finance", title: row.kind === "Prihod" ? "Evidentiran prihod" : "Evidentiran rashod", detail: `${row.description} • ${money(row.amount)}`, at: row.createdAt, status: row.status })),
    ].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 8);

    const revenueByDay = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (29 - index));
      const key = dayKey(date);
      return { date: key, value: activeTransactions.filter((row) => row.kind === "Prihod" && row.status === "Plaćeno" && row.date === key).reduce((sum, row) => sum + row.amount, 0) };
    });

    return Response.json({
      counts: { vehicles: activeVehicles.length, clients: activeClients.length, reservations: activeReservations.length, activeRentals: activeRentalCount, services: activeServices.length },
      dashboard: { todayRevenue, monthRevenue, monthExpenses, utilization, returnsToday: returnsToday.length, servicesSoon: dueSoon.length, newReservations: newReservations.length },
      todayReservations,
      activities,
      notices: dueSoon.slice(0, 4),
      revenueByDay,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Pregled nije učitan." }, { status: 500 });
  }
}
