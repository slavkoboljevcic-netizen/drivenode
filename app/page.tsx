"use client";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import "./styles/calendar.css";
import "./styles/clients.css";
import "./styles/services.css";
import "./styles/finance.css";
import "./styles/documents.css";
import "./styles/reports.css";
import "./styles/users.css";
import "./styles/row-menu.css";
import "./styles/drawer-animations.css";
import "./styles/brand-logo.css";
import BookingCalendar from "./components/BookingCalendar";
import DashboardLive from "./components/DashboardLive";
import GlobalSearch from "./components/GlobalSearch";
import VehicleOperationsCrud from "./components/VehicleOperationsCrud";
import Button from "./components/Button";
import CustomDatePicker from "./components/CustomDatePicker";
import CustomInput from "./components/CustomInput";
import CustomSelect from "./components/CustomSelect";
import {
  DrawerFrame,
  EmptyState,
  KpiCard,
  PageHeader,
  onKeyboardAction,
} from "./components/ui";
import {
  AddIcon,
  ArrowRightIcon,
  BackIcon,
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  ClientsIcon,
  DocumentIcon,
  DownloadIcon,
  FilterIcon,
  MoreIcon,
  NavigationIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  VehicleIcon,
} from "./components/icons";
type V = {
  name: string;
  plate: string;
  year: number;
  km: string;
  location: string;
  status: string;
  service: string;
  vin: string;
  fuel: string;
  transmission: string;
  registered: boolean;
};
const displayPlate = (plate: string, registered?: boolean) =>
  registered === false || plate.startsWith("DNFM-NEREG-")
    ? "Nema tablica"
    : plate;
type B = {
  id: string;
  client: string;
  vehicle: string;
  from: string;
  to: string;
  price: string;
  status: string;
};
type C = {
  id?: number;
  name: string;
  email: string;
  city: string;
  phone: string;
  reservations: number;
  value: number;
  status: string;
  notes: string;
};
type S = {
  id?: number;
  code: string;
  vehicle: string;
  plate: string;
  type: string;
  dueDate: string;
  mileage: number;
  cost: number;
  workshop: string;
  status: string;
  notes: string;
};
type F = {
  id?: number;
  reference: string;
  description: string;
  category: string;
  kind: string;
  amount: number;
  date: string;
  location: string;
  status: string;
  paymentMethod: string;
  notes: string;
};
type D = {
  id?: number;
  name: string;
  folder: string;
  linkedTo: string;
  uploadedBy: string;
  mimeType: string;
  size: number;
  storageKey: string;
  expiresAt?: string | null;
  createdAt: string;
};
type U = {
  id?: number;
  name: string;
  email: string;
  role: string;
  branch: string;
  status: string;
  permissions: string | Array<string>;
  lastActive: string;
};
const nav = [
  "Pregled",
  "Vozila",
  "Rezervacije",
  "Kalendar",
  "Klijenti",
  "Servisi i registracije",
  "Finansije",
  "Dokumentacija",
  "Izveštaji",
  "Korisnici i dozvole",
];
const routeByPage: Record<string, string> = {
  Pregled: "/dashboard",
  Vozila: "/vehicles",
  Rezervacije: "/reservations",
  Kalendar: "/calendar",
  Klijenti: "/clients",
  "Servisi i registracije": "/services",
  Finansije: "/finance",
  Dokumentacija: "/documents",
  Izveštaji: "/reports",
  "Korisnici i dozvole": "/users",
  Podešavanja: "/settings",
};
const pageFromPath = (path: string) =>
  path.startsWith("/vehicles")
    ? "Vozila"
    : path.startsWith("/reservations")
      ? "Rezervacije"
      : path.startsWith("/calendar")
        ? "Kalendar"
        : path.startsWith("/clients")
          ? "Klijenti"
          : path.startsWith("/services")
            ? "Servisi i registracije"
            : path.startsWith("/finance")
              ? "Finansije"
              : path.startsWith("/documents")
                ? "Dokumentacija"
                : path.startsWith("/reports")
                  ? "Izveštaji"
                  : path.startsWith("/users")
                    ? "Korisnici i dozvole"
                    : path.startsWith("/settings")
                      ? "Podešavanja"
                      : "Pregled";
const vehicles: V[] = [];
const bookings: B[] = [];
const defaultCurrentUser = {
  initials: "AD",
  name: "Administrator",
  role: "Administrator",
};
const tone = (s = "") =>
  s.includes("Dostupno") || s.includes("Plaćeno") || s.includes("Aktivan")
    ? "green"
    : s.includes("Iznajmljeno") || s.includes("Aktivna") || s.includes("U toku")
      ? "blue"
      : s.includes("Povrat") || s.includes("servisu") || s.includes("Uskoro")
        ? "red"
        : s.includes("Potvr") || s.includes("Rezervisano")
          ? "violet"
          : "amber";
function Badge({ s }: { s?: string }) {
  return (
    <span className={`badge ${tone(s)}`}>
      <i />
      {s || "Nije određeno"}
    </span>
  );
}
const safePermissions = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((x) => typeof x === "string");
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
};
const formatSerbianPhone = (value: string) => {
  let digits = value.replace(/\D/g, "").slice(0, 12);
  const international =
    value.trim().startsWith("+") || digits.startsWith("381");
  if (international) {
    if (digits.startsWith("381")) digits = digits.slice(3);
    else if (digits.startsWith("0")) digits = digits.slice(1);
    digits = digits.slice(0, 9);
    return (
      "+381" +
      (digits ? " " + digits.slice(0, 2) : "") +
      (digits.length > 2 ? " " + digits.slice(2, 5) : "") +
      (digits.length > 5 ? " " + digits.slice(5, 9) : "")
    );
  }
  digits = digits.slice(0, 10);
  return (
    digits.slice(0, 3) +
    (digits.length > 3 ? " " + digits.slice(3, 6) : "") +
    (digits.length > 6 ? " " + digits.slice(6, 10) : "")
  );
};
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DNFM UI error", error, info.componentStack);
  }
  render() {
    if (this.state.failed)
      return (
        <div className="login">
          <section className="login-form">
            <div>
              <div className="login-logo">
                <span className="brand-mark">D</span>
              </div>
              <h2>Aplikacija je spremna za nastavak</h2>
              <p>
                Došlo je do privremene greške u prikazu. Vaši podaci su
                sačuvani.
              </p>
              <Button
                variant="primary"
                className="login-button"
                onClick={() => location.reload()}
              >
                Ponovo učitaj aplikaciju
              </Button>
            </div>
          </section>
        </div>
      );
    return this.props.children;
  }
}
function useSoftDelete(entity: string) {
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch(`/api/deletions?entity=${entity}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setDeleted(new Set(d.deleted || [])))
      .catch(() => {});
  }, [entity]);
  const remove = async (key: string, label: string) => {
    if (!confirm(`Da li sigurno želite da obrišete ${label}?`)) return false;
    const r = await fetch("/api/deletions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, key }),
    });
    if (r.ok) {
      setDeleted((x) => new Set([...x, key]));
      return true;
    }
    alert("Brisanje nije uspelo. Pokušajte ponovo.");
    return false;
  };
  return { deleted, remove };
}
function RowMenu({
  label,
  onOpen,
  onDelete,
}: {
  label: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="row-menu">
      <Button
        className="row-action"
        onClick={(e) => {
          e.stopPropagation();
          setShow((x) => !x);
        }}
        aria-label={`Opcije za ${label}`}
      >
        <MoreIcon aria-hidden="true" />
      </Button>
      {show && (
        <div className="row-menu-pop">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setShow(false);
              onOpen();
            }}
          >
            Otvori detalje
          </Button>
          <Button
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              setShow(false);
              onDelete();
            }}
          >
            Obriši
          </Button>
        </div>
      )}
    </div>
  );
}
function Head({
  title,
  sub,
  action,
  onAction,
}: {
  title: string;
  sub: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <PageHeader title={title} subtitle={sub} action={action} onAction={onAction} />
  );
}
function Kpis({
  items,
  actions,
}: {
  items: string[][];
  actions?: Array<() => void>;
}) {
  return (
    <div className="kpi-grid">
      {items.map((x, i) => (
        <KpiCard
          key={x[0]}
          label={x[0]}
          value={x[1]}
          description={x[2]}
          metric={x[3]}
          tone={x[4]}
          onClick={actions?.[i]}
        />
      ))}
    </div>
  );
}
function Vehicles({
  open,
  addTrigger = 0,
}: {
  open: (v: V) => void;
  addTrigger?: number;
}) {
  const [q, setQ] = useState("");
  const { deleted } = useSoftDelete("vehicles");
  const [status, setStatus] = useState("Svi statusi");
  const [location, setLocation] = useState("Sve lokacije");
  const [more, setMore] = useState(false);
  const [sortNew, setSortNew] = useState(false);
  const [added, setAdded] = useState<V[]>([]);
  const [showAdd, setShowAdd] = useState(addTrigger > 0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) =>
        setAdded(
          (data.vehicles || []).map((v: V & { km: number }) => ({
            ...v,
            km: `${Number(v.km).toLocaleString("sr-RS")} km`,
          })),
        ),
      )
      .catch(() => setAdded([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (addTrigger > 0) setShowAdd(true);
  }, [addTrigger]);
  const all = [...added, ...vehicles]
    .filter((v) => !deleted.has(v.plate))
    .filter((v, i, a) => a.findIndex((x) => x.plate === v.plate) === i);
  const shown = all
    .filter(
      (v) =>
        (v.name + v.plate + v.location)
          .toLowerCase()
          .includes(q.toLowerCase()) &&
        (status === "Svi statusi" || v.status === status) &&
        (location === "Sve lokacije" || v.location.startsWith(location)),
    )
    .sort((a, b) => (sortNew ? b.year - a.year : 0));
  const setKpi = (s: string) => {
    setStatus(s);
    setSortNew(false);
  };
  const avgAge = all.length
    ? Math.round(
        all.reduce((sum, v) => sum + (new Date().getFullYear() - v.year), 0) /
          all.length,
      )
    : 0;
  const vehicleKpis = [
    [
      "Ukupno vozila",
      String(all.length),
      "evidentirano u bazi",
      "uživo",
      "blue",
    ],
    [
      "Dostupno",
      String(all.filter((v) => v.status === "Dostupno").length),
      "spremno za najam",
      "uživo",
      "green",
    ],
    [
      "Iznajmljeno",
      String(all.filter((v) => v.status === "Iznajmljeno").length),
      "aktivno na putu",
      "uživo",
      "violet",
    ],
    [
      "Na servisu",
      String(all.filter((v) => v.status === "Na servisu").length),
      "trenutno nedostupno",
      "uživo",
      "red",
    ],
    [
      "Prosečna starost",
      all.length ? avgAge + " god." : "—",
      "iz stvarnih godišta",
      "uživo",
      "cyan",
    ],
    [
      "Lokacije",
      String(new Set(all.map((v) => v.location.split(" • ")[0])).size),
      "aktivne poslovnice",
      "uživo",
      "amber",
    ],
  ];
  const deleteVehicle = async (vehicle: V) => {
    if (
      !confirm(
        "Da li sigurno želite trajno da obrišete vozilo " + vehicle.name + "?",
      )
    )
      return;
    try {
      const response = await fetch(
        "/api/vehicles?plate=" + encodeURIComponent(vehicle.plate),
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Vozilo nije obrisano.");
      setAdded((current) =>
        current.filter((item) => item.plate !== vehicle.plate),
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Vozilo nije obrisano.");
    }
  };
  return (
    <>
      <Head
        title="Vozila"
        sub="Pregled i upravljanje kompletnom flotom."
        action="Dodaj vozilo"
        onAction={() => setShowAdd(true)}
      />
      <Kpis
        items={vehicleKpis}
        actions={[
          () => setKpi("Svi statusi"),
          () => setKpi("Dostupno"),
          () => setKpi("Iznajmljeno"),
          () => setKpi("Na servisu"),
          () => {
            setStatus("Svi statusi");
            setSortNew(true);
          },
          () => setKpi("Svi statusi"),
        ]}
      />
      <section className="panel table-panel">
        <div className="toolbar">
          <div className="table-search">
            <SearchIcon aria-hidden="true" />
            <CustomInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Marka, model, tablice ili lokacija..."
            />
          </div>
          <CustomSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Svi statusi</option>
            <option>Dostupno</option>
            <option>Iznajmljeno</option>
            <option>Rezervisano</option>
            <option>Na servisu</option>
          </CustomSelect>
          <Button
            className={more ? "filter-active" : ""}
            onClick={() => setMore((x) => !x)}
          >
            <FilterIcon className="button-icon" aria-hidden="true" />
            Više filtera
          </Button>
        </div>
        {more && (
          <div className="advanced-filters">
            <label>
              Lokacija
              <CustomSelect
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option>Sve lokacije</option>
                <option>Beograd</option>
                <option>Novi Sad</option>
                <option>Niš</option>
              </CustomSelect>
            </label>
            <label>
              <CustomInput
                type="checkbox"
                checked={sortNew}
                onChange={(e) => setSortNew(e.target.checked)}
              />{" "}
              Najnovija vozila prvo
            </label>
            <Button
              onClick={() => {
                setQ("");
                setStatus("Svi statusi");
                setLocation("Sve lokacije");
                setSortNew(false);
              }}
            >
              Očisti filtere
            </Button>
          </div>
        )}
        <div className="active-filter-note">
          Prikazano {shown.length} od {all.length} vozila
          {status !== "Svi statusi" ? ` • ${status}` : ""}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>VOZILO</th>
                <th>STATUS</th>
                <th>KILOMETRAŽA</th>
                <th>LOKACIJA</th>
                <th>SLEDEĆI SERVIS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => (
                <tr key={v.plate} onClick={() => open(v)}>
                  <td>
                    <div className="vehicle-cell">
                      <span className="car-thumb">
                        <VehicleIcon aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{v.name}</strong>
                        <small>
                          {v.year} • {displayPlate(v.plate, v.registered)}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge s={v.status} />
                  </td>
                  <td>{v.km}</td>
                  <td>{v.location}</td>
                  <td>{v.service}</td>
                  <td>
                    <RowMenu
                      label={v.name}
                      onOpen={() => open(v)}
                      onDelete={() => {
                        void deleteVehicle(v);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !shown.length && (
            <EmptyState>
              Nema vozila koja odgovaraju izabranim filterima.
            </EmptyState>
          )}
          {loading && (
            <div className="vehicle-loading">Učitavanje sačuvanih vozila…</div>
          )}
        </div>
      </section>
      {showAdd && (
        <AddVehicleModal
          existing={all}
          close={() => setShowAdd(false)}
          added={(v) => {
            setAdded((x) => [v, ...x]);
            setShowAdd(false);
          }}
        />
      )}
    </>
  );
}
function AddVehicleModal({
  existing,
  close,
  added,
}: {
  existing: V[];
  close: () => void;
  added: (v: V) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    plate: "",
    year: "2026",
    km: "0",
    location: "Beograd • Aerodrom",
    status: "Dostupno",
    service: "Nije zakazano",
    vin: "",
    fuel: "",
    transmission: "",
    registered: true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const plate = form.plate.trim();
    if (form.registered && !plate) {
      setError("Unesite registarsku oznaku. Prihvaćeni su svi formati tablica.");
      return;
    }
    if (
      plate &&
      existing.some(
        (v) =>
          v.plate.trim().toLocaleLowerCase("sr") ===
          plate.toLocaleLowerCase("sr"),
      )
    ) {
      setError("Vozilo sa ovim registarskim tablicama već postoji.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          plate,
          year: Number(form.year),
          km: Number(form.km),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Vozilo nije sačuvano.");
      added({
        ...data.vehicle,
        km: `${Number(data.vehicle.km).toLocaleString("sr-RS")} km`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vozilo nije sačuvano.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerFrame className="add-vehicle" close={close}>
        <Button className="drawer-close" onClick={close} aria-label="Zatvori">
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>NOVO VOZILO</small>
        <h2>Dodaj vozilo u flotu</h2>
        <p className="drawer-intro">
          Unesite osnovne podatke. Vozilo će odmah biti sačuvano i prikazano u
          tabeli.
        </p>
        <form onSubmit={submit}>
          <label>
            Marka i model *
            <CustomInput
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="npr. Volkswagen Passat"
            />
          </label>
          <div className="add-form-grid">
            <label>
              {form.registered
                ? "Registarske tablice *"
                : "Registarske tablice (opciono)"}
              <CustomInput
                required={form.registered}
                type="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                value={form.plate}
                onChange={(e) => set("plate", e.target.value)}
                placeholder={
                  form.registered
                    ? "Domaće, strane, probne ili druge tablice"
                    : "Ostavite prazno ako vozilo nema tablice"
                }
              />
            </label>
            <label>
              Godište *
              <CustomInput
                required
                type="number"
                min="1990"
                max="2027"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
              />
            </label>
            <label>
              Kilometraža *
              <CustomInput
                required
                type="number"
                min="0"
                value={form.km}
                onChange={(e) => set("km", e.target.value)}
              />
            </label>
            <label>
              Lokacija *
              <CustomSelect
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              >
                <option>Beograd • Aerodrom</option>
                <option>Beograd • Novi Beograd</option>
                <option>Beograd • Dorćol</option>
                <option>Novi Sad • Centar</option>
                <option>Novi Sad • Stanica</option>
                <option>Niš • Aerodrom</option>
              </CustomSelect>
            </label>
            <label>
              Status *
              <CustomSelect
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Dostupno</option>
                <option>Rezervisano</option>
                <option>Iznajmljeno</option>
                <option>Na servisu</option>
              </CustomSelect>
            </label>
            <label>
              Registracioni status
              <CustomSelect
                value={form.registered ? "Registrovano" : "Nije registrovano"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    registered: e.target.value === "Registrovano",
                  }))
                }
              >
                <option>Registrovano</option>
                <option>Nije registrovano</option>
              </CustomSelect>
            </label>
            <label>
              VIN
              <CustomInput
                maxLength={17}
                value={form.vin}
                onChange={(e) => set("vin", e.target.value.toUpperCase())}
                placeholder="Broj šasije"
              />
            </label>
            <label>
              Gorivo
              <CustomSelect
                value={form.fuel}
                onChange={(e) => set("fuel", e.target.value)}
              >
                <option value="">Izaberite</option>
                <option>Benzin</option>
                <option>Dizel</option>
                <option>Hibrid</option>
                <option>Električno</option>
                <option>TNG</option>
              </CustomSelect>
            </label>
            <label>
              Menjač
              <CustomSelect
                value={form.transmission}
                onChange={(e) => set("transmission", e.target.value)}
              >
                <option value="">Izaberite</option>
                <option>Manuelni</option>
                <option>Automatski</option>
              </CustomSelect>
            </label>
            <label>
              Sledeći servis
              <CustomInput
                value={form.service}
                onChange={(e) => set("service", e.target.value)}
                placeholder="npr. 12. okt 2026"
              />
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Otkaži
            </Button>
            <Button variant="primary" disabled={saving}>
              {saving ? "Čuvanje…" : "Dodaj vozilo"}
            </Button>
          </div>
        </form>
    </DrawerFrame>
  );
}
function VehicleDetail({ v, back }: { v: V; back: () => void }) {
  const [current, setCurrent] = useState(v);
  const [tab, setTab] = useState("Pregled");
  const [edit, setEdit] = useState(false);
  const tabs = [
    "Pregled",
    "Dokumentacija",
    "Servisi",
    "Troškovi",
    "Rezervacije",
    "Štete",
  ];
  return (
    <>
      <Button className="back" onClick={back}>
        <BackIcon className="button-icon" aria-hidden="true" />
        Sva vozila
      </Button>
      <div className="detail-head">
        <div className="big-car">
          <VehicleIcon aria-hidden="true" />
        </div>
        <div>
          <Badge s={current.status} />
          <h1>{current.name}</h1>
          <p>
            {current.year} • {displayPlate(current.plate, current.registered)}
          </p>
        </div>
        <Button variant="outline" onClick={() => setEdit(true)}>
          Uredi vozilo
        </Button>
      </div>
      <div className="detail-tabs">
        {tabs.map((x) => (
          <Button
            key={x}
            className={tab === x ? "active" : ""}
            onClick={() => setTab(x)}
          >
            {x}
          </Button>
        ))}
      </div>
      {tab === "Pregled" ? (
        <div className="detail-grid">
          <section className="panel info-card">
            <h2>Osnovni podaci</h2>
            {[
              [
                "Registarske tablice",
                displayPlate(current.plate, current.registered),
              ],
              [
                "Status registracije",
                current.registered === false ? "Nije registrovano" : "Registrovano",
              ],
              ["VIN", current.vin || "Nije unet"],
              ["Kilometraža", current.km],
              ["Gorivo", current.fuel || "Nije uneto"],
              ["Menjač", current.transmission || "Nije uneto"],
              ["Lokacija", current.location],
            ].map((x) => (
              <div key={x[0]}>
                <small>{x[0]}</small>
                <b>{x[1]}</b>
              </div>
            ))}
          </section>
          <section className="panel health">
            <h2>Status vozila</h2>
            <div className="fuel">
              <span>Gorivo</span>
              <b>0%</b>
              <i>
                <em style={{ width: "0%" }} />
              </i>
            </div>
            <div className="health-stats">
              <div>
                <small>Poslednji servis</small>
                <b>Nema podataka</b>
              </div>
              <div>
                <small>Sledeći servis</small>
                <b>{current.service}</b>
              </div>
              <div>
                <small>Registracija važi do</small>
                <b>Nema podataka</b>
              </div>
            </div>
          </section>
          <section className="panel timeline">
            <h2>Poslednje aktivnosti</h2>
            {([] as string[][]).map((x) => (
              <div key={x[0]}>
                <i />
                <small>{x[0]}</small>
                <strong>{x[1]}</strong>
                <p>{x[2]}</p>
              </div>
            ))}
          </section>
        </div>
      ) : (
        <VehicleTab tab={tab} v={current} />
      )}{" "}
      {edit && (
        <EditVehicleModal
          vehicle={current}
          close={() => setEdit(false)}
          saved={(x) => {
            setCurrent(x);
            setEdit(false);
          }}
        />
      )}
    </>
  );
}
function VehicleDocuments({ v }: { v: V }) {
  const [docs, setDocs] = useState<D[]>([]);
  const [upload, setUpload] = useState(false);
  const [selected, setSelected] = useState<D | null>(null);
  useEffect(() => {
    fetch("/api/documents")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) =>
        setDocs((d.documents || []).filter((x: D) => x.linkedTo === v.plate)),
      )
      .catch(() => {});
  }, [v.plate]);
  return (
    <section className="panel vehicle-tab-panel">
      <div className="panel-head">
        <div>
          <h2>Dokumentacija</h2>
          <p>
            {v.name} • {displayPlate(v.plate, v.registered)}
          </p>
        </div>
        <Button variant="outline" onClick={() => setUpload(true)}>
          <AddIcon className="button-icon" aria-hidden="true" />
          Dodaj dokument
        </Button>
      </div>
      {docs.map((d) => (
        <Button
          className="vehicle-record"
          key={d.storageKey}
          onClick={() => setSelected(d)}
        >
          <span>
            <DocumentIcon aria-hidden="true" />
          </span>
          <div>
            <strong>{d.name}</strong>
            <small>
              {d.folder}
              {d.expiresAt
                ? ` • važi do ${new Date(`${d.expiresAt}T12:00`).toLocaleDateString("sr-Latn-RS")}`
                : ""}
            </small>
          </div>
          <i>
            <ChevronRightIcon aria-hidden="true" />
          </i>
        </Button>
      ))}
      {!docs.length && (
        <EmptyState>
          Za ovo vozilo nema dodatih dokumenata.
        </EmptyState>
      )}
      {upload && (
        <DocumentUpload
          close={() => setUpload(false)}
          saved={(d) => {
            setDocs((x) => [d, ...x]);
            setUpload(false);
          }}
          defaultFolder="Vozila"
          defaultLinkedTo={v.plate}
        />
      )}{" "}
      {selected && (
        <DocumentPanel
          doc={selected}
          close={() => setSelected(null)}
          changed={(d) => {
            setDocs((x) => [d, ...x.filter((y) => y.id !== d.id)]);
            setSelected(d);
          }}
          deleted={(d) => {
            setDocs((x) => x.filter((y) => y.id !== d.id));
            setSelected(null);
          }}
        />
      )}
    </section>
  );
}
function VehicleTab({ tab, v }: { tab: string; v: V }) {
  if (tab === "Dokumentacija") return <VehicleDocuments v={v} />;
  return <VehicleOperationsCrud tab={tab} v={v} />;
}
function EditVehicleModal({
  vehicle,
  close,
  saved,
}: {
  vehicle: V;
  close: () => void;
  saved: (v: V) => void;
}) {
  const [form, setForm] = useState({
    ...vehicle,
    registered: vehicle.registered !== false,
    plate: vehicle.registered === false ? "" : vehicle.plate,
    km: vehicle.km.replace(/[^0-9]/g, ""),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: string, value: string) =>
    setForm((f) => ({ ...f, [k]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const plate = form.plate.trim();
    if (form.registered && !plate) {
      setError("Unesite registarsku oznaku. Prihvaćeni su svi formati tablica.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/vehicles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          plate,
          originalPlate: vehicle.plate,
          year: Number(form.year),
          km: Number(form.km),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Vozilo nije izmenjeno.");
      saved({
        ...data.vehicle,
        km: `${Number(data.vehicle.km).toLocaleString("sr-RS")} km`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vozilo nije izmenjeno.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerFrame className="add-vehicle" close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>UREĐIVANJE VOZILA</small>
        <h2>{vehicle.name}</h2>
        <form onSubmit={submit}>
          <label>
            Marka i model
            <CustomInput
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
          <div className="add-form-grid">
            <label>
              {form.registered
                ? "Registarske tablice *"
                : "Registarske tablice (opciono)"}
              <CustomInput
                required={form.registered}
                type="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                value={form.plate}
                onChange={(e) => set("plate", e.target.value)}
                placeholder={
                  form.registered
                    ? "Domaće, strane, probne ili druge tablice"
                    : "Ostavite prazno ako vozilo nema tablice"
                }
              />
            </label>
            <label>
              Godište
              <CustomInput
                required
                type="number"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
              />
            </label>
            <label>
              Kilometraža
              <CustomInput
                required
                type="number"
                value={form.km}
                onChange={(e) => set("km", e.target.value)}
              />
            </label>
            <label>
              Lokacija
              <CustomSelect
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              >
                <option>Beograd • Aerodrom</option>
                <option>Beograd • Novi Beograd</option>
                <option>Beograd • Dorćol</option>
                <option>Novi Sad • Centar</option>
                <option>Niš • Aerodrom</option>
              </CustomSelect>
            </label>
            <label>
              Status
              <CustomSelect
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Dostupno</option>
                <option>Iznajmljeno</option>
                <option>Rezervisano</option>
                <option>Na servisu</option>
              </CustomSelect>
            </label>
            <label>
              Registracioni status
              <CustomSelect
                value={form.registered ? "Registrovano" : "Nije registrovano"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    registered: e.target.value === "Registrovano",
                  }))
                }
              >
                <option>Registrovano</option>
                <option>Nije registrovano</option>
              </CustomSelect>
            </label>
            <label>
              VIN
              <CustomInput
                maxLength={17}
                value={form.vin || ""}
                onChange={(e) => set("vin", e.target.value.toUpperCase())}
              />
            </label>
            <label>
              Gorivo
              <CustomSelect
                value={form.fuel || ""}
                onChange={(e) => set("fuel", e.target.value)}
              >
                <option value="">Izaberite</option>
                <option>Benzin</option>
                <option>Dizel</option>
                <option>Hibrid</option>
                <option>Električno</option>
                <option>TNG</option>
              </CustomSelect>
            </label>
            <label>
              Menjač
              <CustomSelect
                value={form.transmission || ""}
                onChange={(e) => set("transmission", e.target.value)}
              >
                <option value="">Izaberite</option>
                <option>Manuelni</option>
                <option>Automatski</option>
              </CustomSelect>
            </label>
            <label>
              Sledeći servis
              <CustomInput
                value={form.service}
                onChange={(e) => set("service", e.target.value)}
              />
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Otkaži
            </Button>
            <Button variant="primary" disabled={saving}>
              {saving ? "Čuvanje…" : "Sačuvaj izmene"}
            </Button>
          </div>
        </form>
    </DrawerFrame>
  );
}
function Reservations({
  open,
  newReservation,
  refresh,
  overrides,
  onDeleted,
}: {
  open: (b: B) => void;
  newReservation: () => void;
  refresh: number;
  overrides: Record<string, string>;
  onDeleted: () => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Svi statusi");
  const [vehicle, setVehicle] = useState("Sva vozila");
  const [more, setMore] = useState(false);
  const [sortValue, setSortValue] = useState(false);
  const [added, setAdded] = useState<B[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch("/api/reservations")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) =>
        setAdded(
          (data.reservations || []).map(
            (r: {
              code: string;
              client: string;
              vehicle: string;
              startsAt: string;
              endsAt: string;
              price: number;
              status: string;
            }) => ({
              id: r.code,
              client: r.client,
              vehicle: r.vehicle,
              from: formatDate(r.startsAt),
              to: formatDate(r.endsAt),
              price: `${Number(r.price).toLocaleString("sr-RS")} RSD`,
              status: r.status,
            }),
          ),
        ),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);
  const all = [...added, ...bookings]
    .filter((b, i, a) => a.findIndex((x) => x.id === b.id) === i)
    .map((b) => ({ ...b, status: overrides[b.id] || b.status }));
  const shown = all
    .filter(
      (b) =>
        (b.client + b.vehicle + b.id).toLowerCase().includes(q.toLowerCase()) &&
        (status === "Svi statusi" || b.status === status) &&
        (vehicle === "Sva vozila" || b.vehicle === vehicle),
    )
    .sort((a, b) =>
      sortValue
        ? Number(b.price.replace(/\D/g, "")) -
          Number(a.price.replace(/\D/g, ""))
        : 0,
    );
  const setKpi = (s: string) => {
    setStatus(s);
    setSortValue(false);
  };
  const clear = () => {
    setQ("");
    setStatus("Svi statusi");
    setVehicle("Sva vozila");
    setSortValue(false);
  };
  const deleteReservation = async (booking: B) => {
    if (!confirm(`Da li sigurno želite trajno da obrišete rezervaciju ${booking.id}?`))
      return;
    try {
      const response = await fetch(
        `/api/reservations?code=${encodeURIComponent(booking.id)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Rezervacija nije obrisana.");
      setAdded((current) => current.filter((item) => item.id !== booking.id));
      onDeleted();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Rezervacija nije obrisana.",
      );
    }
  };
  const totalValue = all.reduce(
    (sum, b) => sum + Number(b.price.replace(/\D/g, "")),
    0,
  );
  const reservationKpis = [
    ["Ukupno", String(all.length), "rezervacija u bazi", "uživo", "blue"],
    [
      "Aktivne",
      String(all.filter((b) => b.status === "Aktivna").length),
      "najmova u toku",
      "uživo",
      "green",
    ],
    [
      "Potvrđene",
      String(all.filter((b) => b.status === "Potvrđena").length),
      "predstojeći najmovi",
      "uživo",
      "violet",
    ],
    [
      "Povrat danas",
      String(all.filter((b) => b.status === "Povrat danas").length),
      "zakazana povratka",
      "uživo",
      "red",
    ],
    [
      "Na čekanju",
      String(all.filter((b) => b.status === "Na čekanju").length),
      "zahteva za obradu",
      "uživo",
      "amber",
    ],
    [
      "Vrednost",
      totalValue.toLocaleString("sr-RS") + " RSD",
      "svih rezervacija",
      "uživo",
      "cyan",
    ],
  ];
  return (
    <>
      <Head
        title="Rezervacije"
        sub="Sve rezervacije, preuzimanja i povrati na jednom mestu."
        action="Nova rezervacija"
        onAction={newReservation}
      />
      <Kpis
        items={reservationKpis}
        actions={[
          () => setKpi("Svi statusi"),
          () => setKpi("Aktivna"),
          () => setKpi("Potvrđena"),
          () => setKpi("Povrat danas"),
          () => setKpi("Na čekanju"),
          () => {
            setStatus("Svi statusi");
            setSortValue(true);
          },
        ]}
      />
      <section className="panel table-panel">
        <div className="toolbar">
          <div className="table-search">
            <SearchIcon aria-hidden="true" />
            <CustomInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Broj rezervacije, klijent ili vozilo..."
            />
          </div>
          <CustomSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Svi statusi</option>
            <option>Na čekanju</option>
            <option>Potvrđena</option>
            <option>Aktivna</option>
            <option>Povrat danas</option>
            <option>Završena</option>
            <option>Otkazana</option>
          </CustomSelect>
          <Button
            className={more ? "filter-active" : ""}
            onClick={() => setMore((x) => !x)}
          >
            <FilterIcon className="button-icon" aria-hidden="true" />
            Više filtera
          </Button>
        </div>
        {more && (
          <div className="advanced-filters">
            <label>
              Vozilo
              <CustomSelect
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              >
                <option>Sva vozila</option>
                {[...new Set(all.map((b) => b.vehicle))].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </CustomSelect>
            </label>
            <label>
              <CustomInput
                type="checkbox"
                checked={sortValue}
                onChange={(e) => setSortValue(e.target.checked)}
              />{" "}
              Najveća vrednost prvo
            </label>
            <Button onClick={clear}>Očisti filtere</Button>
          </div>
        )}
        <div className="active-filter-note">
          Prikazano {shown.length} od {all.length} rezervacija
          {status !== "Svi statusi" ? ` • ${status}` : ""}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>REZERVACIJA</th>
                <th>KLIJENT</th>
                <th>VOZILO</th>
                <th>PERIOD</th>
                <th>CENA</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id} onClick={() => open(b)}>
                  <td>
                    <strong className="link">{b.id}</strong>
                  </td>
                  <td>{b.client}</td>
                  <td>{b.vehicle}</td>
                  <td>
                    <strong>{b.from}</strong>
                    <small>do {b.to}</small>
                  </td>
                  <td>
                    <strong>{b.price}</strong>
                    <small>Plaćeno karticom</small>
                  </td>
                  <td>
                    <Badge s={b.status} />
                  </td>
                  <td>
                    <RowMenu
                      label={b.id}
                      onOpen={() => open(b)}
                      onDelete={() => {
                        void deleteReservation(b);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !shown.length && (
            <EmptyState>
              Nema rezervacija koje odgovaraju izabranim filterima.
            </EmptyState>
          )}
          {loading && (
            <div className="vehicle-loading">
              Učitavanje sačuvanih rezervacija…
            </div>
          )}
        </div>
      </section>
    </>
  );
}
const formatDate = (value: string) => {
  const d = new Date(value);
  return Number.isFinite(d.getTime())
    ? `${d.toLocaleDateString("sr-RS", { day: "2-digit", month: "short" })} • ${d.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}`
    : value;
};
function NewReservationModal({
  close,
  saved,
}: {
  close: () => void;
  saved: () => void;
}) {
  const [vehicleOptions, setVehicleOptions] = useState(
    vehicles.map((v) => v.name),
  );
  const [form, setForm] = useState({
    client: "",
    vehicle: vehicles[0]?.name || "",
    startsAt: "",
    endsAt: "",
    location: "Beograd • Aerodrom",
    price: "",
    status: "Potvrđena",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const opts = [
          ...new Set(
            (data.vehicles || []).map((v: { name: string }) => v.name),
          ),
        ] as string[];
        setVehicleOptions(opts);
        if (opts[0]) setForm((f) => ({ ...f, vehicle: f.vehicle || opts[0] }));
      })
      .catch(() => {});
  }, []);
  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      setError("Datum vraćanja mora biti posle datuma preuzimanja.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Rezervacija nije sačuvana.");
      saved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rezervacija nije sačuvana.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerFrame className="add-vehicle reservation-form" close={close}>
        <Button className="drawer-close" onClick={close} aria-label="Zatvori">
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>NOVA REZERVACIJA</small>
        <h2>Kreiraj rezervaciju</h2>
        <p className="drawer-intro">
          Unesite klijenta, vozilo i period najma. Rezervacija će biti trajno
          sačuvana.
        </p>
        <form onSubmit={submit}>
          <label>
            Ime i prezime klijenta *
            <CustomInput
              required
              value={form.client}
              onChange={(e) => set("client", e.target.value)}
              placeholder="npr. Petar Petrović"
            />
          </label>
          <label>
            Vozilo *
            <CustomSelect
              value={form.vehicle}
              onChange={(e) => set("vehicle", e.target.value)}
            >
              <option value="">Izaberite vozilo</option>
              {vehicleOptions.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </CustomSelect>
          </label>
          <div className="add-form-grid">
            <label>
              Preuzimanje *
              <CustomDatePicker
                required
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
              />
            </label>
            <label>
              Vraćanje *
              <CustomDatePicker
                required
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
              />
            </label>
            <label>
              Lokacija *
              <CustomSelect
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              >
                <option>Beograd • Aerodrom</option>
                <option>Beograd • Novi Beograd</option>
                <option>Beograd • Dorćol</option>
                <option>Novi Sad • Centar</option>
                <option>Novi Sad • Stanica</option>
                <option>Niš • Aerodrom</option>
              </CustomSelect>
            </label>
            <label>
              Cena (RSD) *
              <CustomInput
                required
                type="number"
                min="0"
                step="100"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="45000"
              />
            </label>
            <label>
              Status *
              <CustomSelect
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Na čekanju</option>
                <option>Potvrđena</option>
                <option>Aktivna</option>
              </CustomSelect>
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Otkaži
            </Button>
            <Button variant="primary" disabled={saving}>
              {saving ? "Čuvanje…" : "Kreiraj rezervaciju"}
            </Button>
          </div>
        </form>
    </DrawerFrame>
  );
}
function BookingPanel({
  b,
  close,
  saved,
}: {
  b: B;
  close: () => void;
  saved: (id: string, status: string) => void;
}) {
  const [s, setS] = useState(b.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const download = (kind: string) => {
    const content = `DriveNode Fleet Manager\n${kind}\nRezervacija: ${b.id}\nKlijent: ${b.client}\nVozilo: ${b.vehicle}\nPeriod: ${b.from} — ${b.to}\nStatus: ${s}\nVrednost: ${b.price}`;
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind.replace(/\s/g, "_")}_${b.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: b.id, status: s }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Status nije sačuvan.");
      saved(b.id, s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status nije sačuvan.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerFrame close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>REZERVACIJA {b.id}</small>
        <h2>{b.client}</h2>
        <Badge s={s} />
        <div className="booking-car">
          <div className="big-car">
            <VehicleIcon aria-hidden="true" />
          </div>
          <div>
            <b>{b.vehicle}</b>
            <small>Rent-a-car vozilo</small>
          </div>
        </div>
        <div className="trip">
          <div>
            <small>PREUZIMANJE</small>
            <b>{b.from}</b>
            <span>Beograd</span>
          </div>
          <ArrowRightIcon className="trip-icon" aria-hidden="true" />
          <div>
            <small>VRAĆANJE</small>
            <b>{b.to}</b>
            <span>Beograd</span>
          </div>
        </div>
        <section>
          <h3>Plaćanje</h3>
          <div className="price-row">
            <span>Najam vozila</span>
            <b>{b.price}</b>
          </div>
          <div className="price-row">
            <span>Depozit</span>
            <b>30.000 RSD</b>
          </div>
        </section>
        <section>
          <h3>Dokumenta</h3>
          <Button
            className="doc-row"
            onClick={() => download("Ugovor o najmu")}
          >
            <DocumentIcon className="button-icon" aria-hidden="true" />
            Ugovor o najmu{" "}
            <span>
              TXT <DownloadIcon aria-hidden="true" />
            </span>
          </Button>
          <Button
            className="doc-row"
            onClick={() => download("Podaci vozačke dozvole")}
          >
            <DocumentIcon className="button-icon" aria-hidden="true" />
            Podaci vozačke dozvole{" "}
            <span>
              TXT <DownloadIcon aria-hidden="true" />
            </span>
          </Button>
        </section>
        <label className="status-control">
          Promeni status
          <CustomSelect value={s} onChange={(e) => setS(e.target.value)}>
            <option>Na čekanju</option>
            <option>Potvrđena</option>
            <option>Aktivna</option>
            <option>Povrat danas</option>
            <option>Završena</option>
            <option>Otkazana</option>
          </CustomSelect>
        </label>
        {error && <div className="form-error">{error}</div>}
        <Button
          variant="primary"
          className="drawer-action"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Čuvanje…" : "Sačuvaj izmene"}
        </Button>
    </DrawerFrame>
  );
}
const demoClients: C[] = [];
function Clients({ addTrigger = 0 }: { addTrigger?: number }) {
  const [q, setQ] = useState("");
  const { deleted, remove } = useSoftDelete("clients");
  const [status, setStatus] = useState("Svi statusi");
  const [city, setCity] = useState("Svi gradovi");
  const [more, setMore] = useState(false);
  const [sortValue, setSortValue] = useState(false);
  const [added, setAdded] = useState<C[]>([]);
  const [selected, setSelected] = useState<C | null>(null);
  const [showAdd, setShowAdd] = useState(addTrigger > 0);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    fetch("/api/clients")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setAdded(data.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (addTrigger > 0) setShowAdd(true);
  }, [addTrigger]);
  const all = [...added, ...demoClients]
    .filter((c) => !deleted.has(c.email))
    .filter((c, i, a) => a.findIndex((x) => x.email === c.email) === i);
  const shown = all
    .filter(
      (c) =>
        (c.name + c.email + c.phone + c.city)
          .toLowerCase()
          .includes(q.toLowerCase()) &&
        (status === "Svi statusi" || c.status === status) &&
        (city === "Svi gradovi" || c.city === city),
    )
    .sort((a, b) => (sortValue ? b.value - a.value : 0));
  const clear = () => {
    setQ("");
    setStatus("Svi statusi");
    setCity("Svi gradovi");
    setSortValue(false);
  };
  const totalClientValue = all.reduce((sum, c) => sum + c.value, 0);
  const clientKpis = [
    [
      "Ukupno klijenata",
      String(all.length),
      "u centralnoj bazi",
      "uživo",
      "blue",
    ],
    [
      "Aktivni",
      String(all.filter((c) => c.status === "Aktivan").length),
      "aktivnih naloga",
      "uživo",
      "green",
    ],
    [
      "Sa rezervacijama",
      String(all.filter((c) => c.reservations > 0).length),
      "ostvarili najam",
      "uživo",
      "violet",
    ],
    [
      "Prosečna vrednost",
      all.length
        ? Math.round(totalClientValue / all.length).toLocaleString("sr-RS") +
          " RSD"
        : "0 RSD",
      "po klijentu",
      "uživo",
      "cyan",
    ],
    [
      "Loyalty članovi",
      String(all.filter((c) => c.status === "VIP").length),
      "VIP klijenata",
      "uživo",
      "amber",
    ],
    [
      "Ukupna vrednost",
      totalClientValue.toLocaleString("sr-RS") + " RSD",
      "svi klijenti",
      "uživo",
      "green",
    ],
  ];
  return (
    <>
      <Head
        title="Klijenti"
        sub="Baza klijenata, dokumenta i istorija najma."
        action="Novi klijent"
        onAction={() => setShowAdd(true)}
      />
      <Kpis
        items={clientKpis}
        actions={[
          clear,
          () => setStatus("Aktivan"),
          () => {
            setStatus("Svi statusi");
            setAdded((x) => x);
          },
          () => {
            setStatus("Svi statusi");
            setSortValue(true);
          },
          () => setStatus("VIP"),
          () => {
            setStatus("Svi statusi");
            setSortValue(true);
          },
        ]}
      />
      <section className="panel table-panel">
        <div className="toolbar">
          <div className="table-search">
            <SearchIcon aria-hidden="true" />
            <CustomInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ime, email, telefon ili grad..."
            />
          </div>
          <CustomSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Svi statusi</option>
            <option>Aktivan</option>
            <option>VIP</option>
            <option>Na čekanju</option>
            <option>Neaktivan</option>
          </CustomSelect>
          <Button
            className={more ? "filter-active" : ""}
            onClick={() => setMore((x) => !x)}
          >
            <FilterIcon className="button-icon" aria-hidden="true" />
            Više filtera
          </Button>
        </div>
        {more && (
          <div className="advanced-filters">
            <label>
              Grad
              <CustomSelect value={city} onChange={(e) => setCity(e.target.value)}>
                <option>Svi gradovi</option>
                {[...new Set(all.map((c) => c.city))].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </CustomSelect>
            </label>
            <label>
              <CustomInput
                type="checkbox"
                checked={sortValue}
                onChange={(e) => setSortValue(e.target.checked)}
              />{" "}
              Najvredniji klijenti prvo
            </label>
            <Button onClick={clear}>Očisti filtere</Button>
          </div>
        )}
        <div className="active-filter-note">
          Prikazano {shown.length} od {all.length} klijenata
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>KLIJENT</th>
                <th>GRAD</th>
                <th>TELEFON</th>
                <th>REZERVACIJE</th>
                <th>UKUPNA VREDNOST</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.email} onClick={() => setSelected(c)}>
                  <td>
                    <div className="person">
                      <span>
                        {c.name
                          .split(" ")
                          .map((x) => x[0])
                          .join("")}
                      </span>
                      <div>
                        <strong>{c.name}</strong>
                        <small>{c.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{c.city}</td>
                  <td>{c.phone}</td>
                  <td>
                    <strong>{c.reservations}</strong>
                  </td>
                  <td>
                    <strong>{c.value.toLocaleString("sr-RS")} RSD</strong>
                  </td>
                  <td>
                    <Badge s={c.status} />
                  </td>
                  <td>
                    <RowMenu
                      label={c.name}
                      onOpen={() => setSelected(c)}
                      onDelete={() => {
                        void remove(c.email, c.name);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !shown.length && (
            <EmptyState>
              Nema klijenata koji odgovaraju izabranim filterima.
            </EmptyState>
          )}
          {loading && (
            <div className="vehicle-loading">
              Učitavanje sačuvanih klijenata…
            </div>
          )}
        </div>
      </section>
      {showAdd && (
        <ClientForm
          close={() => setShowAdd(false)}
          saved={(c) => {
            setAdded((x) => [c, ...x]);
            setShowAdd(false);
          }}
        />
      )}
      {selected && (
        <ClientPanel
          client={selected}
          close={() => setSelected(null)}
          saved={(c) => {
            setAdded((x) => [
              c,
              ...x.filter((y) => y.email !== selected.email),
            ]);
            setSelected(c);
          }}
        />
      )}
    </>
  );
}
function ClientForm({
  close,
  saved,
}: {
  close: () => void;
  saved: (c: C) => void;
}) {
  const [form, setForm] = useState<C>({
    name: "",
    email: "",
    city: "Beograd",
    phone: "",
    reservations: 0,
    value: 0,
    status: "Aktivan",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof C, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    if (name.length < 3 || !name.includes(" ")) {
      setError("Unesite ime i prezime klijenta.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError("Unesite ispravnu email adresu.");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      setError("Broj telefona mora imati između 8 i 15 cifara.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name, email, phone }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Klijent nije sačuvan.");
      saved(data.client);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Klijent nije sačuvan.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerFrame className="add-vehicle" close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>NOVI KLIJENT</small>
        <h2>Dodaj klijenta</h2>
        <p className="drawer-intro">
          Podaci će biti trajno sačuvani u bazi klijenata.
        </p>
        <form onSubmit={submit}>
          <label>
            Ime i prezime *
            <CustomInput
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Petar Petrović"
            />
          </label>
          <div className="add-form-grid">
            <label>
              Email *
              <CustomInput
                required
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="petar@email.com"
              />
            </label>
            <label>
              Telefon *
              <CustomInput
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={24}
                value={form.phone}
                onChange={(e) =>
                  set("phone", formatSerbianPhone(e.target.value))
                }
                placeholder="+381 64 123 4567"
              />
            </label>
            <label>
              Grad *
              <CustomSelect
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              >
                <option>Beograd</option>
                <option>Novi Sad</option>
                <option>Niš</option>
                <option>Kragujevac</option>
                <option>Subotica</option>
              </CustomSelect>
            </label>
            <label>
              Status
              <CustomSelect
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Aktivan</option>
                <option>VIP</option>
                <option>Na čekanju</option>
                <option>Neaktivan</option>
              </CustomSelect>
            </label>
          </div>
          <label>
            Napomena
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Preferencije i važne informacije..."
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Otkaži
            </Button>
            <Button variant="primary" disabled={saving}>
              {saving ? "Čuvanje…" : "Dodaj klijenta"}
            </Button>
          </div>
        </form>
    </DrawerFrame>
  );
}
function ClientPanel({
  client,
  close,
  saved,
}: {
  client: C;
  close: () => void;
  saved: (c: C) => void;
}) {
  const [tab, setTab] = useState("Pregled");
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(client);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof C, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, originalEmail: client.email }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Izmene nisu sačuvane.");
      saved(data.client);
      setEdit(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Izmene nisu sačuvane.");
    } finally {
      setSaving(false);
    }
  };
  const download = (name: string) => {
    const url = URL.createObjectURL(
      new Blob(
        [
          `DriveNode Fleet Manager\n${name}\nKlijent: ${form.name}\nEmail: ${form.email}\nTelefon: ${form.phone}\nStatus: ${form.status}`,
        ],
        { type: "text/plain;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s/g, "_")}_${form.name.replace(/\s/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <DrawerFrame className="client-panel" close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>KARTICA KLIJENTA</small>
        <div className="client-hero">
          <span>
            {form.name
              .split(" ")
              .map((x) => x[0])
              .join("")}
          </span>
          <div>
            <h2>{form.name}</h2>
            <Badge s={form.status} />
          </div>
        </div>
        <div className="client-tabs">
          {["Pregled", "Rezervacije", "Dokumenta", "Napomene"].map((x) => (
            <Button
              key={x}
              className={tab === x ? "active" : ""}
              onClick={() => setTab(x)}
            >
              {x}
            </Button>
          ))}
        </div>
        {tab === "Pregled" &&
          (edit ? (
            <div className="client-edit">
              <label>
                Ime i prezime
                <CustomInput
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </label>
              <label>
                Email
                <CustomInput
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </label>
              <label>
                Telefon
                <CustomInput
                  value={form.phone}
                  onChange={(e) =>
                    set("phone", formatSerbianPhone(e.target.value))
                  }
                />
              </label>
              <label>
                Grad
                <CustomInput
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </label>
              <label>
                Status
                <CustomSelect
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option>Aktivan</option>
                  <option>VIP</option>
                  <option>Na čekanju</option>
                  <option>Neaktivan</option>
                </CustomSelect>
              </label>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <Button variant="outline" onClick={() => setEdit(false)}>
                  Otkaži
                </Button>
                <Button variant="primary" onClick={save} disabled={saving}>
                  {saving ? "Čuvanje…" : "Sačuvaj"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="client-contact">
                {[
                  ["Email", form.email],
                  ["Telefon", form.phone],
                  ["Grad", form.city],
                  ["Broj rezervacija", String(form.reservations)],
                  [
                    "Ukupna vrednost",
                    `${form.value.toLocaleString("sr-RS")} RSD`,
                  ],
                ].map((x) => (
                  <div key={x[0]}>
                    <small>{x[0]}</small>
                    <b>{x[1]}</b>
                  </div>
                ))}
              </div>
              <Button
                variant="primary"
                className="drawer-action"
                onClick={() => setEdit(true)}
              >
                Uredi klijenta
              </Button>
            </>
          ))}
        {tab === "Rezervacije" && (
          <div className="client-records">
            {bookings
              .filter((b) => b.client === form.name)
              .map((b) => (
                <Button key={b.id}>
                  <div>
                    <b>
                      {b.id} • {b.vehicle}
                    </b>
                    <small>
                      {b.from} — {b.to}
                    </small>
                  </div>
                  <Badge s={b.status} />
                </Button>
              ))}
            {!bookings.some((b) => b.client === form.name) && (
              <EmptyState>Klijent još nema rezervacija.</EmptyState>
            )}
          </div>
        )}
        {tab === "Dokumenta" && (
          <div className="client-records">
            <Button
              className="doc-row"
              onClick={() => download("Kartica klijenta")}
            >
              <DocumentIcon className="button-icon" aria-hidden="true" />
              Kartica klijenta{" "}
              <span>
                TXT <DownloadIcon aria-hidden="true" />
              </span>
            </Button>
            <EmptyState>Klijent nema dodatih dokumenata.</EmptyState>
          </div>
        )}
        {tab === "Napomene" && (
          <div className="client-notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Dodajte napomenu o klijentu..."
            />
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Čuvanje…" : "Sačuvaj napomenu"}
            </Button>
            {error && <div className="form-error">{error}</div>}
          </div>
        )}
    </DrawerFrame>
  );
}
const demoServices: S[] = [];
function Services() {
  const [q, setQ] = useState("");
  const { deleted, remove } = useSoftDelete("services");
  const [status, setStatus] = useState("Svi statusi");
  const [type, setType] = useState("Svi tipovi");
  const [more, setMore] = useState(false);
  const [sortCost, setSortCost] = useState(false);
  const [added, setAdded] = useState<S[]>([]);
  const [selected, setSelected] = useState<S | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    fetch("/api/services")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setAdded(data.services || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  const all = [...added, ...demoServices]
    .filter((s) => !deleted.has(s.code))
    .filter((s, i, a) => a.findIndex((x) => x.code === s.code) === i);
  const shown = all
    .filter(
      (s) =>
        (s.vehicle + s.plate + s.type + s.workshop + s.code)
          .toLowerCase()
          .includes(q.toLowerCase()) &&
        (status === "Svi statusi" || s.status === status) &&
        (type === "Svi tipovi" || s.type === type),
    )
    .sort((a, b) =>
      sortCost ? b.cost - a.cost : a.dueDate.localeCompare(b.dueDate),
    );
  const reset = () => {
    setQ("");
    setStatus("Svi statusi");
    setType("Svi tipovi");
    setSortCost(false);
  };
  const serviceCost = all.reduce((sum, s) => sum + s.cost, 0);
  const completed = all.filter((s) => s.status === "Završeno").length;
  const serviceKpis = [
    [
      "Servis uskoro",
      String(
        all.filter((s) => s.status === "Uskoro" || s.status === "Planirano")
          .length,
      ),
      "planiranih obaveza",
      "uživo",
      "red",
    ],
    [
      "Registracija",
      String(all.filter((s) => s.type === "Registracija").length),
      "evidentiranih rokova",
      "uživo",
      "amber",
    ],
    [
      "Na servisu",
      String(all.filter((s) => s.status === "U toku").length),
      "radova u toku",
      "uživo",
      "blue",
    ],
    [
      "Troškovi",
      serviceCost.toLocaleString("sr-RS") + " RSD",
      "svih servisnih zapisa",
      "uživo",
      "violet",
    ],
    ["Završeno", String(completed), "servisnih radova", "uživo", "green"],
    [
      "Uredno održavanje",
      all.length ? Math.round((completed / all.length) * 100) + "%" : "0%",
      "završenih obaveza",
      "uživo",
      "cyan",
    ],
  ];
  return (
    <>
      <Head
        title="Servisi i registracije"
        sub="Održavanje, registracije i rokovi cele flote."
        action="Novi servis"
        onAction={() => setShowAdd(true)}
      />
      <Kpis
        items={serviceKpis}
        actions={[
          () => setStatus("Uskoro"),
          () => {
            setStatus("Svi statusi");
            setType("Registracija");
          },
          () => setStatus("U toku"),
          () => {
            setStatus("Svi statusi");
            setSortCost(true);
          },
          () => setStatus("Završeno"),
          reset,
        ]}
      />
      <section className="panel table-panel">
        <div className="toolbar">
          <div className="table-search">
            <SearchIcon aria-hidden="true" />
            <CustomInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Vozilo, tablice, tip ili radionica..."
            />
          </div>
          <CustomSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Svi statusi</option>
            <option>Planirano</option>
            <option>Uskoro</option>
            <option>U toku</option>
            <option>Završeno</option>
            <option>Otkazano</option>
          </CustomSelect>
          <Button
            className={more ? "filter-active" : ""}
            onClick={() => setMore((x) => !x)}
          >
            <FilterIcon className="button-icon" aria-hidden="true" />
            Više filtera
          </Button>
        </div>
        {more && (
          <div className="advanced-filters">
            <label>
              Tip
              <CustomSelect value={type} onChange={(e) => setType(e.target.value)}>
                <option>Svi tipovi</option>
                <option>Redovan servis</option>
                <option>Veliki servis</option>
                <option>Registracija</option>
                <option>Tehnički pregled</option>
                <option>Pneumatici</option>
                <option>Popravka</option>
              </CustomSelect>
            </label>
            <label>
              <CustomInput
                type="checkbox"
                checked={sortCost}
                onChange={(e) => setSortCost(e.target.checked)}
              />{" "}
              Najveći trošak prvo
            </label>
            <Button onClick={reset}>Očisti filtere</Button>
          </div>
        )}
        <div className="active-filter-note">
          Prikazano {shown.length} od {all.length} zapisa
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>REFERENCA</th>
                <th>VOZILO</th>
                <th>TIP</th>
                <th>ROK</th>
                <th>RADIONICA</th>
                <th>PROCENA</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.code} onClick={() => setSelected(s)}>
                  <td>
                    <strong className="link">{s.code}</strong>
                  </td>
                  <td>
                    <strong>{s.vehicle}</strong>
                    <small>
                      {displayPlate(s.plate)} • {s.mileage.toLocaleString("sr-RS")} km
                    </small>
                  </td>
                  <td>{s.type}</td>
                  <td>
                    <strong>
                      {new Date(`${s.dueDate}T12:00`).toLocaleDateString(
                        "sr-Latn-RS",
                      )}
                    </strong>
                  </td>
                  <td>{s.workshop || "Nije određena"}</td>
                  <td>
                    <strong>
                      {s.cost
                        ? s.cost.toLocaleString("sr-RS") + " RSD"
                        : "Ponuda"}
                    </strong>
                  </td>
                  <td>
                    <Badge s={s.status} />
                  </td>
                  <td>
                    <RowMenu
                      label={s.code}
                      onOpen={() => setSelected(s)}
                      onDelete={() => {
                        void remove(s.code, s.code);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !shown.length && (
            <EmptyState>
              Nema zapisa koji odgovaraju izabranim filterima.
            </EmptyState>
          )}
          {loading && (
            <div className="vehicle-loading">Učitavanje servisnih zapisa…</div>
          )}
        </div>
      </section>
      {showAdd && (
        <ServiceForm
          close={() => setShowAdd(false)}
          saved={(s) => {
            setAdded((x) => [s, ...x]);
            setShowAdd(false);
          }}
        />
      )}
      {selected && (
        <ServicePanel
          service={selected}
          close={() => setSelected(null)}
          saved={(s) => {
            setAdded((x) => [s, ...x.filter((y) => y.code !== selected.code)]);
            setSelected(s);
          }}
        />
      )}
    </>
  );
}
function ServiceForm({
  close,
  saved,
}: {
  close: () => void;
  saved: (s: S) => void;
}) {
  const [vehicleOptions, setVehicleOptions] = useState<V[]>([]);
  const [vehiclePlate, setVehiclePlate] = useState("");
  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const list = d.vehicles || [];
        setVehicleOptions(list);
        if (list[0]) setVehiclePlate(list[0].plate);
      })
      .catch(() => {});
  }, []);
  const vehicle = vehicleOptions.find((v) => v.plate === vehiclePlate);
  const [form, setForm] = useState({
    type: "Redovan servis",
    dueDate: "",
    mileage: "",
    cost: "",
    workshop: "",
    status: "Planirano",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!vehicle) {
      setError("Prvo dodajte vozilo.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          vehicle: vehicle.name,
          plate: vehicle.plate,
          mileage: Number(form.mileage),
          cost: Number(form.cost),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Zapis nije sačuvan.");
      saved(data.service);
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
        <small>NOVI SERVISNI ZAPIS</small>
        <h2>Zakaži servis ili registraciju</h2>
        <form onSubmit={submit}>
          <label>
            Vozilo *
            <CustomSelect
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
            >
              <option value="">Izaberite vozilo</option>
              {vehicleOptions.map((v) => (
                <option value={v.plate} key={v.plate}>
                  {v.name} • {displayPlate(v.plate, v.registered)}
                </option>
              ))}
            </CustomSelect>
          </label>
          <div className="add-form-grid">
            <label>
              Tip *
              <CustomSelect
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              >
                <option>Redovan servis</option>
                <option>Veliki servis</option>
                <option>Registracija</option>
                <option>Tehnički pregled</option>
                <option>Pneumatici</option>
                <option>Popravka</option>
              </CustomSelect>
            </label>
            <label>
              Datum *
              <CustomDatePicker
                required
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </label>
            <label>
              Kilometraža
              <CustomInput
                type="number"
                min="0"
                value={form.mileage}
                onChange={(e) => set("mileage", e.target.value)}
              />
            </label>
            <label>
              Procena troška (RSD)
              <CustomInput
                type="number"
                min="0"
                step="100"
                value={form.cost}
                onChange={(e) => set("cost", e.target.value)}
              />
            </label>
            <label>
              Radionica
              <CustomInput
                value={form.workshop}
                onChange={(e) => set("workshop", e.target.value)}
                placeholder="Auto Centar Beograd"
              />
            </label>
            <label>
              Status
              <CustomSelect
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Planirano</option>
                <option>Uskoro</option>
                <option>U toku</option>
                <option>Završeno</option>
              </CustomSelect>
            </label>
          </div>
          <label>
            Napomena
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Potrebni delovi, opis radova..."
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Otkaži
            </Button>
            <Button variant="primary" disabled={saving}>
              {saving ? "Čuvanje…" : "Sačuvaj zapis"}
            </Button>
          </div>
        </form>
    </DrawerFrame>
  );
}
function ServicePanel({
  service,
  close,
  saved,
}: {
  service: S;
  close: () => void;
  saved: (s: S) => void;
}) {
  const [form, setForm] = useState(service);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof S, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));
  const save = async (status?: string) => {
    setSaving(true);
    setError("");
    try {
      const next = { ...form, status: status || form.status };
      const r = await fetch("/api/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Izmene nisu sačuvane.");
      setForm(data.service);
      saved(data.service);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Izmene nisu sačuvane.");
    } finally {
      setSaving(false);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          `DriveNode Fleet Manager\nServisni nalog ${form.code}\nVozilo: ${form.vehicle} • ${displayPlate(form.plate)}\nTip: ${form.type}\nDatum: ${form.dueDate}\nRadionica: ${form.workshop}\nTrošak: ${form.cost} RSD\nStatus: ${form.status}\nNapomena: ${form.notes}`,
        ],
        { type: "text/plain;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `Servisni_nalog_${form.code}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <DrawerFrame className="service-panel" close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>SERVISNI ZAPIS {form.code}</small>
        <h2>{form.vehicle}</h2>
        <Badge s={form.status} />
        <div className="service-summary">
          <div>
            <small>Tablice</small>
            <b>{displayPlate(form.plate)}</b>
          </div>
          <div>
            <small>Tip</small>
            <b>{form.type}</b>
          </div>
          <div>
            <small>Rok</small>
            <b>
              {new Date(`${form.dueDate}T12:00`).toLocaleDateString(
                "sr-Latn-RS",
              )}
            </b>
          </div>
          <div>
            <small>Radionica</small>
            <b>{form.workshop || "Nije određena"}</b>
          </div>
        </div>
        <div className="service-edit">
          <label>
            Status
            <CustomSelect
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option>Planirano</option>
              <option>Uskoro</option>
              <option>U toku</option>
              <option>Završeno</option>
              <option>Otkazano</option>
            </CustomSelect>
          </label>
          <label>
            Trošak (RSD)
            <CustomInput
              type="number"
              min="0"
              value={form.cost}
              onChange={(e) => set("cost", Number(e.target.value))}
            />
          </label>
          <label>
            Datum
            <CustomDatePicker
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
          </label>
          <label>
            Kilometraža
            <CustomInput
              type="number"
              min="0"
              value={form.mileage}
              onChange={(e) => set("mileage", Number(e.target.value))}
            />
          </label>
          <label className="full">
            Radionica
            <CustomInput
              value={form.workshop}
              onChange={(e) => set("workshop", e.target.value)}
            />
          </label>
          <label className="full">
            Napomena
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <Button className="doc-row" onClick={download}>
          <DocumentIcon className="button-icon" aria-hidden="true" />
          Preuzmi servisni nalog{" "}
          <span>
            TXT <DownloadIcon aria-hidden="true" />
          </span>
        </Button>
        <div className="service-actions">
          <Button
            variant="outline"
            onClick={() => save("Završeno")}
            disabled={saving}
          >
            <CheckIcon className="button-icon" aria-hidden="true" />
            Označi završeno
          </Button>
          <Button variant="primary" onClick={() => save()} disabled={saving}>
            {saving ? "Čuvanje…" : "Sačuvaj izmene"}
          </Button>
        </div>
    </DrawerFrame>
  );
}
const demoFinance: F[] = [];
function Finance() {
  const [q, setQ] = useState("");
  const { deleted, remove } = useSoftDelete("transactions");
  const [kind, setKind] = useState("Sve transakcije");
  const [status, setStatus] = useState("Svi statusi");
  const [location, setLocation] = useState("Sve lokacije");
  const [period, setPeriod] = useState(6);
  const [added, setAdded] = useState<F[]>([]);
  const [selected, setSelected] = useState<F | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const load = () =>
    fetch("/api/transactions")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAdded(d.transactions || []))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const all = [...added, ...demoFinance]
    .filter((x) => !deleted.has(x.reference))
    .filter((x, i, a) => a.findIndex((y) => y.reference === x.reference) === i);
  const shown = all.filter(
    (x) =>
      (x.reference + x.description + x.category)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (kind === "Sve transakcije" || x.kind === kind) &&
      (status === "Svi statusi" || x.status === status) &&
      (location === "Sve lokacije" || x.location === location),
  );
  const reset = () => {
    setQ("");
    setKind("Sve transakcije");
    setStatus("Svi statusi");
    setLocation("Sve lokacije");
  };
  const paid = all.filter((x) => x.status === "Plaćeno");
  const income = paid
    .filter((x) => x.kind === "Prihod")
    .reduce((sum, x) => sum + x.amount, 0);
  const expenses = paid
    .filter((x) => x.kind === "Rashod")
    .reduce((sum, x) => sum + x.amount, 0);
  const pending = all
    .filter((x) => x.status === "Na čekanju")
    .reduce((sum, x) => sum + x.amount, 0);
  const rentals = all.filter(
    (x) => x.kind === "Prihod" && x.category.toLowerCase().includes("najam"),
  );
  const financeKpis = [
    [
      "Ukupan prihod",
      income.toLocaleString("sr-RS") + " RSD",
      "plaćene transakcije",
      "uživo",
      "green",
    ],
    [
      "Broj prihoda",
      String(paid.filter((x) => x.kind === "Prihod").length),
      "evidentirane uplate",
      "uživo",
      "blue",
    ],
    [
      "Ukupni rashodi",
      expenses.toLocaleString("sr-RS") + " RSD",
      "plaćeni rashodi",
      "uživo",
      "red",
    ],
    [
      "Neto profit",
      (income - expenses).toLocaleString("sr-RS") + " RSD",
      "prihod minus rashodi",
      "uživo",
      "violet",
    ],
    [
      "Potraživanja",
      pending.toLocaleString("sr-RS") + " RSD",
      "transakcije na čekanju",
      "uživo",
      "amber",
    ],
    [
      "Prosečan najam",
      rentals.length
        ? Math.round(
            rentals.reduce((sum, x) => sum + x.amount, 0) / rentals.length,
          ).toLocaleString("sr-RS") + " RSD"
        : "0 RSD",
      "po transakciji najma",
      "uživo",
      "cyan",
    ],
  ];
  return (
    <>
      <Head
        title="Finansije"
        sub="Prihodi, rashodi i profitabilnost poslovanja."
        action="Nova transakcija"
        onAction={() => setShowAdd(true)}
      />
      <Kpis
        items={financeKpis}
        actions={[
          () => setKind("Prihod"),
          () => setKind("Prihod"),
          () => setKind("Rashod"),
          reset,
          () => setStatus("Na čekanju"),
          () => {
            setKind("Prihod");
            setQ("Najam");
          },
        ]}
      />
      <div className="finance-grid">
        <section className="panel finance-chart">
          <div className="panel-head">
            <div>
              <h2>Prihodi i rashodi</h2>
              <p>Poslednjih {period} meseci</p>
            </div>
            <Button onClick={() => setPeriod((p) => (p === 6 ? 12 : 3))}>
              {period} meseci
              <ChevronDownIcon className="button-icon button-icon-right" aria-hidden="true" />
            </Button>
          </div>
          <div className="bar-chart">
            {(period === 3
              ? [
                  [0, 0],
                  [0, 0],
                  [0, 0],
                ]
              : period === 6
                ? Array(6).fill([0, 0])
                : Array(12).fill([0, 0])
            ).map((b, i) => (
              <div key={i}>
                <i style={{ height: b[0] * 1.4 }} />
                <em style={{ height: b[1] * 1.4 }} />
                <span>{i + 1}</span>
              </div>
            ))}
          </div>
        </section>
        <section
          className="panel donut-panel clickable-chart"
          role="button"
          tabIndex={0}
          onClick={() =>
            setLocation((l) =>
              l === "Beograd"
                ? "Novi Sad"
                : l === "Novi Sad"
                  ? "Niš"
                  : "Beograd",
            )
          }
          onKeyDown={onKeyboardAction(() =>
            setLocation((l) =>
              l === "Beograd"
                ? "Novi Sad"
                : l === "Novi Sad"
                  ? "Niš"
                  : "Beograd",
            ),
          )}
        >
          <h2>Prihod po lokaciji</h2>
          <div className="donut">
            <b>
              0<small>RSD</small>
            </b>
          </div>
          <p>Nema podataka po lokaciji</p>
          <small>Kliknite za filter lokacije</small>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="finance-filters">
          <div className="table-search">
            <SearchIcon aria-hidden="true" />
            <CustomInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Referenca, opis ili kategorija..."
            />
          </div>
          <CustomSelect value={kind} onChange={(e) => setKind(e.target.value)}>
            <option>Sve transakcije</option>
            <option>Prihod</option>
            <option>Rashod</option>
          </CustomSelect>
          <CustomSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Svi statusi</option>
            <option>Plaćeno</option>
            <option>Na čekanju</option>
            <option>Stornirano</option>
          </CustomSelect>
          <CustomSelect
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option>Sve lokacije</option>
            <option>Beograd</option>
            <option>Novi Sad</option>
            <option>Niš</option>
          </CustomSelect>
          <Button onClick={reset}>Očisti</Button>
        </div>
        <div className="active-filter-note">
          Prikazano {shown.length} od {all.length} transakcija
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>DATUM</th>
                <th>REFERENCA</th>
                <th>OPIS</th>
                <th>KATEGORIJA</th>
                <th>LOKACIJA</th>
                <th>IZNOS</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((x) => (
                <tr key={x.reference} onClick={() => setSelected(x)}>
                  <td>
                    {new Date(`${x.date}T12:00`).toLocaleDateString(
                      "sr-Latn-RS",
                    )}
                  </td>
                  <td>
                    <strong className="link">{x.reference}</strong>
                  </td>
                  <td>{x.description}</td>
                  <td>{x.category}</td>
                  <td>{x.location}</td>
                  <td>
                    <strong
                      className={x.kind === "Rashod" ? "expense" : "income"}
                    >
                      {x.kind === "Rashod" ? "−" : "+"}
                      {x.amount.toLocaleString("sr-RS")} RSD
                    </strong>
                  </td>
                  <td>
                    <Badge s={x.status} />
                  </td>
                  <td>
                    <RowMenu
                      label={x.reference}
                      onOpen={() => setSelected(x)}
                      onDelete={() => {
                        void remove(x.reference, `transakciju `);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (
            <EmptyState>
              Nema transakcija za izabrane filtere.
            </EmptyState>
          )}
        </div>
      </section>
      {showAdd && (
        <TransactionForm
          close={() => setShowAdd(false)}
          saved={(x) => {
            setAdded((a) => [x, ...a]);
            setShowAdd(false);
          }}
        />
      )}
      {selected && (
        <TransactionPanel
          item={selected}
          close={() => setSelected(null)}
          saved={(ref, s) => {
            setAdded((a) =>
              a.map((x) => (x.reference === ref ? { ...x, status: s } : x)),
            );
            setSelected((x) => (x ? { ...x, status: s } : x));
          }}
        />
      )}
    </>
  );
}
function TransactionForm({
  close,
  saved,
}: {
  close: () => void;
  saved: (x: F) => void;
}) {
  const [form, setForm] = useState({
    description: "",
    category: "Najam",
    kind: "Prihod",
    amount: "",
    date: "2026-08-25",
    location: "Beograd",
    status: "Plaćeno",
    paymentMethod: "Kartica",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      saved(d.transaction);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transakcija nije sačuvana.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerFrame className="add-vehicle" close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>NOVA TRANSAKCIJA</small>
        <h2>Dodaj prihod ili rashod</h2>
        <form onSubmit={submit}>
          <label>
            Opis *
            <CustomInput
              required
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <div className="add-form-grid">
            <label>
              Vrsta
              <CustomSelect
                value={form.kind}
                onChange={(e) => set("kind", e.target.value)}
              >
                <option>Prihod</option>
                <option>Rashod</option>
              </CustomSelect>
            </label>
            <label>
              Kategorija
              <CustomSelect
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                <option>Najam</option>
                <option>Depozit</option>
                <option>Servis</option>
                <option>Registracija</option>
                <option>Osiguranje</option>
                <option>Ostalo</option>
              </CustomSelect>
            </label>
            <label>
              Iznos (RSD) *
              <CustomInput
                required
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </label>
            <label>
              Datum
              <CustomDatePicker
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </label>
            <label>
              Lokacija
              <CustomSelect
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              >
                <option>Beograd</option>
                <option>Novi Sad</option>
                <option>Niš</option>
              </CustomSelect>
            </label>
            <label>
              Plaćanje
              <CustomSelect
                value={form.paymentMethod}
                onChange={(e) => set("paymentMethod", e.target.value)}
              >
                <option>Kartica</option>
                <option>Gotovina</option>
                <option>Prenos</option>
              </CustomSelect>
            </label>
            <label>
              Status
              <CustomSelect
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Plaćeno</option>
                <option>Na čekanju</option>
              </CustomSelect>
            </label>
          </div>
          <label>
            Napomena
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Otkaži
            </Button>
            <Button variant="primary" disabled={saving}>
              {saving ? "Čuvanje…" : "Sačuvaj transakciju"}
            </Button>
          </div>
        </form>
    </DrawerFrame>
  );
}
function TransactionPanel({
  item,
  close,
  saved,
}: {
  item: F;
  close: () => void;
  saved: (r: string, s: string) => void;
}) {
  const [status, setStatus] = useState(item.status);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const r = await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: item.reference, status }),
    });
    if (r.ok) saved(item.reference, status);
    setSaving(false);
  };
  const download = () => {
    const u = URL.createObjectURL(
      new Blob(
        [
          `DriveNode Fleet Manager\nPotvrda ${item.reference}\n${item.description}\n${item.kind}: ${item.amount} RSD\nDatum: ${item.date}\nNačin plaćanja: ${item.paymentMethod}\nStatus: ${status}`,
        ],
        { type: "text/plain;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = `Potvrda_${item.reference}.txt`;
    a.click();
    URL.revokeObjectURL(u);
  };
  return (
    <DrawerFrame close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>TRANSAKCIJA {item.reference}</small>
        <h2>{item.description}</h2>
        <Badge s={status} />
        <div className="transaction-amount">
          <small>{item.kind}</small>
          <b>
            {item.kind === "Rashod" ? "−" : "+"}
            {item.amount.toLocaleString("sr-RS")} RSD
          </b>
        </div>
        <div className="client-contact">
          {[
            [
              "Datum",
              new Date(`${item.date}T12:00`).toLocaleDateString("sr-Latn-RS"),
            ],
            ["Kategorija", item.category],
            ["Lokacija", item.location],
            ["Način plaćanja", item.paymentMethod],
            ["Napomena", item.notes || "Nema napomene"],
          ].map((x) => (
            <div key={x[0]}>
              <small>{x[0]}</small>
              <b>{x[1]}</b>
            </div>
          ))}
        </div>
        <Button className="doc-row" onClick={download}>
          <DocumentIcon className="button-icon" aria-hidden="true" />
          Preuzmi potvrdu{" "}
          <span>
            TXT <DownloadIcon aria-hidden="true" />
          </span>
        </Button>
        <label className="status-control">
          Promeni status
          <CustomSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Plaćeno</option>
            <option>Na čekanju</option>
            <option>Stornirano</option>
          </CustomSelect>
        </label>
        <Button
          variant="primary"
          className="drawer-action"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Čuvanje…" : "Sačuvaj status"}
        </Button>
    </DrawerFrame>
  );
}
const demoDocs: D[] = [];
function Documents() {
  const [q, setQ] = useState("");
  const { deleted, remove } = useSoftDelete("documents");
  const [folder, setFolder] = useState("Sve fascikle");
  const [added, setAdded] = useState<D[]>([]);
  const [selected, setSelected] = useState<D | null>(null);
  const [upload, setUpload] = useState(false);
  const load = () =>
    fetch("/api/documents")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAdded(d.documents || []))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const all = [...added, ...demoDocs].filter((d) => !deleted.has(d.storageKey));
  const shown = all.filter(
    (d) =>
      (d.name + d.linkedTo + d.uploadedBy)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (folder === "Sve fascikle" || d.folder === folder),
  );
  const total = all.reduce((s, d) => s + d.size, 0);
  return (
    <>
      <Head
        title="Dokumentacija"
        sub="Sva dokumenta organizovana i dostupna na jednom mestu."
        action="Otpremi dokument"
        onAction={() => setUpload(true)}
      />
      <div className="doc-stats">
        <Button onClick={() => setFolder("Sve fascikle")}>
          <b>{all.length}</b>
          <small>Ukupno dokumenata</small>
        </Button>
        <Button onClick={() => setFolder("Sve fascikle")}>
          <b>{(total / 1024 / 1024).toFixed(1)} MB</b>
          <small>Iskorišćeno</small>
        </Button>
        <Button onClick={() => setFolder("Sve fascikle")}>
          <b>{all.filter((d) => d.expiresAt).length}</b>
          <small>Sa rokom važenja</small>
        </Button>
      </div>
      <h2 className="section-title">Fascikle</h2>
      <div className="folder-grid">
        {["Vozila", "Klijenti", "Ugovori", "Registracije", "Osiguranja"].map(
          (f) => (
            <Button
              className={`folder ${folder === f ? "active" : ""}`}
              key={f}
              onClick={() => setFolder(f)}
            >
              <span>
                <DocumentIcon aria-hidden="true" />
              </span>
              <b>{f}</b>
              <small>
                {all.filter((d) => d.folder === f).length} dokumenta
              </small>
              <i>
                <ChevronRightIcon aria-hidden="true" />
              </i>
            </Button>
          ),
        )}
      </div>
      <section className="panel table-panel">
        <div className="finance-filters">
          <div className="table-search">
            <SearchIcon aria-hidden="true" />
            <CustomInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Naziv, povezani zapis ili autor..."
            />
          </div>
          <CustomSelect value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option>Sve fascikle</option>
            <option>Vozila</option>
            <option>Klijenti</option>
            <option>Ugovori</option>
            <option>Registracije</option>
            <option>Osiguranja</option>
            <option>Ostalo</option>
          </CustomSelect>
          <Button
            onClick={() => {
              setQ("");
              setFolder("Sve fascikle");
            }}
          >
            Očisti
          </Button>
        </div>
        <div className="active-filter-note">
          Prikazano {shown.length} od {all.length} dokumenata
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>NAZIV</th>
                <th>FASCIKLA</th>
                <th>POVEZANO SA</th>
                <th>VELIČINA</th>
                <th>DODAO</th>
                <th>DATUM</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.storageKey} onClick={() => setSelected(d)}>
                  <td>
                    <strong className="link">
                      <DocumentIcon className="button-icon" aria-hidden="true" />
                      {d.name}
                    </strong>
                    <small>{d.mimeType}</small>
                  </td>
                  <td>{d.folder}</td>
                  <td>{d.linkedTo || "—"}</td>
                  <td>
                    {d.size < 1048576
                      ? `${Math.round(d.size / 1024)} KB`
                      : `${(d.size / 1048576).toFixed(1)} MB`}
                  </td>
                  <td>{d.uploadedBy}</td>
                  <td>
                    {new Date(
                      `${d.createdAt.slice(0, 10)}T12:00`,
                    ).toLocaleDateString("sr-Latn-RS")}
                  </td>
                  <td>
                    <RowMenu
                      label={d.name}
                      onOpen={() => setSelected(d)}
                      onDelete={() => {
                        void remove(d.storageKey, d.name);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (
            <EmptyState>Nema dokumenata u ovoj fascikli.</EmptyState>
          )}
        </div>
      </section>
      {upload && (
        <DocumentUpload
          close={() => setUpload(false)}
          saved={(d) => {
            setAdded((x) => [d, ...x]);
            setUpload(false);
          }}
        />
      )}
      {selected && (
        <DocumentPanel
          doc={selected}
          close={() => setSelected(null)}
          changed={(d) => {
            setAdded((x) => [d, ...x.filter((y) => y.id !== d.id)]);
            setSelected(d);
          }}
          deleted={(d) => {
            setAdded((x) => x.filter((y) => y.id !== d.id));
            setSelected(null);
          }}
        />
      )}
    </>
  );
}
function DocumentUpload({
  close,
  saved,
  defaultFolder = "Ugovori",
  defaultLinkedTo = "",
}: {
  close: () => void;
  saved: (d: D) => void;
  defaultFolder?: string;
  defaultLinkedTo?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [folder, setFolder] = useState(defaultFolder);
  const [linkedTo, setLinkedTo] = useState(defaultLinkedTo);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    const body = new FormData();
    body.append("file", file);
    body.append("folder", folder);
    body.append("linkedTo", linkedTo);
    body.append("expiresAt", expiresAt);
    try {
      const r = await fetch("/api/documents", { method: "POST", body });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      saved(d.document);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload nije uspeo.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerFrame className="add-vehicle" close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>OTPREMANJE DOKUMENTA</small>
        <h2>Dodaj dokument</h2>
        <form onSubmit={submit}>
          <label className="upload-zone">
            Izaberite fajl do 10 MB
            <CustomInput
              required
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <b>{file?.name || "Kliknite za izbor fajla"}</b>
          </label>
          <div className="add-form-grid">
            <label>
              Fascikla
              <CustomSelect
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              >
                <option>Vozila</option>
                <option>Klijenti</option>
                <option>Ugovori</option>
                <option>Registracije</option>
                <option>Osiguranja</option>
                <option>Ostalo</option>
              </CustomSelect>
            </label>
            <label>
              Povezano sa
              <CustomInput
                value={linkedTo}
                onChange={(e) => setLinkedTo(e.target.value)}
                placeholder="Vozilo, klijent ili rezervacija"
              />
            </label>
            <label>
              Važi do
              <CustomDatePicker
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Otkaži
            </Button>
            <Button variant="primary" disabled={saving || !file}>
              {saving ? "Otpremanje…" : "Otpremi dokument"}
            </Button>
          </div>
        </form>
    </DrawerFrame>
  );
}
function DocumentPanel({
  doc,
  close,
  changed,
  deleted,
}: {
  doc: D;
  close: () => void;
  changed: (d: D) => void;
  deleted: (d: D) => void;
}) {
  const [form, setForm] = useState(doc);
  const [saving, setSaving] = useState(false);
  const isDemo = !doc.id;
  const download = () => {
    if (doc.id) {
      location.href = `/api/documents?download=${doc.id}`;
      return;
    }
    const u = URL.createObjectURL(
      new Blob(
        [
          `DriveNode demo dokument\n${doc.name}\nFascikla: ${doc.folder}\nPovezano sa: ${doc.linkedTo}`,
        ],
        { type: "text/plain" },
      ),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = doc.name + ".txt";
    a.click();
    URL.revokeObjectURL(u);
  };
  const save = async () => {
    if (isDemo) {
      changed(form);
      return;
    }
    setSaving(true);
    const r = await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) changed((await r.json()).document);
    setSaving(false);
  };
  const remove = async () => {
    if (!confirm(`Obrisati dokument ${doc.name}?`)) return;
    if (isDemo) {
      deleted(doc);
      return;
    }
    const r = await fetch(`/api/documents?id=${doc.id}`, { method: "DELETE" });
    if (r.ok) deleted(doc);
  };
  return (
    <DrawerFrame close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>DOKUMENT</small>
        <h2>{doc.name}</h2>
        <div className="document-icon">
          <DocumentIcon aria-hidden="true" />
        </div>
        <div className="client-edit">
          <label>
            Naziv
            <CustomInput
              value={form.name}
              onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
            />
          </label>
          <label>
            Fascikla
            <CustomSelect
              value={form.folder}
              onChange={(e) =>
                setForm((x) => ({ ...x, folder: e.target.value }))
              }
            >
              <option>Vozila</option>
              <option>Klijenti</option>
              <option>Ugovori</option>
              <option>Registracije</option>
              <option>Osiguranja</option>
              <option>Ostalo</option>
            </CustomSelect>
          </label>
          <label className="full">
            Povezano sa
            <CustomInput
              value={form.linkedTo}
              onChange={(e) =>
                setForm((x) => ({ ...x, linkedTo: e.target.value }))
              }
            />
          </label>
          <label>
            Važi do
            <CustomDatePicker
              type="date"
              value={form.expiresAt || ""}
              onChange={(e) =>
                setForm((x) => ({ ...x, expiresAt: e.target.value }))
              }
            />
          </label>
        </div>
        <Button variant="primary" className="drawer-action" onClick={download}>
          Preuzmi dokument
        </Button>
        <div className="document-actions">
          <Button variant="outline" onClick={remove}>
            Obriši
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "Čuvanje…" : "Sačuvaj izmene"}
          </Button>
        </div>
    </DrawerFrame>
  );
}
function Reports() {
  const [period, setPeriod] = useState("Avgust 2026");
  const [location, setLocation] = useState("Sve poslovnice");
  const [metric, setMetric] = useState("Pregled");
  const [selected, setSelected] = useState<{
    title: string;
    value: string;
    detail: string;
  } | null>(null);
  const [sort, setSort] = useState("Prihod");
  const utilization = [
    ["Economy", 0],
    ["Compact", 0],
    ["Premium", 0],
    ["SUV", 0],
    ["Kombi", 0],
  ] as [string, number][];
  const profits = [0, 0, 0, 0, 0];
  const exportCsv = () => {
    const rows = [
      ["DNFM Izveštaj", period, location],
      ["Vozilo", "Tablice", "Iskorišćenost", "Prihod RSD"],
      ...vehicles
        .slice(0, 5)
        .map((v, i) => [
          v.name,
          displayPlate(v.plate, v.registered),
          `${utilization[i][1]}%`,
          String(profits[i]),
        ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        [
          "\ufeff" +
            rows.map((r) => r.map((x) => JSON.stringify(x)).join(";")).join("\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `DNFM_izvestaj_${period.replace(/\s/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const details = [
    { title: "Iskorišćenost flote", value: "0%", detail: "Nema podataka." },
    { title: "Prihod po vozilu", value: "0 RSD", detail: "Nema podataka." },
    { title: "Broj rezervacija", value: "0", detail: "Nema podataka." },
    { title: "Prosečno trajanje", value: "0 dana", detail: "Nema podataka." },
    { title: "Najprofitabilnije", value: "—", detail: "Nema podataka." },
    { title: "Ocena klijenata", value: "—", detail: "Nema recenzija." },
  ];
  return (
    <>
      <div className="page-title report-head">
        <div>
          <h1>Izveštaji</h1>
          <small>
            Ključni pokazatelji za donošenje boljih poslovnih odluka.
          </small>
        </div>
        <div className="report-actions">
          <CustomSelect value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option>Avgust 2026</option>
            <option>Jul 2026</option>
            <option>Q3 2026</option>
            <option>2026. godina</option>
          </CustomSelect>
          <CustomSelect
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option>Sve poslovnice</option>
            <option>Beograd</option>
            <option>Novi Sad</option>
            <option>Niš</option>
          </CustomSelect>
          <Button variant="outline" onClick={exportCsv}>
            <DownloadIcon className="button-icon" aria-hidden="true" />
            Excel / CSV
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            PDF / Štampa
          </Button>
        </div>
      </div>
      <Kpis
        items={[
          ["Iskorišćenost flote", "0%", "nema podataka", "—", "green"],
          ["Prihod po vozilu", "0 RSD", "nema podataka", "—", "blue"],
          ["Broj rezervacija", "0", "nema rezervacija", "—", "violet"],
          ["Prosečno trajanje", "0 dana", "nema podataka", "—", "cyan"],
          ["Najprofitabilnije", "—", "nema vozila", "—", "amber"],
          ["Ocena klijenata", "—", "nema recenzija", "—", "green"],
        ]}
        actions={details.map((d) => () => {
          setMetric(d.title);
          setSelected(d);
        })}
      />
      <div className="report-filter-note">
        <b>{metric}</b>
        <span>
          {period} • {location}
        </span>
        <Button onClick={() => setMetric("Pregled")}>Resetuj pregled</Button>
      </div>
      <div className="reports-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Iskorišćenost flote</h2>
              <p>Kliknite na kategoriju za detalje</p>
            </div>
            <CustomSelect value={sort} onChange={(e) => setSort(e.target.value)}>
              <option>Prihod</option>
              <option>Iskorišćenost</option>
            </CustomSelect>
          </div>
          {utilization.map((x) => (
            <Button
              className="progress-row report-row"
              key={x[0]}
              onClick={() =>
                setSelected({
                  title: x[0],
                  value: `${x[1]}%`,
                  detail: `Kategorija ${x[0]} ima ${x[1]}% iskorišćenosti u periodu ${period} za lokaciju ${location}.`,
                })
              }
            >
              <span>{x[0]}</span>
              <i>
                <em style={{ width: `${x[1]}%` }} />
              </i>
              <b>{x[1]}%</b>
            </Button>
          ))}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Najprofitabilnija vozila</h2>
              <p>
                {sort} • {period}
              </p>
            </div>
            <Button
              onClick={() =>
                setSort((s) => (s === "Prihod" ? "Iskorišćenost" : "Prihod"))
              }
            >
              Promeni rangiranje
            </Button>
          </div>
          {vehicles.slice(0, 5).map((v, i) => (
            <Button
              className="ranking report-ranking"
              key={v.plate}
              onClick={() =>
                setSelected({
                  title: v.name,
                  value: `${profits[i].toLocaleString("sr-RS")} RSD`,
                  detail: `${displayPlate(v.plate, v.registered)} • ${v.location}. Vozilo ima ${utilization[i][1]}% iskorišćenosti i ${v.status.toLowerCase()} status.`,
                })
              }
            >
              <b>0{i + 1}</b>
              <span className="car-thumb">
                <VehicleIcon aria-hidden="true" />
              </span>
              <div>
                <strong>{v.name}</strong>
                <small>{displayPlate(v.plate, v.registered)}</small>
              </div>
              <em>{profits[i].toLocaleString("sr-RS")} RSD</em>
            </Button>
          ))}
        </section>
      </div>
      <div className="report-bottom">
        <section className="panel trend-card">
          <div className="panel-head">
            <div>
              <h2>Trend rezervacija</h2>
              <p>Poslednjih 6 meseci</p>
            </div>
          </div>
          <div className="mini-bars">
            {[0, 0, 0, 0, 0, 0].map((x, i) => (
              <Button
                key={i}
                onClick={() =>
                  setSelected({
                    title: ["Mar", "Apr", "Maj", "Jun", "Jul", "Avg"][i],
                    value: `${Math.round(x * 3)} rezervacija`,
                    detail: `Detaljan broj rezervacija za mesec ${["mart", "april", "maj", "jun", "jul", "avgust"][i]} 2026.`,
                  })
                }
              >
                <i style={{ height: `${x}%` }} />
                <span>{["Mar", "Apr", "Maj", "Jun", "Jul", "Avg"][i]}</span>
              </Button>
            ))}
          </div>
        </section>
        <section className="panel rating-card">
          <h2>Zadovoljstvo klijenata</h2>
          {[5, 4, 3, 2, 1].map((x, i) => (
            <Button
              key={x}
              onClick={() =>
                setSelected({
                  title: `${x} zvezdica`,
                  value: `${[0, 0, 0, 0, 0][i]}%`,
                  detail: `Udeo recenzija sa ocenom ${x} u ukupno 0 recenzija.`,
                })
              }
            >
              <span>
                {x} <StarIcon aria-hidden="true" />
              </span>
              <i>
                <em style={{ width: `${[0, 0, 0, 0, 0][i]}%` }} />
              </i>
              <b>{[0, 0, 0, 0, 0][i]}%</b>
            </Button>
          ))}
        </section>
      </div>
      {selected && (
        <ReportPanel
          item={selected}
          period={period}
          location={location}
          close={() => setSelected(null)}
          exportCsv={exportCsv}
        />
      )}
    </>
  );
}
function ReportPanel({
  item,
  period,
  location,
  close,
  exportCsv,
}: {
  item: { title: string; value: string; detail: string };
  period: string;
  location: string;
  close: () => void;
  exportCsv: () => void;
}) {
  return (
    <DrawerFrame className="report-panel" close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>DETALJ IZVEŠTAJA</small>
        <h2>{item.title}</h2>
        <div className="report-big-value">{item.value}</div>
        <p>{item.detail}</p>
        <div className="client-contact">
          <div>
            <small>Period</small>
            <b>{period}</b>
          </div>
          <div>
            <small>Poslovnica</small>
            <b>{location}</b>
          </div>
          <div>
            <small>Poslednje ažuriranje</small>
            <b>Danas, 10:30</b>
          </div>
          <div>
            <small>Izvor</small>
            <b>DNFM analitika</b>
          </div>
        </div>
        <Button variant="outline" className="drawer-action" onClick={exportCsv}>
          Preuzmi podatke (CSV)
        </Button>
        <Button
          variant="primary"
          className="drawer-action"
          onClick={() => window.print()}
        >
          Sačuvaj kao PDF / Štampaj
        </Button>
    </DrawerFrame>
  );
}
const demoUsers: U[] = [];
function Users() {
  const [q, setQ] = useState("");
  const { deleted, remove } = useSoftDelete("users");
  const [role, setRole] = useState("Sve uloge");
  const [tab, setTab] = useState("Korisnici");
  const [added, setAdded] = useState<U[]>([]);
  const [selected, setSelected] = useState<U | null>(null);
  const [invite, setInvite] = useState(false);
  const load = () =>
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAdded(d.users || []))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const all = [...added, ...demoUsers]
    .filter((u) => !deleted.has(u.email))
    .filter((u, i, a) => a.findIndex((x) => x.email === u.email) === i)
    .map((u) => ({ ...u, permissions: safePermissions(u.permissions) }));
  const shown = all.filter(
    (u) =>
      (u.name + u.email + u.branch).toLowerCase().includes(q.toLowerCase()) &&
      (role === "Sve uloge" || u.role === role),
  );
  return (
    <>
      <Head
        title="Korisnici i dozvole"
        sub="Upravljajte timom, ulogama i pristupom podacima."
        action="Pozovi korisnika"
        onAction={() => setInvite(true)}
      />
      <div className="detail-tabs user-tabs">
        {["Korisnici", "Uloge i dozvole", "Aktivnosti"].map((x) => (
          <Button
            key={x}
            className={tab === x ? "active" : ""}
            onClick={() => setTab(x)}
          >
            {x}
          </Button>
        ))}
      </div>
      {tab === "Korisnici" && (
        <section className="panel table-panel">
          <div className="finance-filters">
            <div className="table-search">
              <SearchIcon aria-hidden="true" />
              <CustomInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ime, email ili poslovnica..."
              />
            </div>
            <CustomSelect value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Sve uloge</option>
              <option>Administrator</option>
              <option>Menadžer</option>
              <option>Agent</option>
              <option>Računovođa</option>
            </CustomSelect>
            <Button
              onClick={() => {
                setQ("");
                setRole("Sve uloge");
              }}
            >
              Očisti
            </Button>
          </div>
          <div className="active-filter-note">{shown.length} korisnika</div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>KORISNIK</th>
                  <th>EMAIL</th>
                  <th>ULOGA</th>
                  <th>POSLOVNICA</th>
                  <th>POSLEDNJA AKTIVNOST</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.email} onClick={() => setSelected(u)}>
                    <td>
                      <div className="person">
                        <span>
                          {u.name
                            .split(" ")
                            .map((x) => x[0])
                            .join("")}
                        </span>
                        <strong>{u.name}</strong>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.branch}</td>
                    <td>{u.lastActive}</td>
                    <td>
                      <Badge s={u.status} />
                    </td>
                    <td>
                      <RowMenu
                        label={u.name}
                        onOpen={() => setSelected(u)}
                        onDelete={() => {
                          void remove(u.email, u.name);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "Uloge i dozvole" && (
        <div className="role-grid">
          {[
            ["Administrator", "Potpun pristup", 7],
            ["Menadžer", "Operativno upravljanje", 5],
            ["Agent", "Rezervacije i klijenti", 3],
            ["Računovođa", "Finansije i izveštaji", 2],
          ].map((r) => (
            <Button
              key={r[0]}
              onClick={() => {
                setRole(String(r[0]));
                setTab("Korisnici");
              }}
            >
              <span>
                <ClientsIcon aria-hidden="true" />
              </span>
              <b>{r[0]}</b>
              <small>{r[1]}</small>
              <em>
                {all.filter((u) => u.role === r[0]).length} korisnika • {r[2]}{" "}
                modula
              </em>
            </Button>
          ))}
        </div>
      )}
      {tab === "Aktivnosti" && (
        <section className="panel activity-log">
          {all.slice(0, 5).map((u, i) => (
            <Button key={u.email} onClick={() => setSelected(u)}>
              <span>
                {u.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </span>
              <div>
                <b>{u.name}</b>
                <small>
                  {
                    [
                      "Promenio status rezervacije DN-2841",
                      "Dodao novo vozilo",
                      "Otvorio finansijski izveštaj",
                      "Ažurirala klijenta",
                      "Poziv za pristup je poslat",
                    ][i]
                  }
                </small>
              </div>
              <em>{u.lastActive}</em>
            </Button>
          ))}
        </section>
      )}
      {invite && (
        <InviteUser
          close={() => setInvite(false)}
          saved={(u) => {
            setAdded((x) => [u, ...x]);
            setInvite(false);
          }}
        />
      )}
      {selected && (
        <UserPanel
          user={selected}
          close={() => setSelected(null)}
          saved={(u) => {
            setAdded((x) => [
              u,
              ...x.filter((y) => y.email !== selected.email),
            ]);
            setSelected(u);
          }}
        />
      )}
    </>
  );
}
function InviteUser({
  close,
  saved,
}: {
  close: () => void;
  saved: (u: U) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Agent",
    branch: "Beograd",
    permissions: ["Vozila", "Rezervacije", "Klijenti"],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      saved(d.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Poziv nije poslat.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerFrame className="add-vehicle" close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>NOVI KORISNIK</small>
        <h2>Pozovi člana tima</h2>
        <form onSubmit={submit}>
          <label>
            Ime i prezime *
            <CustomInput
              required
              value={form.name}
              onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
            />
          </label>
          <label>
            Email *
            <CustomInput
              required
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((x) => ({ ...x, email: e.target.value }))
              }
            />
          </label>
          <div className="add-form-grid">
            <label>
              Uloga
              <CustomSelect
                value={form.role}
                onChange={(e) =>
                  setForm((x) => ({ ...x, role: e.target.value }))
                }
              >
                <option>Administrator</option>
                <option>Menadžer</option>
                <option>Agent</option>
                <option>Računovođa</option>
              </CustomSelect>
            </label>
            <label>
              Poslovnica
              <CustomSelect
                value={form.branch}
                onChange={(e) =>
                  setForm((x) => ({ ...x, branch: e.target.value }))
                }
              >
                <option>Sve poslovnice</option>
                <option>Beograd</option>
                <option>Novi Sad</option>
                <option>Niš</option>
              </CustomSelect>
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Otkaži
            </Button>
            <Button variant="primary" disabled={saving}>
              {saving ? "Slanje…" : "Pošalji poziv"}
            </Button>
          </div>
        </form>
    </DrawerFrame>
  );
}
function UserPanel({
  user,
  close,
  saved,
}: {
  user: U;
  close: () => void;
  saved: (u: U) => void;
}) {
  const initial = safePermissions(user.permissions);
  const [form, setForm] = useState({
    ...user,
    permissions: initial as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const modules = [
    "Vozila",
    "Rezervacije",
    "Klijenti",
    "Finansije",
    "Dokumentacija",
    "Izveštaji",
    "Korisnici",
  ];
  const toggle = (m: string) =>
    setForm((x) => ({
      ...x,
      permissions: x.permissions.includes(m)
        ? x.permissions.filter((p) => p !== m)
        : [...x.permissions, m],
    }));
  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, originalEmail: user.email }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      saved(d.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Izmene nisu sačuvane.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerFrame className="user-panel" close={close}>
        <Button className="drawer-close" onClick={close}>
          <CloseIcon aria-hidden="true" />
        </Button>
        <small>KORISNIČKI NALOG</small>
        <div className="client-hero">
          <span>
            {form.name
              .split(" ")
              .map((x) => x[0])
              .join("")}
          </span>
          <div>
            <h2>{form.name}</h2>
            <Badge s={form.status} />
          </div>
        </div>
        <div className="client-edit">
          <label>
            Ime
            <CustomInput
              value={form.name}
              onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
            />
          </label>
          <label>
            Email
            <CustomInput
              value={form.email}
              onChange={(e) =>
                setForm((x) => ({ ...x, email: e.target.value }))
              }
            />
          </label>
          <label>
            Uloga
            <CustomSelect
              value={form.role}
              onChange={(e) => setForm((x) => ({ ...x, role: e.target.value }))}
            >
              <option>Administrator</option>
              <option>Menadžer</option>
              <option>Agent</option>
              <option>Računovođa</option>
            </CustomSelect>
          </label>
          <label>
            Poslovnica
            <CustomSelect
              value={form.branch}
              onChange={(e) =>
                setForm((x) => ({ ...x, branch: e.target.value }))
              }
            >
              <option>Sve poslovnice</option>
              <option>Beograd</option>
              <option>Novi Sad</option>
              <option>Niš</option>
            </CustomSelect>
          </label>
          <label>
            Status
            <CustomSelect
              value={form.status}
              onChange={(e) =>
                setForm((x) => ({ ...x, status: e.target.value }))
              }
            >
              <option>Aktivan</option>
              <option>Pozvan</option>
              <option>Suspendo­van</option>
            </CustomSelect>
          </label>
        </div>
        <h3 className="permission-title">Dozvole po modulima</h3>
        <div className="permission-list">
          {modules.map((m) => (
            <label key={m}>
              <CustomInput
                type="checkbox"
                aria-label={`Dozvola za modul ${m}`}
                checked={form.permissions.includes(m)}
                onChange={() => toggle(m)}
              />
              <span>
                <b>{m}</b>
                <small>Pregled i upravljanje modulom</small>
              </span>
            </label>
          ))}
        </div>
        {error && <div className="form-error">{error}</div>}
        <Button
          variant="primary"
          className="drawer-action"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Čuvanje…" : "Sačuvaj korisnika i dozvole"}
        </Button>
    </DrawerFrame>
  );
}
function Settings() {
  const [tab, setTab] = useState("Firma");
  return (
    <>
      <Head title="Podešavanja" sub="Prilagodite DriveNode vašem poslovanju." />
      <div className="settings-layout">
        <nav>
          {[
            "Firma",
            "Poslovnice",
            "Cenovnik",
            "Dodaci",
            "Načini plaćanja",
            "Porezi i valuta",
            "Obaveštenja",
            "Integracije",
          ].map((x) => (
            <Button
              className={tab === x ? "active" : ""}
              onClick={() => setTab(x)}
              key={x}
            >
              {x}
              <span>
                <ChevronRightIcon aria-hidden="true" />
              </span>
            </Button>
          ))}
        </nav>
        <section className="panel settings-form">
          <h2>{tab}</h2>
          <p>Osnovni podaci i podešavanja modula.</p>
          <div className="form-grid">
            <label>
              Naziv kompanije
              <CustomInput placeholder="Naziv vaše rent-a-car kompanije" />
            </label>
            <label>
              PIB
              <CustomInput placeholder="PIB" />
            </label>
            <label>
              Matični broj
              <CustomInput placeholder="Matični broj" />
            </label>
            <label>
              Telefon
              <CustomInput placeholder="Telefon" />
            </label>
            <label className="full">
              Adresa
              <CustomInput placeholder="Adresa sedišta" />
            </label>
            <label>
              Email
              <CustomInput placeholder="Email kompanije" />
            </label>
            <label>
              Web sajt
              <CustomInput placeholder="Web sajt" />
            </label>
          </div>
          <div className="form-actions">
            <Button variant="outline">Otkaži</Button>
            <Button variant="primary">Sačuvaj izmene</Button>
          </div>
        </section>
      </div>
    </>
  );
}
function Login({ on }: { on: () => void }) {
  return (
    <div className="login">
      <section className="login-brand">
        <div className="brand">
          <span className="brand-mark">D</span>
          <div>
            <b>DriveNode</b>
            <small>FLEET MANAGER</small>
          </div>
        </div>
        <div>
          <span className="login-pill">DNFM BETA V1</span>
          <h1>
            Vaša flota.
            <br />
            <em>Potpuna kontrola.</em>
          </h1>
          <p>
            Jednostavnije rezervacije, bolja iskorišćenost i više profita — sve
            na jednom mestu.
          </p>
        </div>
      </section>
      <section className="login-form">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            on();
          }}
        >
          <div className="login-logo">
            <span className="brand-mark">D</span>
          </div>
          <h2>Dobro došli nazad</h2>
          <p>Prijavite se na vaš DriveNode nalog.</p>
          <label>
            Email adresa
            <CustomInput type="email" defaultValue="demo@dnfm.rs" />
          </label>
          <label>
            Lozinka
            <CustomInput type="password" defaultValue="drivenode" />
          </label>
          <div className="remember">
            <label>
              <CustomInput type="checkbox" defaultChecked /> Zapamti me
            </label>
            <Button type="button" className="link-button">
              Zaboravili ste lozinku?
            </Button>
          </div>
          <Button variant="primary" className="login-button">
            Prijavi se
          </Button>
          <small>Demo pristup je unapred popunjen</small>
        </form>
      </section>
    </div>
  );
}
function App() {
  const [logged, setLogged] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [page, setPage] = useState("Pregled");
  const currentUser = defaultCurrentUser;
  useEffect(() => {
    try {
      setLogged(localStorage.getItem("dnfm_logged_in") === "1");
      const routed = pageFromPath(location.pathname);
      const savedPage = localStorage.getItem("dnfm_current_page");
      if (location.pathname !== "/") setPage(routed);
      else if (savedPage && [...nav, "Podešavanja"].includes(savedPage))
        setPage(savedPage);
    } finally {
      setAuthReady(true);
    }
  }, []);
  useEffect(() => {
    if (authReady && logged) localStorage.setItem("dnfm_current_page", page);
  }, [page, authReady, logged]);
  const [v, setV] = useState<V | null>(null);
  const [b, setB] = useState<B | null>(null);
  const [newBooking, setNewBooking] = useState(false);
  const [bookingReturnPage, setBookingReturnPage] = useState("Rezervacije");
  const [bookingRefresh, setBookingRefresh] = useState(0);
  const [bookingOverrides, setBookingOverrides] = useState<
    Record<string, string>
  >({});
  const [vehicleAddTrigger, setVehicleAddTrigger] = useState(0);
  const [clientAddTrigger, setClientAddTrigger] = useState(0);
  const [pathname, setPathname] = useState("");
  useEffect(() => {
    const onPop = () => {
      setPage(pageFromPath(location.pathname));
      setV(null);
      setB(null);
      setPathname(location.pathname);
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (!authReady || !logged) return;
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts[0] === "vehicles" && parts[1])
      fetch("/api/vehicles")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          const row = (d.vehicles || []).find(
            (x: { plate: string }) => x.plate === decodeURIComponent(parts[1]),
          );
          if (row)
            setV({
              ...row,
              km: Number(row.km).toLocaleString("sr-RS") + " km",
            });
        })
        .catch(() => {});
    else if (parts[0] === "reservations" && parts[1])
      fetch("/api/reservations")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          const row = (d.reservations || []).find(
            (x: { code: string }) => x.code === decodeURIComponent(parts[1]),
          );
          if (row)
            setB({
              id: row.code,
              client: row.client,
              vehicle: row.vehicle,
              from: formatDate(row.startsAt),
              to: formatDate(row.endsAt),
              price: Number(row.price).toLocaleString("sr-RS") + " RSD",
              status: row.status,
            });
        })
        .catch(() => {});
  }, [authReady, logged, pathname]);
  const login = () => {
    localStorage.setItem("dnfm_logged_in", "1");
    if (location.pathname === "/")
      history.replaceState({}, "", routeByPage[page] || "/dashboard");
    setLogged(true);
  };
  const logout = () => {
    localStorage.removeItem("dnfm_logged_in");
    localStorage.removeItem("dnfm_current_page");
    history.replaceState({}, "", "/");
    setLogged(false);
  };
  if (!authReady) return null;
  if (!logged) return <Login on={login} />;
  const go = (x: string) => {
    setPage(x);
    setV(null);
    setB(null);
    const path = routeByPage[x] || "/dashboard";
    if (location.pathname !== path) history.pushState({}, "", path);
    setPathname(path);
  };
  const openVehicle = (vehicle: V) => {
    setPage("Vozila");
    setV(vehicle);
    setB(null);
    const path = "/vehicles/" + encodeURIComponent(vehicle.plate);
    history.pushState({}, "", path);
    setPathname(path);
  };
  const closeVehicle = () => {
    setV(null);
    history.pushState({}, "", "/vehicles");
    setPathname("/vehicles");
  };
  const openReservation = (booking: B) => {
    setPage("Rezervacije");
    setB(booking);
    setV(null);
    const path = "/reservations/" + encodeURIComponent(booking.id);
    history.pushState({}, "", path);
    setPathname(path);
  };
  const closeReservation = () => {
    setB(null);
    history.pushState({}, "", "/reservations");
    setPathname("/reservations");
  };
  const createBooking = () => {
    setBookingReturnPage(page);
    setNewBooking(true);
  };
  const addVehicle = () => {
    go("Vozila");
    setVehicleAddTrigger((x) => x + 1);
  };
  const addClient = () => {
    go("Klijenti");
    setClientAddTrigger((x) => x + 1);
  };
  const bookingSaved = () => {
    setNewBooking(false);
    go(bookingReturnPage);
    setBookingRefresh((x) => x + 1);
  };
  const statusSaved = (id: string, status: string) => {
    setBookingOverrides((x) => ({ ...x, [id]: status }));
    setBookingRefresh((x) => x + 1);
    closeReservation();
  };
  let c: React.ReactNode;
  if (v) c = <VehicleDetail v={v} back={closeVehicle} />;
  else
    c =
      page === "Vozila" ? (
        <Vehicles open={openVehicle} addTrigger={vehicleAddTrigger} />
      ) : page === "Rezervacije" ? (
        <Reservations
          open={openReservation}
          newReservation={createBooking}
          refresh={bookingRefresh}
          overrides={bookingOverrides}
          onDeleted={() => setBookingRefresh((x) => x + 1)}
        />
      ) : page === "Kalendar" ? (
        <BookingCalendar
          open={openReservation}
          newReservation={createBooking}
          refresh={bookingRefresh}
          overrides={bookingOverrides}
        />
      ) : page === "Klijenti" ? (
        <Clients addTrigger={clientAddTrigger} />
      ) : page.startsWith("Servisi") ? (
        <Services />
      ) : page === "Finansije" ? (
        <Finance />
      ) : page === "Dokumentacija" ? (
        <Documents />
      ) : page === "Izveštaji" ? (
        <Reports />
      ) : page.startsWith("Korisnici") ? (
        <Users />
      ) : page === "Podešavanja" ? (
        <Settings />
      ) : (
        <DashboardLive
          go={go}
          openBooking={openReservation}
          newReservation={createBooking}
          addVehicle={addVehicle}
          newClient={addClient}
          userName={currentUser.name}
        />
      );
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <div>
            <b>DriveNode</b>
            <small>FLEET MANAGER</small>
          </div>
        </div>
        <nav>
          {nav.map((x, i) => (
            <Button
              key={x}
              className={page === x && !v ? "active" : ""}
              onClick={() => go(x)}
            >
              <span className="nav-icon">
                <NavigationIcon index={i} />
              </span>
              {x}
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Button
            className={page === "Podešavanja" ? "active" : ""}
            onClick={() => go("Podešavanja")}
          >
            <span className="nav-icon">
              <SettingsIcon aria-hidden="true" />
            </span>
            Podešavanja
          </Button>
          <div className="profile">
            <span>{currentUser.initials}</span>
            <div>
              <b>{currentUser.name}</b>
              <small>{currentUser.role}</small>
            </div>
            <Button className="profile-menu" onClick={logout} aria-label="Odjavi se">
              <MoreIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
      </aside>
      <section className="content">
        <header>
          <GlobalSearch
            openVehicle={openVehicle}
            openBooking={openReservation}
            go={go}
          />
          <div className="head-actions">
            <Button
              onClick={() => go("Servisi i registracije")}
              aria-label="Otvori obaveštenja"
            >
              <BellIcon aria-hidden="true" />
            </Button>
            <Button
              variant="primary"
              className="new-reservation-button"
              onClick={createBooking}
            >
              <AddIcon className="button-icon" aria-hidden="true" />
              Nova rezervacija
            </Button>
          </div>
        </header>
        <div className="page">{c}</div>
      </section>
      {b && <BookingPanel b={b} close={closeReservation} saved={statusSaved} />}{" "}
      {newBooking && (
        <NewReservationModal
          close={() => setNewBooking(false)}
          saved={bookingSaved}
        />
      )}
    </main>
  );
}

export default function Home() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
