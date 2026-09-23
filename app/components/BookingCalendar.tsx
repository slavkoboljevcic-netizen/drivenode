"use client";

import { useEffect, useState } from "react";
import Button from "./Button";
import CustomSelect from "./CustomSelect";
import {
  AddIcon,
  BackIcon,
  ChevronRightIcon,
} from "./icons";
import { PageHeader, onKeyboardAction } from "./ui";

export type CalendarBooking = {
  id: string;
  client: string;
  vehicle: string;
  from: string;
  to: string;
  price: string;
  status: string;
};

type CalendarEvent = CalendarBooking & { date: Date };

type BookingCalendarProps = {
  open: (booking: CalendarBooking) => void;
  newReservation: () => void;
  refresh: number;
  overrides: Record<string, string>;
};

const viewModes = ["Mesec", "Nedelja", "Dan"];
const statuses = [
  "Svi statusi",
  "Na čekanju",
  "Potvrđena",
  "Aktivna",
  "Povrat danas",
  "Završena",
  "Otkazana",
];

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? `${date.toLocaleDateString("sr-RS", { day: "2-digit", month: "short" })} • ${date.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}`
    : value;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const badgeTone = (status = "") =>
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

function StatusBadge({ status }: { status?: string }) {
  return (
    <span className={`badge ${badgeTone(status)}`}>
      <i />
      {status || "Nije određeno"}
    </span>
  );
}

export default function BookingCalendar({
  open,
  newReservation,
  refresh,
  overrides,
}: BookingCalendarProps) {
  const [mode, setMode] = useState("Mesec");
  const [cursor, setCursor] = useState(() => new Date());
  const [status, setStatus] = useState("Svi statusi");
  const [savedBookings, setSavedBookings] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    fetch("/api/reservations")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) =>
        setSavedBookings(
          (data.reservations || []).map(
            (reservation: {
              code: string;
              client: string;
              vehicle: string;
              startsAt: string;
              endsAt: string;
              price: number;
              status: string;
            }) => ({
              id: reservation.code,
              client: reservation.client,
              vehicle: reservation.vehicle,
              from: formatDate(reservation.startsAt),
              to: formatDate(reservation.endsAt),
              price: `${Number(reservation.price).toLocaleString("sr-RS")} RSD`,
              status: reservation.status,
              date: new Date(reservation.startsAt),
            }),
          ),
        ),
      )
      .catch(() => {});
  }, [refresh]);

  const events = savedBookings
    .map((booking) => ({
      ...booking,
      status: overrides[booking.id] || booking.status,
    }))
    .filter((booking) => status === "Svi statusi" || booking.status === status);
  const actualToday = new Date();

  const move = (direction: number) =>
    setCursor((date) => {
      const nextDate = new Date(date);
      if (mode === "Mesec") nextDate.setMonth(nextDate.getMonth() + direction);
      else {
        nextDate.setDate(
          nextDate.getDate() + direction * (mode === "Nedelja" ? 7 : 1),
        );
      }
      return nextDate;
    });
  const goToday = () => setCursor(new Date());
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - ((monthStart.getDay() + 6) % 7));
  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const weekStart = new Date(cursor);
  weekStart.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
  const title =
    mode === "Mesec"
      ? cursor.toLocaleDateString("sr-Latn-RS", {
          month: "long",
          year: "numeric",
        })
      : mode === "Nedelja"
        ? `${weekDays[0].toLocaleDateString("sr-Latn-RS", { day: "numeric", month: "short" })} - ${weekDays[6].toLocaleDateString("sr-Latn-RS", { day: "numeric", month: "short", year: "numeric" })}`
        : cursor.toLocaleDateString("sr-Latn-RS", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
  const eventsForDate = (date: Date) =>
    events.filter((booking) => sameDay(booking.date, date));
  const eventButton = (booking: CalendarEvent) => (
    <Button
      key={booking.id}
      className={`calendar-event ${badgeTone(booking.status)}`}
      onClick={(event) => {
        event.stopPropagation();
        open(booking);
      }}
    >
      <b>{booking.from.split("•")[1] || "09:00"}</b>{" "}
      {booking.vehicle.replace("Volkswagen ", "")} •{" "}
      {booking.client.split(" ")[0]}
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Kalendar rezervacija"
        subtitle="Planirajte dostupnost flote i raspored preuzimanja."
        action="Nova rezervacija"
        onAction={newReservation}
      />
      <div className="calendar-toolbar">
        <div className="segmented">
          {viewModes.map((viewMode) => (
            <Button
              onClick={() => setMode(viewMode)}
              className={mode === viewMode ? "active" : ""}
              key={viewMode}
            >
              {viewMode}
            </Button>
          ))}
        </div>
        <div className="calendar-nav">
          <Button onClick={() => move(-1)} aria-label="Prethodni period">
            <BackIcon aria-hidden="true" />
          </Button>
          <Button onClick={goToday}>Danas</Button>
          <Button onClick={() => move(1)} aria-label="Sledeći period">
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
        <h2>{title}</h2>
        <CustomSelect value={status} onChange={(event) => setStatus(event.target.value)}>
          {statuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </CustomSelect>
      </div>
      {mode === "Mesec" ? (
        <section className="calendar panel">
          <div className="weekdays">
            {["PON", "UTO", "SRE", "ČET", "PET", "SUB", "NED"].map((day) => (
              <b key={day}>{day}</b>
            ))}
          </div>
          <div className="calendar-grid">
            {monthDays.map((date) => (
              <div
                className={`${sameDay(date, actualToday) ? "today " : ""}${date.getMonth() !== cursor.getMonth() ? "outside" : ""}`}
                key={date.toISOString()}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setCursor(date);
                  setMode("Dan");
                }}
                onKeyDown={onKeyboardAction(() => {
                  setCursor(date);
                  setMode("Dan");
                })}
              >
                <span>{date.getDate()}</span>
                {eventsForDate(date).map(eventButton)}
              </div>
            ))}
          </div>
        </section>
      ) : mode === "Nedelja" ? (
        <section className="panel week-calendar">
          {weekDays.map((date) => (
            <div
              key={date.toISOString()}
              className={sameDay(date, actualToday) ? "today" : ""}
              role="button"
              tabIndex={0}
              onClick={() => {
                setCursor(date);
                setMode("Dan");
              }}
              onKeyDown={onKeyboardAction(() => {
                setCursor(date);
                setMode("Dan");
              })}
            >
              <header>
                <b>
                  {date.toLocaleDateString("sr-Latn-RS", { weekday: "short" })}
                </b>
                <span>{date.getDate()}</span>
              </header>
              <section>
                {eventsForDate(date).map(eventButton)}
                {!eventsForDate(date).length && <small>Slobodan dan</small>}
              </section>
            </div>
          ))}
        </section>
      ) : (
        <section className="panel day-calendar">
          <div className="day-hours">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index}>{String(index + 8).padStart(2, "0")}:00</span>
            ))}
          </div>
          <div className="day-agenda">
            {eventsForDate(cursor).map(eventButton)}
            {!eventsForDate(cursor).length && (
              <div className="calendar-empty">
                <b>Nema rezervacija ovog dana</b>
                <span>Kliknite ispod da kreirate novu rezervaciju.</span>
              </div>
            )}
            <Button className="add-calendar-event" onClick={newReservation}>
              <AddIcon className="button-icon" aria-hidden="true" />
              Dodaj rezervaciju za ovaj dan
            </Button>
          </div>
        </section>
      )}
      <div className="calendar-legend">
        <Button onClick={() => setStatus("Aktivna")}>
          <StatusBadge status="Aktivna" />
        </Button>
        <Button onClick={() => setStatus("Potvrđena")}>
          <StatusBadge status="Potvrđena" />
        </Button>
        <Button onClick={() => setStatus("Povrat danas")}>
          <StatusBadge status="Povrat danas" />
        </Button>
        <Button onClick={() => setStatus("Svi statusi")}>Prikaži sve</Button>
      </div>
    </>
  );
}
