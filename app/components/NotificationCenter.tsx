"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "./Button";
import "../styles/notification-center.css";

type NotificationItem = {
  id: string;
  kind: "service" | "registration" | "reservation" | "document" | "finance" | "damage" | "vehicle";
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  dueAt: string;
  targetPage: string;
  targetId: string;
};

const READ_KEY = "dnfm_notification_reads_v1";
const kindLabels: Record<NotificationItem["kind"], string> = {
  service: "Servis",
  registration: "Registracija",
  reservation: "Rezervacija",
  document: "Dokument",
  finance: "Finansije",
  damage: "Šteta",
  vehicle: "Vozilo",
};

const dateKey = (value: string) => value.slice(0, 10);
const dayNumber = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day
    ? Math.floor(Date.UTC(year, month - 1, day) / 86400000)
    : Number.NaN;
};
const todayKey = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const relativeDate = (value: string) => {
  const key = dateKey(value);
  const difference = dayNumber(key) - dayNumber(todayKey());
  if (!Number.isFinite(difference)) return "Datum nije određen";
  if (difference === 0) return "Danas";
  if (difference === 1) return "Sutra";
  if (difference === -1) return "Juče";
  if (difference < 0) return `Pre ${Math.abs(difference)} dana`;
  if (difference <= 7) return `Za ${difference} dana`;
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("sr-Latn-RS", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function NotificationCenter({
  go,
}: {
  go: (page: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const wrapper = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data.notifications || []);
      setError("");
    } catch {
      setError("Obaveštenja trenutno nisu dostupna.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
      if (Array.isArray(saved)) {
        setReadIds(new Set(saved.filter((id) => typeof id === "string")));
      }
    } catch {
      localStorage.removeItem(READ_KEY);
    }
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const persistReads = (next: Set<string>) => {
    setReadIds(next);
    localStorage.setItem(
      READ_KEY,
      JSON.stringify(Array.from(next).slice(-400)),
    );
  };
  const markRead = (id: string) => {
    if (readIds.has(id)) return;
    persistReads(new Set([...readIds, id]));
  };
  const unreadCount = items.filter((item) => !readIds.has(item.id)).length;
  const shown = useMemo(
    () =>
      filter === "unread"
        ? items.filter((item) => !readIds.has(item.id))
        : items,
    [filter, items, readIds],
  );
  const markAllRead = () => {
    persistReads(new Set([...readIds, ...items.map((item) => item.id)]));
  };
  const openItem = (item: NotificationItem) => {
    markRead(item.id);
    setOpen(false);
    go(item.targetPage);
  };

  return (
    <div className="notification-center" ref={wrapper}>
      <Button
        className={`notification-trigger ${open ? "active" : ""}`}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
        aria-label={`Obaveštenja, ${unreadCount} nepročitanih`}
        aria-expanded={open}
        title="Obaveštenja"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <section
          className="notification-panel"
          role="dialog"
          aria-label="Centar obaveštenja"
        >
          <header>
            <div>
              <h2>Obaveštenja</h2>
              <p>
                {unreadCount
                  ? `${unreadCount} nepročitanih`
                  : "Sve je pregledano"}
              </p>
            </div>
            <Button
              className="notification-close"
              onClick={() => setOpen(false)}
              aria-label="Zatvori obaveštenja"
            >
              ×
            </Button>
          </header>

          <div className="notification-toolbar">
            <div className="notification-tabs">
              <Button
                className={filter === "all" ? "active" : ""}
                onClick={() => setFilter("all")}
              >
                Sve <span>{items.length}</span>
              </Button>
              <Button
                className={filter === "unread" ? "active" : ""}
                onClick={() => setFilter("unread")}
              >
                Nepročitane <span>{unreadCount}</span>
              </Button>
            </div>
            <Button
              className="notification-refresh"
              onClick={() => void load()}
              aria-label="Osveži obaveštenja"
              title="Osveži"
            >
              ↻
            </Button>
          </div>

          <div className="notification-list">
            {loading && (
              <div className="notification-state">Učitavanje obaveštenja…</div>
            )}
            {!loading && error && (
              <div className="notification-state error">
                <b>Nije moguće učitati obaveštenja.</b>
                <Button onClick={() => void load()}>Pokušaj ponovo</Button>
              </div>
            )}
            {!loading &&
              !error &&
              shown.map((item) => {
                const unread = !readIds.has(item.id);
                return (
                  <Button
                    className={`notification-item ${item.severity} ${unread ? "unread" : ""}`}
                    key={item.id}
                    onClick={() => openItem(item)}
                  >
                    <span className="notification-kind" aria-hidden="true">
                      {item.kind === "reservation"
                        ? "R"
                        : item.kind === "document"
                          ? "D"
                          : item.kind === "finance"
                            ? "F"
                            : item.kind === "damage"
                              ? "Š"
                              : item.kind === "vehicle"
                                ? "V"
                                : "S"}
                    </span>
                    <span className="notification-copy">
                      <b>{item.title}</b>
                      <small>{item.detail}</small>
                      <em>
                        {relativeDate(item.dueAt)} • {kindLabels[item.kind]}
                      </em>
                    </span>
                    {unread && <i aria-label="Nepročitano" />}
                  </Button>
                );
              })}
            {!loading && !error && !shown.length && (
              <div className="notification-state empty">
                <strong>✓</strong>
                <b>
                  {filter === "unread"
                    ? "Nema nepročitanih obaveštenja"
                    : "Nema novih obaveza"}
                </b>
                <span>Sve je pod kontrolom.</span>
              </div>
            )}
          </div>

          <footer>
            <Button onClick={markAllRead} disabled={!unreadCount}>
              Označi sve kao pročitano
            </Button>
            <small>Automatsko osvežavanje na 60 sekundi</small>
          </footer>
        </section>
      )}
    </div>
  );
}

