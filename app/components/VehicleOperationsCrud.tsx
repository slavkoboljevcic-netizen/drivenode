"use client";
import { useCallback, useEffect, useState } from "react";
import "../styles/vehicle-operations-crud.css";
import Button from "./Button";
import { AddIcon, CloseIcon, DocumentIcon, MoreIcon } from "./icons";
import { DrawerFrame, EmptyState, onKeyboardAction } from "./ui";
type Vehicle = { name: string; plate: string; km: string; location: string };
type Row = {
  id?: number;
  code?: string;
  reference?: string;
  type?: string;
  description?: string;
  client?: string;
  dueDate?: string;
  date?: string;
  startsAt?: string;
  endsAt?: string;
  cost?: number;
  amount?: number;
  price?: number;
  status?: string;
  notes?: string;
  plate?: string;
  vehicle?: string;
  mileage?: number;
  workshop?: string;
  category?: string;
  kind?: string;
  location?: string;
  paymentMethod?: string;
};
type Form = {
  title: string;
  date: string;
  endDate: string;
  amount: string;
  status: string;
  notes: string;
  workshop: string;
};
const cfg = (tab: string) =>
  tab === "Servisi"
    ? { url: "/api/services", key: "services" }
    : tab === "Troškovi"
      ? { url: "/api/transactions", key: "transactions" }
      : tab === "Rezervacije"
        ? { url: "/api/reservations", key: "reservations" }
        : { url: "/api/damages", key: "damages" };
const keyOf = (row: Row) => String(row.code || row.reference || row.id || "");
const titleOf = (row: Row) =>
  row.type ||
  row.client ||
  row.description?.replace(/^\[[^\]]+\]\s*/, "") ||
  row.code ||
  row.reference ||
  "Zapis";
const statuses = (tab: string) =>
  tab === "Servisi"
    ? ["Planirano", "Uskoro", "U toku", "Završeno", "Otkazano"]
    : tab === "Troškovi"
      ? ["Plaćeno", "Na čekanju", "Stornirano"]
      : tab === "Rezervacije"
        ? [
            "Na čekanju",
            "Potvrđena",
            "Aktivna",
            "Povrat danas",
            "Završena",
            "Otkazana",
          ]
        : ["Prijavljena", "U obradi", "Popravljena", "Zatvorena"];
function Menu({
  row,
  open,
  remove,
}: {
  row: Row;
  open: () => void;
  remove: () => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="row-menu vehicle-crud-menu">
      <Button
        className="row-action"
        aria-label={`Opcije za ${titleOf(row)}`}
        onClick={(e) => {
          e.stopPropagation();
          setVisible((x) => !x);
        }}
      >
        <MoreIcon aria-hidden="true" />
      </Button>
      {visible && (
        <div className="row-menu-pop">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setVisible(false);
              open();
            }}
          >
            Otvori i uredi
          </Button>
          <Button
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              setVisible(false);
              remove();
            }}
          >
            Obriši
          </Button>
        </div>
      )}
    </div>
  );
}
function Drawer({
  tab,
  v,
  row,
  close,
  saved,
}: {
  tab: string;
  v: Vehicle;
  row: Row | null;
  close: () => void;
  saved: () => void;
}) {
  const editing = Boolean(row);
  const [form, setForm] = useState<Form>({
    title: row ? titleOf(row) : "",
    date:
      tab === "Rezervacije"
        ? (row?.startsAt || "").slice(0, 16)
        : String(row?.dueDate || row?.date || ""),
    endDate: (row?.endsAt || "").slice(0, 16),
    amount: String(row?.cost ?? row?.amount ?? row?.price ?? 0),
    status: row?.status || statuses(tab)[0],
    notes: row?.notes || "",
    workshop: row?.workshop || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof Form, value: string) =>
    setForm((x) => ({ ...x, [k]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    let body: Record<string, unknown>;
    if (tab === "Servisi")
      body = {
        code: row?.code,
        vehicle: v.name,
        plate: v.plate,
        type: form.title,
        dueDate: form.date,
        mileage: Number(v.km.replace(/\D/g, "")),
        cost: Number(form.amount),
        workshop: form.workshop,
        status: form.status,
        notes: form.notes,
      };
    else if (tab === "Troškovi")
      body = {
        reference: row?.reference,
        description: `[${v.plate}] ${form.title}`,
        category: row?.category || "Troškovi vozila",
        kind: "Rashod",
        amount: Number(form.amount),
        date: form.date,
        location: row?.location || v.location,
        status: form.status,
        paymentMethod: row?.paymentMethod || "Drugo",
        notes: form.notes,
      };
    else if (tab === "Rezervacije")
      body = {
        code: row?.code,
        client: form.title,
        vehicle: v.name,
        startsAt: form.date,
        endsAt: form.endDate,
        location: row?.location || v.location,
        price: Number(form.amount),
        status: form.status,
      };
    else
      body = {
        code: row?.code,
        vehicle: v.name,
        plate: v.plate,
        description: form.title,
        date: form.date,
        cost: Number(form.amount),
        status: form.status,
        notes: form.notes,
      };
    try {
      const r = await fetch(cfg(tab).url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Zapis nije sačuvan.");
      saved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Zapis nije sačuvan.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerFrame className="add-vehicle" close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>
          {editing ? "DETALJI I IZMENA" : "NOVI ZAPIS"} • {tab.toUpperCase()}
        </small>
        <h2>{v.name}</h2>
        {row && <p className="drawer-intro">Referenca: {keyOf(row)}</p>}
        <form onSubmit={submit}>
          <label>
            {tab === "Rezervacije"
              ? "Klijent"
              : tab === "Servisi"
                ? "Tip servisa"
                : tab === "Štete"
                  ? "Opis štete"
                  : "Opis troška"}{" "}
            *
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </label>
          <div className="add-form-grid">
            <label>
              {tab === "Rezervacije" ? "Preuzimanje" : "Datum"} *
              <input
                required
                type={tab === "Rezervacije" ? "datetime-local" : "date"}
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </label>
            {tab === "Rezervacije" && (
              <label>
                Vraćanje *
                <input
                  required
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </label>
            )}
            <label>
              {tab === "Rezervacije" ? "Cena" : "Iznos / procena"} (RSD)
              <input
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {statuses(tab).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {tab === "Servisi" && (
              <label>
                Radionica
                <input
                  value={form.workshop}
                  onChange={(e) => set("workshop", e.target.value)}
                />
              </label>
            )}
          </div>
          {tab !== "Rezervacije" && (
            <label>
              Napomena
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </label>
          )}
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Otkaži
            </Button>
            <Button variant="primary" disabled={saving}>
              {saving ? "Čuvanje…" : editing ? "Sačuvaj izmene" : "Dodaj zapis"}
            </Button>
          </div>
        </form>
    </DrawerFrame>
  );
}
export default function VehicleOperationsCrud({
  tab,
  v,
}: {
  tab: string;
  v: Vehicle;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    const c = cfg(tab);
    setLoading(true);
    fetch(c.url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const all = (d[c.key] || []) as Row[];
        setRows(
          all.filter((x) =>
            tab === "Troškovi"
              ? x.description?.startsWith(`[${v.plate}]`)
              : tab === "Rezervacije"
                ? x.vehicle === v.name
                : x.plate === v.plate,
          ),
        );
        setError("");
      })
      .catch(() => setError("Zapisi trenutno nisu dostupni."))
      .finally(() => setLoading(false));
  }, [tab, v.name, v.plate]);
  useEffect(() => {
    load();
  }, [load]);
  const remove = async (row: Row) => {
    const key = keyOf(row);
    if (!confirm(`Da li sigurno želite trajno da obrišete zapis ${key}?`))
      return;
    const parameter = tab === "Troškovi" ? "reference" : "code";
    try {
      const r = await fetch(
        `${cfg(tab).url}?${parameter}=${encodeURIComponent(key)}`,
        { method: "DELETE" },
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Brisanje nije uspelo.");
      setRows((x) => x.filter((y) => keyOf(y) !== key));
      if (keyOf(selected || {}) === key) setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Brisanje nije uspelo.");
    }
  };
  return (
    <section className="panel vehicle-tab-panel">
      <div className="panel-head">
        <div>
          <h2>{tab}</h2>
          <p>
            {v.name} • {v.plate}
          </p>
        </div>
        <Button variant="outline" onClick={() => setAdding(true)}>
          <AddIcon className="button-icon" aria-hidden="true" />
          Dodaj zapis
        </Button>
      </div>
      {error && <div className="form-error">{error}</div>}
      {rows.map((row, i) => {
        const date =
          row.dueDate || row.date || row.startsAt?.slice(0, 10) || "";
        const amount = row.cost ?? row.amount ?? row.price ?? 0;
        return (
          <div
            className="vehicle-record vehicle-record-crud"
            key={keyOf(row) || i}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(row)}
            onKeyDown={onKeyboardAction(() => setSelected(row))}
          >
            <span>
              <DocumentIcon aria-hidden="true" />
            </span>
            <div>
              <strong>{titleOf(row)}</strong>
              <small>
                {date}
                {amount ? ` • ${amount.toLocaleString("sr-RS")} RSD` : ""}
                {row.status ? ` • ${row.status}` : ""}
              </small>
            </div>
            <Menu
              row={row}
              open={() => setSelected(row)}
              remove={() => void remove(row)}
            />
          </div>
        );
      })}
      {loading && <EmptyState>Učitavanje zapisa…</EmptyState>}
      {!loading && !rows.length && (
        <EmptyState>Nema zapisa u ovom odeljku.</EmptyState>
      )}
      {adding && (
        <Drawer
          tab={tab}
          v={v}
          row={null}
          close={() => setAdding(false)}
          saved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {selected && (
        <Drawer
          tab={tab}
          v={v}
          row={selected}
          close={() => setSelected(null)}
          saved={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </section>
  );
}
