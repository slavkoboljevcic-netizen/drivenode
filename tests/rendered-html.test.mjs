import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  // This render only needs startup schema initialization, not application data.
  // Keep D1 isolated from the developer's local and production databases.
  const DB = {
    prepare(sql) {
      return {
        sql,
        async all() {
          return { results: /^PRAGMA table_info/.test(sql) ? [{ name: "vehicle_id" }] : [] };
        },
        async run() {
          return { success: true };
        },
      };
    },
    async batch(queries) {
      assert.ok(queries.length > 0);
      assert.ok(
        queries.every(({ sql }) =>
          /^(CREATE (TABLE|(?:UNIQUE )?INDEX|TRIGGER) IF NOT EXISTS|UPDATE |DROP TRIGGER IF EXISTS)/.test(sql),
        ),
      );
      return queries.map(() => ({ success: true, results: [] }));
    },
  };

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      DB,
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the DriveNode shell metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="sr">/i);
  assert.match(html, /DriveNode Fleet Manager/i);
  assert.match(html, /Pametnije upravljanje rent-a-car flotom u Srbiji\./i);
  assert.match(html, /<link rel="icon" href="\/favicon\.svg">/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/i);
});

test("shared helpers preserve input and display boundaries", async () => {
  const source = await readFile(new URL("../app/lib.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  });
  const {
    clean,
    calculateFleetAvailability,
    calculateVehicleStatuses,
    displayPlate,
    formatDate,
    bookingDate,
    reservationBlocksVehicle,
    reservationPeriodsOverlap,
    statusTone,
    vehicleIsAvailableInPeriod,
    vehicleMatchesSearch,
  } =
    await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

  assert.equal(clean("  Novi Sad \n"), "Novi Sad");
  for (const value of [null, undefined, 0, false, {}, []]) assert.equal(clean(value), "");
  assert.equal(displayPlate("BG-123-AB", true), "BG-123-AB");
  assert.equal(displayPlate("BG-123-AB", false), "Nema tablica");
  assert.equal(displayPlate("DNFM-NEREG-TEST"), "Nema tablica");
  assert.equal(formatDate("nije datum"), "nije datum");
  assert.match(formatDate("2026-10-12T14:35:00"), / • 14:35$/);
  assert.match(bookingDate("2026-10-12T14:35:00"), /^12\. 10\. 2026\. • 14:35$/);
  assert.equal(reservationBlocksVehicle("Potvrđena"), true);
  assert.equal(reservationBlocksVehicle("Aktivna"), true);
  assert.equal(reservationBlocksVehicle("Završena"), false);
  assert.equal(reservationBlocksVehicle("Otkazana"), false);
  const calculatedStatuses = calculateVehicleStatuses(
    [
      { id: 1, name: "Servis", plate: "T-1" },
      { id: 2, name: "Van upotrebe", plate: "T-2", outOfService: true },
      { id: 3, name: "Arhiva", plate: "T-3", archivedAt: "2026-11-22" },
      { id: 4, name: "Rezervisano", plate: "T-4" },
      { id: 5, name: "Iznajmljeno", plate: "T-5" },
      { id: 6, name: "Dostupno", plate: "T-6" },
      { id: 7, name: "Isti model", plate: "T-7" },
      { id: 8, name: "Isti model", plate: "T-8" },
    ],
    [
      { vehicleId: 1, vehicle: "Servis", status: "Aktivna" },
      { vehicleId: 2, vehicle: "Van upotrebe", status: "Aktivna" },
      { vehicleId: 3, vehicle: "Arhiva", status: "Aktivna" },
      { vehicleId: 4, vehicle: "Rezervisano", status: "Potvrđena" },
      { vehicleId: 5, vehicle: "Iznajmljeno", status: "Povrat danas" },
      { vehicleId: null, vehicle: "Isti model", status: "Potvrđena" },
    ],
    [{ vehicleId: 1, plate: "T-1", status: "U toku" }],
  );
  assert.deepEqual(
    Array.from(calculatedStatuses.values()),
    [
      "Na servisu",
      "Van upotrebe",
      "Arhivirano",
      "Rezervisano",
      "Iznajmljeno",
      "Dostupno",
      "Dostupno",
      "Dostupno",
    ],
  );
  const fleetAvailability = calculateFleetAvailability(
    [
      { id: 1, name: "Rezervacija", plate: "A-1", registered: true, registrationExpiresAt: "2027-12-31" },
      { id: 2, name: "Servis", plate: "A-2", registered: true, registrationExpiresAt: "2027-12-31" },
      { id: 3, name: "Šteta", plate: "A-3", registered: true, registrationExpiresAt: "2027-12-31" },
      { id: 4, name: "Neregistrovano", plate: "A-4", registered: false },
      { id: 5, name: "Istek", plate: "A-5", registered: true, registrationExpiresAt: "2026-12-10" },
      { id: 6, name: "Arhiva", plate: "A-6", registered: true, registrationExpiresAt: "2027-12-31", archivedAt: "2026-01-01" },
      { id: 7, name: "Zabrana", plate: "A-7", registered: true, registrationExpiresAt: "2027-12-31", outOfService: true },
      { id: 8, name: "Blokada", plate: "A-8", registered: true, registrationExpiresAt: "2027-12-31" },
      { id: 9, name: "Slobodno", plate: "A-9", registered: true, registrationExpiresAt: "2027-12-31" },
      { id: 10, name: "Nepoznata registracija", plate: "A-10", registered: true },
    ],
    [
      { vehicleId: 1, vehicle: "Rezervacija", startsAt: "2026-12-10T10:00", endsAt: "2026-12-11T10:00", status: "Potvrđena", code: "R-1" },
    ],
    [
      { vehicleId: 2, plate: "A-2", dueDate: "2026-12-11", endsAt: "2026-12-12", status: "Planirano" },
      { vehicleId: 9, plate: "A-9", dueDate: "2027-01-01", endsAt: "2027-01-01", status: "Planirano" },
    ],
    [{ vehicleId: 3, plate: "A-3", status: "U obradi" }],
    [{ vehicleId: 8, startsAt: "2026-12-10T12:00", endsAt: "2026-12-11T12:00", status: "Aktivna" }],
    "2026-12-10T09:00",
    "2026-12-12T09:00",
  );
  assert.deepEqual(
    Array.from(fleetAvailability, ([vehicleId, result]) => [
      vehicleId,
      result.available,
      result.reasons.map((reason) => reason.code),
    ]),
    [
      [1, false, ["RESERVATION_OVERLAP"]],
      [2, false, ["SERVICE_OVERLAP"]],
      [3, false, ["ACTIVE_DAMAGE"]],
      [4, false, ["UNREGISTERED"]],
      [5, false, ["REGISTRATION_EXPIRES"]],
      [6, false, ["ARCHIVED"]],
      [7, false, ["OUT_OF_SERVICE"]],
      [8, false, ["MANUAL_BLOCK"]],
      [9, true, []],
      [10, false, ["REGISTRATION_UNKNOWN"]],
    ],
  );
  assert.equal(
    reservationPeriodsOverlap(
      "2026-11-01T10:00",
      "2026-11-05T10:00",
      "2026-11-04T10:00",
      "2026-11-06T10:00",
    ),
    true,
  );
  assert.equal(
    reservationPeriodsOverlap(
      "2026-11-01T10:00",
      "2026-11-05T10:00",
      "2026-11-05T10:00",
      "2026-11-06T10:00",
    ),
    false,
  );
  for (const [status, expected] of [
    ["Dostupno", "green"], ["Aktivna", "blue"], ["U toku", "blue"],
    ["Na servisu", "red"], ["Van upotrebe", "red"], ["Uskoro", "red"], ["Potvrđena", "violet"],
    ["Rezervisano", "violet"], ["Otkazana", "amber"], [undefined, "amber"],
  ]) assert.equal(statusTone(status), expected);

  const vehicle = {
    name: "Škoda Kamiq",
    plate: "BG-2782-JK",
    year: 2026,
    location: "Beograd • Aerodrom",
    status: "Dostupno",
    vin: "TMB123ABC456",
    fuel: "Dizel",
    transmission: "Automatski",
    registered: true,
  };
  for (const query of [
    "skoda",
    "BG 2782 JK",
    "dizel automatik",
    "2026 Beograd",
    "TMB123",
    "registrovano",
    "slobodno",
  ]) assert.equal(vehicleMatchesSearch(vehicle, query), true, query);
  assert.equal(vehicleMatchesSearch(vehicle, "benzin"), false);
  assert.equal(vehicleMatchesSearch(vehicle, "dizel Novi Sad"), false);
  assert.equal(
    vehicleMatchesSearch(
      {
        ...vehicle,
        plate: "DNFM-NEREG-22",
        fuel: "Benzin",
        transmission: "Manuelni",
        registered: false,
      },
      "manuelac benzin bez tablica",
    ),
    true,
  );

  const reservationWindows = [
    {
      vehicleId: 7,
      startsAt: "2026-11-10T10:00",
      endsAt: "2026-11-15T10:00",
      status: "Potvrđena",
    },
    {
      vehicleId: 8,
      startsAt: "2026-11-20T10:00",
      endsAt: "2026-11-22T10:00",
      status: "Aktivna",
    },
  ];
  assert.equal(
    vehicleIsAvailableInPeriod(
      7,
      reservationWindows,
      "2026-11-12T10:00",
      "2026-11-16T10:00",
    ),
    false,
  );
  assert.equal(
    vehicleIsAvailableInPeriod(
      7,
      reservationWindows,
      "2026-11-15T10:00",
      "2026-11-18T10:00",
    ),
    true,
  );
  assert.equal(
    vehicleIsAvailableInPeriod(
      9,
      reservationWindows,
      "2026-11-12T10:00",
      "2026-11-16T10:00",
    ),
    true,
  );
});

test("completed reservations create revenue on the actual completion day", async () => {
  const source = await readFile(
    new URL("../app/api/financial-records.ts", import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  });
  const { buildFinancialRecords, businessDateKey, reservationRevenueDate } =
    await import(
      `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
    );

  const completedAt = "2026-11-22T23:30:00.000Z";
  const reservation = {
    id: 17,
    code: "DN-TEST-17",
    vehicleId: 7,
    clientId: 3,
    client: "Test Klijent",
    vehicle: "Test Vozilo",
    startsAt: "2026-10-01T10:00",
    endsAt: "2026-10-05T10:00",
    location: "Beograd • Centar",
    price: 42000,
    status: "Završena",
    completedAt,
    createdAt: "2026-09-20T10:00:00.000Z",
  };
  const records = buildFinancialRecords({
    deleted: [],
    manual: [],
    reservationRows: [reservation],
    services: [],
    vehicleRows: [
      {
        id: 7,
        name: "Test Vozilo",
        plate: "BG-TEST-17",
        location: "Beograd • Centar",
      },
    ],
  });

  assert.equal(businessDateKey(new Date(completedAt)), "2026-11-23");
  assert.equal(reservationRevenueDate(reservation), "2026-11-23");
  assert.equal(records.length, 1);
  assert.deepEqual(
    {
      reference: records[0].reference,
      kind: records[0].kind,
      amount: records[0].amount,
      date: records[0].date,
      status: records[0].status,
    },
    {
      reference: "AUTO-RES-DN-TEST-17",
      kind: "Prihod",
      amount: 42000,
      date: "2026-11-23",
      status: "Plaćeno",
    },
  );
});

test("keeps app structure, local Montserrat font and npm package setup", async () => {
  const [layout, page, globals, packageJson, components, styles] =
    await Promise.all([
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/styles/globals.css", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readdir(new URL("../app/components/", import.meta.url)),
      readdir(new URL("../app/styles/", import.meta.url)),
    ]);

  assert.match(layout, /import "\.\/styles\/globals\.css"/);
  assert.doesNotMatch(layout, /next\/font|Geist|font-geist/);
  assert.match(page, /from "\.\/components\/DashboardLive"/);
  assert.match(page, /from "\.\/components\/GlobalSearch"/);
  assert.match(page, /from "\.\/components\/VehicleOperationsCrud"/);
  assert.match(globals, /font-family:\s*"Montserrat"/);
  assert.match(globals, /url\("\/Montserrat\.ttf"\)/);
  assert.match(packageJson, /"name":\s*"drivenode"/);
  assert.match(packageJson, /"react-icons":\s*"\^5\.7\.0"/);
  assert.ok(components.includes("ui.tsx"));
  assert.ok(styles.includes("globals.css"));

  await access(new URL("../public/Montserrat.ttf", import.meta.url));
  await assert.rejects(access(new URL("pnpm-lock.yaml", projectRoot)));
  await assert.rejects(access(new URL("pnpm-workspace.yaml", projectRoot)));
  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
});
