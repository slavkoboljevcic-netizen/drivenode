"use client";
import { useCallback, useEffect, useState } from "react";
import "../styles/vehicle-operations-crud.css";
import { displayPlate, reservationBlocksVehicle } from "../lib";
import Button from "./Button";
import CustomDatePicker from "./CustomDatePicker";
import CustomInput from "./CustomInput";
import CustomSelect from "./CustomSelect";
import { AddIcon, CloseIcon, DocumentIcon, MoreIcon } from "./icons";
import ReservationEntitySearch from "./ReservationEntitySearch";
import { DrawerFrame, EmptyState, onKeyboardAction } from "./ui";
type Vehicle = { id: number; name: string; plate: string; km: string; location: string; registered?: boolean; archivedAt?: string | null };
type Client = { id: number; name: string; email: string; phone: string };

type Row = {
  id?: number;
  vehicleId?: number | null;
  clientId?: number | null;
  code?: string;
  reference?: string;
  type?: string;
  description?: string;
  reason?: string;
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
  clientId: string;
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
    : tab === "Blokade"
      ? { url: "/api/vehicle-blocks", key: "blocks" }
      : tab === "Troškovi"
        ? { url: "/api/transactions", key: "transactions" }
        : tab === "Rezervacije"
          ? { url: "/api/reservations", key: "reservations" }
          : { url: "/api/damages", key: "damages" };
const keyOf = (row: Row) => String(row.code || row.reference || row.id || "");
const titleOf = (row: Row) =>
  row.type ||
  row.reason ||
  row.client ||
  row.description?.replace(/^\[[^\]]+\]\s*/, "") ||
  row.code ||
  row.reference ||
  "Zapis";
const statuses = (tab: string) =>
  tab === "Servisi"
    ? ["Planirano", "Uskoro", "U toku", "Završeno", "Otkazano"]
    : tab === "Blokade"
      ? ["Aktivna", "Ukinuta"]
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
  canDelete = true,
}: {
  row: Row;
  open: () => void;
  remove: () => void;
  canDelete?: boolean;
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
          {canDelete && (
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
          )}
        </div>
      )}
    </div>
  );
}
function Drawer({
  tab,
  v,
  row,
  defaultStatus,
  close,
  saved,
}: {
  tab: string;
  v: Vehicle;
  row: Row | null;
  defaultStatus?: string;
  close: () => void;
  saved: () => void;
}) {
  const editing = Boolean(row);
  const [form, setForm] = useState<Form>({
    clientId: row?.clientId ? String(row.clientId) : "",
    title: row ? titleOf(row) : "",
    date:
      tab === "Rezervacije" || tab === "Blokade"
        ? (row?.startsAt || "").slice(0, 16)
        : String(row?.dueDate || row?.date || ""),
    endDate: (row?.endsAt || "").slice(0, 16),
    amount: String(row?.cost ?? row?.amount ?? row?.price ?? 0),
    status: row?.status || defaultStatus || statuses(tab)[0],
    notes: row?.notes || "",
    workshop: row?.workshop || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(tab === "Rezervacije");
  const [clientsError, setClientsError] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [vehicleAvailable, setVehicleAvailable] = useState<boolean | null>(null);
  const set = (k: keyof Form, value: string) =>
    setForm((x) => ({ ...x, [k]: value }));
  useEffect(() => {
    if (tab !== "Rezervacije") return;
    let active = true;
    const loadClients = async () => {
      setClientsLoading(true);
      setClientsError("");
      try {
        const [clientsResponse, deletionResponse] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/deletions?entity=clients"),
        ]);
        const [clientsData, deletionData] = await Promise.all([
          clientsResponse.json(),
          deletionResponse.json(),
        ]);
        if (!clientsResponse.ok || !deletionResponse.ok)
          throw new Error("Klijenti nisu učitani.");
        if (!active) return;
        const deletedEmails = new Set<string>(deletionData.deleted || []);
        setClients(
          ((clientsData.clients || []) as Client[]).filter(
            (client) =>
              Number.isInteger(client.id) && !deletedEmails.has(client.email),
          ),
        );
      } catch {
        if (active)
          setClientsError(
            "Klijenti trenutno nisu dostupni. Zatvorite prozor i pokušajte ponovo.",
          );
      } finally {
        if (active) setClientsLoading(false);
      }
    };
    void loadClients();
    return () => {
      active = false;
    };
  }, [tab]);
  useEffect(() => {
    if (tab !== "Rezervacije" || !reservationBlocksVehicle(form.status)) {
      setAvailabilityLoading(false);
      setAvailabilityError("");
      setVehicleAvailable(null);
      return;
    }
    const start = new Date(form.date);
    const end = new Date(form.endDate);
    if (
      !form.date ||
      !form.endDate ||
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    ) {
      setAvailabilityLoading(false);
      setAvailabilityError("");
      setVehicleAvailable(null);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({
      startsAt: form.date,
      endsAt: form.endDate,
    });
    if (row?.code) params.set("excludeReservationCode", row.code);
    setAvailabilityLoading(true);
    setAvailabilityError("");
    setVehicleAvailable(null);
    fetch(`/api/availability?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Dostupnost nije proverena.");
        return data;
      })
      .then((data) => {
        const result = (data.availability || []).find(
          (item: { vehicleId: number }) => item.vehicleId === v.id,
        ) as
          | {
              available: boolean;
              reasons?: { message: string }[];
            }
          | undefined;
        if (!result) throw new Error("Dostupnost vozila nije pronađena.");
        setVehicleAvailable(result.available);
        if (!result.available)
          setAvailabilityError(
            result.reasons?.map((reason) => reason.message).join(" ") ||
              "Vozilo nije dostupno u izabranom periodu.",
          );
      })
      .catch((requestError) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) return;
        setVehicleAvailable(false);
        setAvailabilityError(
          requestError instanceof Error
            ? requestError.message
            : "Dostupnost vozila trenutno nije moguće proveriti.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      });
    return () => controller.abort();
  }, [form.date, form.endDate, form.status, row?.code, tab, v.id]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (tab === "Rezervacije") {
      if (!Number.isInteger(Number(form.clientId)) || Number(form.clientId) < 1) {
        setError("Izaberite postojećeg klijenta iz sistema.");
        return;
      }
      const start = new Date(form.date);
      const end = new Date(form.endDate);
      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        end <= start
      ) {
        setError("Datum vraćanja mora biti posle datuma preuzimanja.");
        return;
      }
      if (
        reservationBlocksVehicle(form.status) &&
        (availabilityLoading || vehicleAvailable !== true)
      ) {
        setError(
          availabilityError ||
            "Sačekajte da sistem potvrdi dostupnost vozila.",
        );
        return;
      }
    }
    setSaving(true);
    let body: Record<string, unknown>;
    if (tab === "Servisi")
      body = {
        code: row?.code,
        vehicleId: v.id,
        vehicle: v.name,
        plate: v.plate,
        type: form.title,
        dueDate: form.date,
        endsAt: form.endDate,
        mileage: Number(v.km.replace(/\D/g, "")),
        cost: Number(form.amount),
        workshop: form.workshop,
        status: form.status,
        notes: form.notes,
      };
    else if (tab === "Blokade")
      body = {
        code: row?.code,
        vehicleId: v.id,
        reason: form.title,
        startsAt: form.date,
        endsAt: form.endDate,
        status: form.status,
      };
    else if (tab === "Troškovi")
      body = {
        reference: row?.reference,
        vehicleId: v.id,
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
        clientId: Number(form.clientId),
        vehicleId: v.id,
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
        vehicleId: v.id,
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
          {tab === "Rezervacije" ? (
            <div className="reservation-search-field">
              <label htmlFor={`vehicle-reservation-client-${v.id}`}>
                Klijent *
              </label>
              <ReservationEntitySearch
                disabled={clientsLoading || clients.length === 0}
                emptyMessage="Nema klijenta koji odgovara pretrazi."
                inputId={`vehicle-reservation-client-${v.id}`}
                loading={clientsLoading}
                loadingPlaceholder="Učitavanje klijenata…"
                noOptionsMessage="Nema unetih klijenata"
                onSelect={(clientId) => {
                  const client = clients.find(
                    (item) => item.id === Number(clientId),
                  );
                  setForm((current) => ({
                    ...current,
                    clientId,
                    title: client?.name || "",
                  }));
                }}
                options={clients.map((client) => ({
                  id: client.id,
                  label: client.name,
                  meta: `ID #${client.id}`,
                  searchText: `${client.name} ${client.email} ${client.phone}`,
                  selectedText: `${client.name} — ID #${client.id}`,
                  subtitle: `${client.email} • ${client.phone}`,
                }))}
                placeholder="Unesite ime, email ili broj telefona"
                value={form.clientId}
              />
            </div>
          ) : (
            <label>
              {tab === "Servisi"
                ? "Tip servisa"
                : tab === "Blokade"
                  ? "Razlog blokade"
                : tab === "Štete"
                  ? "Opis štete"
                  : "Opis troška"}{" "}
            *
            <CustomInput
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
            </label>
          )}
          <div className="add-form-grid">
            <label>
              {tab === "Rezervacije"
                ? "Preuzimanje"
                : tab === "Blokade"
                  ? "Početak blokade"
                  : tab === "Servisi"
                    ? "Početak servisa"
                    : "Datum"} *
              <CustomDatePicker
                required
                type={
                  tab === "Rezervacije" || tab === "Blokade"
                    ? "datetime-local"
                    : "date"
                }
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </label>
            {(tab === "Rezervacije" || tab === "Blokade" || tab === "Servisi") && (
              <label>
                {tab === "Rezervacije"
                  ? "Vraćanje"
                  : tab === "Blokade"
                    ? "Kraj blokade"
                    : "Završetak servisa"} *
                <CustomDatePicker
                  required
                  type={tab === "Servisi" ? "date" : "datetime-local"}
                  value={form.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </label>
            )}
            {tab !== "Blokade" && (
              <label>
                {tab === "Rezervacije" ? "Cena" : "Iznos / procena"} (RSD)
                <CustomInput
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                />
              </label>
            )}
            <label>
              Status
              <CustomSelect
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {statuses(tab).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </CustomSelect>
            </label>
            {tab === "Servisi" && (
              <label>
                Radionica
                <CustomInput
                  value={form.workshop}
                  onChange={(e) => set("workshop", e.target.value)}
                />
              </label>
            )}
          </div>
          {tab !== "Rezervacije" && tab !== "Blokade" && (
            <label>
              Napomena
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </label>
          )}
          {clientsError && <div className="form-error">{clientsError}</div>}
          {availabilityLoading && (
            <div className="drawer-intro">Proveravanje dostupnosti vozila…</div>
          )}
          {availabilityError && (
            <div className="form-error">{availabilityError}</div>
          )}
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Otkaži
            </Button>
            <Button
              variant="primary"
              disabled={
                saving ||
                (tab === "Rezervacije" &&
                  (clientsLoading ||
                    Boolean(clientsError) ||
                    (reservationBlocksVehicle(form.status) &&
                      (availabilityLoading || vehicleAvailable !== true))))
              }
            >
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
  onDataChanged,
  quickAdd = false,
  onQuickAddOpened,
}: {
  tab: string;
  v: Vehicle;
  onDataChanged?: () => void;
  quickAdd?: boolean;
  onQuickAddOpened?: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [adding, setAdding] = useState(false);
  const [addDefaultStatus, setAddDefaultStatus] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    const c = cfg(tab);
    setLoading(true);
    fetch(c.url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const all = (d[c.key] || []) as Row[];
        setRows(all.filter((x) => x.vehicleId === v.id));
        setError("");
      })
      .catch(() => setError("Zapisi trenutno nisu dostupni."))
      .finally(() => setLoading(false));
  }, [tab, v.id]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!quickAdd || tab !== "Servisi") return;
    setAddDefaultStatus("U toku");
    setAdding(true);
    onQuickAddOpened?.();
  }, [onQuickAddOpened, quickAdd, tab]);
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
      onDataChanged?.();
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
            {v.name} • {displayPlate(v.plate, v.registered)}
          </p>
        </div>
        {(tab !== "Blokade" || !v.archivedAt) && (
          <Button
            variant="outline"
            onClick={() => {
              setAddDefaultStatus(undefined);
              setAdding(true);
            }}
          >
            <AddIcon className="button-icon" aria-hidden="true" />
            Dodaj zapis
          </Button>
        )}
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
              canDelete={tab !== "Blokade"}
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
          defaultStatus={addDefaultStatus}
          close={() => {
            setAdding(false);
            setAddDefaultStatus(undefined);
          }}
          saved={() => {
            setAdding(false);
            setAddDefaultStatus(undefined);
            load();
            onDataChanged?.();
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
            onDataChanged?.();
          }}
        />
      )}
    </section>
  );
}
