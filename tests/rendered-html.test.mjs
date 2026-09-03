import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
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

test("keeps app structure, local Inter font and npm package setup", async () => {
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
  assert.match(globals, /font-family:\s*"Inter"/);
  assert.match(globals, /url\("\/Inter\.ttf"\)/);
  assert.match(packageJson, /"name":\s*"drivenode"/);
  assert.match(packageJson, /"react-icons":\s*"\^5\.7\.0"/);
  assert.ok(components.includes("ui.tsx"));
  assert.ok(styles.includes("globals.css"));

  await access(new URL("../public/Inter.ttf", import.meta.url));
  await assert.rejects(access(new URL("pnpm-lock.yaml", projectRoot)));
  await assert.rejects(access(new URL("pnpm-workspace.yaml", projectRoot)));
  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
});
