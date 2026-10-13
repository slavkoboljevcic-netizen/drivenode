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
  const statements = [];
  const DB = {
    prepare(sql) {
      statements.push(sql);
      return { sql };
    },
    async batch(queries) {
      assert.ok(queries.length > 0);
      assert.equal(queries.length, statements.length);
      assert.ok(statements.every((sql) => /^CREATE (TABLE|UNIQUE INDEX) IF NOT EXISTS/.test(sql)));
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
  const { clean, displayPlate, formatDate, bookingDate, statusTone } =
    await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

  assert.equal(clean("  Novi Sad \n"), "Novi Sad");
  for (const value of [null, undefined, 0, false, {}, []]) assert.equal(clean(value), "");
  assert.equal(displayPlate("BG-123-AB", true), "BG-123-AB");
  assert.equal(displayPlate("BG-123-AB", false), "Nema tablica");
  assert.equal(displayPlate("DNFM-NEREG-TEST"), "Nema tablica");
  assert.equal(formatDate("nije datum"), "nije datum");
  assert.match(formatDate("2026-10-12T14:35:00"), / • 14:35$/);
  assert.match(bookingDate("2026-10-12T14:35:00"), /^12\. 10\. 2026\. • 14:35$/);
  for (const [status, expected] of [
    ["Dostupno", "green"], ["Aktivna", "blue"], ["U toku", "blue"],
    ["Na servisu", "red"], ["Uskoro", "red"], ["Potvrđena", "violet"],
    ["Rezervisano", "violet"], ["Otkazana", "amber"], [undefined, "amber"],
  ]) assert.equal(statusTone(status), expected);
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
