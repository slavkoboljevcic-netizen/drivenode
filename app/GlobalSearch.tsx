"use client";

import { useEffect, useRef, useState } from "react";
import "./global-search.css";
import Button from "./Button";

type Vehicle = { name: string; plate: string; year: number; km: string; location: string; status: string; service: string; vin: string; fuel: string; transmission: string };
type Booking = { id: string; client: string; vehicle: string; from: string; to: string; price: string; status: string };
type Result = { type: "vehicle" | "reservation" | "client"; id: string; title: string; subtitle: string; data: Record<string, unknown> };

const bookingDate = (value: unknown) => `${new Date(String(value)).toLocaleDateString("sr-Latn-RS")} • ${new Date(String(value)).toLocaleTimeString("sr-Latn-RS", { hour: "2-digit", minute: "2-digit" })}`;

export default function GlobalSearch({ openVehicle, openBooking, go }: { openVehicle: (vehicle: Vehicle) => void; openBooking: (booking: Booking) => void; go: (page: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); input.current?.focus(); }
      if (event.key === "Escape") { setQuery(""); setResults([]); input.current?.blur(); }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setResults(data.results || [])).catch((error) => { if (error?.name !== "AbortError") setResults([]); }).finally(() => setLoading(false));
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const choose = (result: Result) => {
    setQuery(""); setResults([]);
    if (result.type === "vehicle") {
      const row = result.data;
      openVehicle({ name: String(row.name), plate: String(row.plate), year: Number(row.year), km: `${Number(row.km).toLocaleString("sr-RS")} km`, location: String(row.location), status: String(row.status), service: String(row.service), vin: String(row.vin || ""), fuel: String(row.fuel || ""), transmission: String(row.transmission || "") });
    } else if (result.type === "reservation") {
      const row = result.data;
      openBooking({ id: String(row.code), client: String(row.client), vehicle: String(row.vehicle), from: bookingDate(row.startsAt), to: bookingDate(row.endsAt), price: `${Number(row.price).toLocaleString("sr-RS")} RSD`, status: String(row.status) });
    } else go("Klijenti");
  };

  return <div className="search"><span>⌕</span><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pretraži vozila, rezervacije, klijente..." aria-label="Globalna pretraga"/><kbd>⌘ K</kbd>{query.trim().length >= 2 && <div className="search-results">{loading && <div className="search-state">Pretraživanje…</div>}{!loading && results.map((result) => <Button key={`${result.type}-${result.id}`} onClick={() => choose(result)}><b>{result.title}</b><small>{result.type === "vehicle" ? "Vozilo" : result.type === "reservation" ? "Rezervacija" : "Klijent"} • {result.subtitle}</small></Button>)}{!loading && !results.length && <div className="search-state">Nema rezultata za „{query}”.</div>}</div>}</div>;
}
