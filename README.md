# DNFM — Drive Node Fleet Management

DNFM je aplikacija za upravljanje rent-a-car flotom. Obuhvata vozila i njihove
profile, rezervacije, klijente, servise, registracije, finansije, dokumentaciju,
izveštaje, korisnike i obaveštenja. Aplikacija koristi vinext, React, Cloudflare
Workers, D1, R2 i Drizzle ORM.

## Preduslovi

- Node.js `>=22.13.0`
- instalirane zavisnosti iz `package-lock.json`

## Lokalni razvoj

```bash
npm install
npm run dev
```

Razvojni server je dostupan na `http://localhost:3000`.

## Provere

```bash
npm run lint
npm test
```

`npm test` pokreće produkcioni build i postojeće Node testove.

## Baza i skladište

- D1 šema je definisana u `db/schema.ts`.
- SQL migracije se nalaze u `drizzle/`.
- `npm run db:generate` generiše novu Drizzle migraciju nakon promene šeme.
- D1 i R2 binding nazivi definisani su u `hosting.config.json`.
- Worker ulazna tačka i bezbedna runtime inicijalizacija baze nalaze se u
  `worker/index.ts`.

Ne menjati postojeće migracije nakon što su primenjene. Za svaku novu promenu
šeme dodati novu migraciju.
