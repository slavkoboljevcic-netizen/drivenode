"use client";

import { useEffect, useMemo, useState } from "react";
import "./dashboard-live.css";
import Button from "./Button";

type Booking = { id: string; client: string; vehicle: string; from: string; to: string; price: string; status: string };
type Service = { code: string; vehicle: string; type: string; dueDate: string };
type Overview = {
  counts: { vehicles: number; clients: number; reservations: number; activeRentals: number; services: number };
  dashboard: { todayRevenue: number; monthRevenue: number; monthExpenses: number; utilization: number; returnsToday: number; servicesSoon: number; newReservations: number };
  todayReservations: Array<{ code: string; client: string; vehicle: string; startsAt: string; endsAt: string; price: number; status: string }>;
  activities: Array<{ id: string; kind: string; title: string; detail: string; at: string; status: string }>;
  notices: Service[];
  revenueByDay: Array<{ date: string; value: number }>;
};

const empty: Overview = { counts: { vehicles: 0, clients: 0, reservations: 0, activeRentals: 0, services: 0 }, dashboard: { todayRevenue: 0, monthRevenue: 0, monthExpenses: 0, utilization: 0, returnsToday: 0, servicesSoon: 0, newReservations: 0 }, todayReservations: [], activities: [], notices: [], revenueByDay: [] };
const rsd = (value: number) => `${Number(value || 0).toLocaleString("sr-RS")} RSD`;
const displayDate = (value: string) => new Date(value).toLocaleDateString("sr-Latn-RS", { day: "2-digit", month: "2-digit" });
const bookingDate = (value: string) => `${new Date(value).toLocaleDateString("sr-Latn-RS")} • ${new Date(value).toLocaleTimeString("sr-Latn-RS", { hour: "2-digit", minute: "2-digit" })}`;
const badgeTone = (status: string) => status.includes("Aktiv") ? "blue" : status.includes("Potvr") ? "violet" : status.includes("Povrat") ? "red" : "amber";

export default function DashboardLive({ go, openBooking, newReservation, addVehicle, newClient }: { go: (page: string) => void; openBooking: (booking: Booking) => void; newReservation: () => void; addVehicle: () => void; newClient: () => void }) {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState<Overview>(empty);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/overview").then((response) => response.ok ? response.json() : Promise.reject()).then(setData).catch(() => setData(empty)).finally(() => setLoading(false)); }, []);

  const revenue = data.revenueByDay.slice(-period);
  const revenueTotal = revenue.reduce((sum, item) => sum + item.value, 0);
  const maxRevenue = Math.max(1, ...revenue.map((item) => item.value));
  const todayBookings = useMemo<Booking[]>(() => data.todayReservations.map((row) => ({ id: row.code, client: row.client, vehicle: row.vehicle, from: bookingDate(row.startsAt), to: bookingDate(row.endsAt), price: rsd(row.price), status: row.status })), [data.todayReservations]);
  const pageFor = (kind: string) => kind === "vehicle" ? "Vozila" : kind === "client" ? "Klijenti" : kind === "service" ? "Servisi i registracije" : kind === "finance" ? "Finansije" : "Rezervacije";
  const kpis = [
    ["Aktivna vozila", String(data.counts.vehicles), data.counts.vehicles ? "u bazi vozila" : "nema vozila", "uživo", "blue"],
    ["Današnji prihod", rsd(data.dashboard.todayRevenue), "plaćene transakcije", "uživo", "green"],
    ["Iskorišćenost", `${data.dashboard.utilization}%`, `${data.counts.activeRentals} aktivnih najmova`, "uživo", "violet"],
    ["Povrat danas", String(data.dashboard.returnsToday), "prema rezervacijama", "uživo", "amber"],
    ["Servis uskoro", String(data.dashboard.servicesSoon), "u narednih 30 dana", "uživo", "red"],
    ["Nove rezervacije", String(data.dashboard.newReservations), "kreirane danas", "uživo", "cyan"],
  ];
  const actions = [() => go("Vozila"), () => go("Finansije"), () => go("Izveštaji"), () => go("Rezervacije"), () => go("Servisi i registracije"), () => go("Rezervacije")];

  return <>
    <div className="page-title"><div><p>{new Date().toLocaleDateString("sr-Latn-RS", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</p><h1>Dobro došli 👋</h1><small>{loading ? "Učitavanje poslovnih podataka…" : "Pregled je povezan sa stvarnim zapisima vaše firme."}</small></div></div>
    <div className="kpi-grid">{kpis.map((item, index) => <article className="kpi clickable" key={item[0]} onClick={actions[index]} tabIndex={0}><div className={`kpi-icon ${item[4]}`}>◇</div><span>{item[0]}</span><strong>{item[1]}</strong><footer><small>{item[2]}</small><b className={item[4]}>{item[3]}</b></footer></article>)}</div>
    <div className="dashboard-grid">
      <section className="panel revenue dashboard-link" onClick={() => go("Finansije")}><div className="panel-head"><div><h2>Prihod</h2><p>Poslednjih {period} dana</p></div><Button onClick={(event) => { event.stopPropagation(); setPeriod((value) => value === 7 ? 30 : 7); }}>{period} dana ⌄</Button></div><div className="revenue-stat"><strong>{rsd(revenueTotal)}</strong><span>iz plaćenih prihoda</span></div><div className="dashboard-revenue-bars">{revenue.map((item) => <i key={item.date} title={`${item.date}: ${rsd(item.value)}`} style={{ height: `${Math.max(3, Math.round(item.value / maxRevenue * 100))}%` }} />)}</div><div className="chart-labels static"><span>Početak</span><span>Sredina</span><span>Danas</span></div></section>
      <section className="panel activities"><div className="panel-head"><div><h2>Poslednje aktivnosti</h2><p>{data.activities.length} događaja</p></div></div>{data.activities.slice(0, 5).map((activity, index) => <div className="activity dashboard-link" key={activity.kind + activity.id} onClick={() => go(pageFor(activity.kind))}><b>{displayDate(activity.at)}</b><i className={index % 2 ? "green" : "blue"}/><div><span>{activity.title}</span><strong>{activity.detail}</strong><small>{activity.status}</small></div></div>)}{!loading && !data.activities.length && <div className="empty-table">Još nema evidentiranih aktivnosti.</div>}</section>
    </div>
    <div className="dashboard-lower">
      <section className="panel"><div className="panel-head"><div><h2>Današnje rezervacije</h2><p>{todayBookings.length ? `${todayBookings.length} aktivnosti` : "Nema aktivnosti"}</p></div><a onClick={() => go("Rezervacije")}>Sve rezervacije</a></div>{todayBookings.slice(0, 4).map((booking) => <div className="mini-row dashboard-link" key={booking.id} onClick={() => openBooking(booking)}><div className="avatar">{booking.client.split(" ").map((word) => word[0]).join("")}</div><div><strong>{booking.client}</strong><small>{booking.vehicle}</small></div><span className={`badge ${badgeTone(booking.status)}`}><i/>{booking.status}</span><b>{booking.from.split("•")[1]}</b></div>)}{!loading && !todayBookings.length && <div className="empty-table">Danas nema preuzimanja ni povrata.</div>}</section>
      <section className="panel notice-panel"><div className="panel-head"><div><h2>Obaveštenja</h2><p>{data.notices.length ? "Zahtevaju pažnju" : "Nema hitnih obaveza"}</p></div></div>{data.notices.map((notice) => <div className="notice dashboard-link" key={notice.code} onClick={() => go("Servisi i registracije")}><i className="red">◇</i><div><strong>{notice.type}</strong><small>{notice.vehicle} • rok {new Date(`${notice.dueDate}T12:00`).toLocaleDateString("sr-Latn-RS")}</small></div><span>›</span></div>)}{!loading && !data.notices.length && <div className="empty-table">Svi rokovi su uredni.</div>}</section>
      <section className="panel quick"><div className="panel-head"><div><h2>Brze akcije</h2><p>Najčešće radnje</p></div></div><Button onClick={newReservation}><b>+</b>Nova rezervacija</Button><Button onClick={addVehicle}><b>◇</b>Dodaj vozilo</Button><Button onClick={newClient}><b>◉</b>Novi klijent</Button></section>
    </div>
  </>;
}
