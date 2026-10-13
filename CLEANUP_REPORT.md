# DNFM — izveštaj o konzervativnom čišćenju

Datum: 12. oktobar 2026.

Pregledani su izvori aplikacije, komponente, svih 12 API modula, CSS,
javni asset-i, database schema, migracije i njihovi metapodaci, primeri,
testovi, konfiguracije, skripte i direktne/posredne zavisnosti.
Generisani build izlazi i node_modules nisu tretirani kao kod za brisanje.

## OBRISANI FAJLOVI

| Fajl | Razlog |
| --- | --- |
| `public/drivenode-mark.svg` | Napuštena vektorska verzija logotipa iz prethodne izmene. Aplikacija koristi `drivenode-logo.png`. Nema reference na SVG u izvorima, CSS-u, konfiguracijama, testovima, dokumentaciji ili skriptama. |
| `public/window.svg` | Starter ikonica bez reference u projektu. Ne koristi je ni metadata/favikon niti CSS. |
| `app/styles/global-search.css` | Dva aktivna pravila preneta su u postojeći blok stilova pretrage u `globals.css`; uklonjen je stari CSS import. |

Pre brisanja proverene su reference kroz projekat, statički i dinamički
import-i, framework ulazne tačke i rute, CSS URL-ovi, konfiguracije,
skripte, testovi, dokumentacija i pristup fajlovima kroz kod.
Nije pronađeno posredno ni environment-dependent korišćenje obrisanih asset-a.

## SPOJENI FAJLOVI

- `global-search.css` → odeljak pretrage u `app/styles/globals.css`.
  Sačuvana su oba selektora i sve njihove deklaracije.
- Ponavljane pomoćne funkcije iz različitih modula objedinjene su u
  `app/lib.ts` (37 linija, bez zavisnosti).
- Dve identične komponente statusne oznake objedinjene su kao `StatusBadge`
  u postojećem `app/components/ui.tsx`.

Obrisana su tri fajla i dodat jedan izvorni fajl: dva manje u codebase-u.
Ovaj izveštaj je dodatni dokument. Ostali mali fajlovi zadržani su jer
njihova modularnost ima smisla; nisu spajani samo radi manjeg broja fajlova.

## UKLONJENI DUPLIKATI

- Sedam lokalnih implementacija `clean` zamenjeno je jednom zajedničkom
  funkcijom. Validacija, odgovori, statusni kodovi i database operacije API-ja
  ostali su isti.
- Dve implementacije `displayPlate` zamenjene su jednom.
- Dve implementacije `formatDate` zamenjene su jednom; neispravan datum
  i dalje vraća originalni ulaz.
- Dve implementacije `bookingDate` zamenjene su jednom. Pretraga zadržava
  eksplicitnu konverziju nepoznatog ulaza u string.
- Dve identične klasifikacije statusa (`tone` / `badgeTone`) i prikazi
  oznake (`Badge` / `StatusBadge`) dele zajednički kod.
  Drugačija klasifikacija Dashboarda ostala je posebna.
- Uklonjen je raniji duplikat `.search { position: relative; }`.
- Uklonjena je deklaracija `.doc-row span { float: right; }` koju je
  kasnije bezuslovno prekrivao `float: none` za isti selektor.

## UKLONJENI UNUSED CODE

- Neiskorišćen import `FiBell` i izvoz `BellIcon` iz `icons.tsx`.
- Stari CSS za `.login-metrics`, `.calendar-tools`, `.line-chart`,
  `.dot` i `.grid-lines`, uključujući njihove pomoćne i responsive selektore.
  Iz grupisanog pravila uklonjen je samo `.calendar-tools button`;
  `.toolbar button` je sačuvan.
- Neiskorišćena promenljiva tamne teme `--theme-accent-4b7df433`.
- Stari zakomentarisani primer `imageConfig` u Worker-u. Aktivni endpoint
  optimizacije slika ostao je neizmenjen.

Lint i dodatna TypeScript analiza `noUnusedLocals` / `noUnusedParameters`
nisu pronašli druge nekorišćene lokalne import-e, promenljive ili funkcije.
Nije potvrđena nijedna dodatna nekorišćena komponenta, klasa ili tip za brisanje.

## UKLONJENI DEPENDENCIES

Nijedan. Svi direktni paketi imaju ulogu u aplikaciji, TypeScript/lint
alatima, migracijama, CSS obradi ili vinext/Cloudflare buildu.
`@vitejs/plugin-react`, `@vitejs/plugin-rsc` i `react-server-dom-webpack`
zadržani su zbog posrednog korišćenja kroz vinext.
Tailwind i njegov PostCSS plugin zadržani su zbog CSS import-a i konfiguracije.
`package.json` i `package-lock.json` ostali su neizmenjeni.

## SUMNJIVI FAJLOVI — ZADRŽANI

- `examples/d1/app/api/notes/route.ts` i `examples/d1/db/schema.ts`:
  nisu aktivne DNFM rute, ali README dokumentuje opcionu upotrebu primera.
- `next.config.ts` i `next-env.d.ts`: framework konfiguracija i TypeScript
  ulaz; izostanak eksplicitnog application import-a nije dokaz nekorišćenja.
- `DNFM-Beta.code-workspace`: razvojna konfiguracija koju editor koristi
  van import grafa aplikacije.
- Drizzle migracije i snapshot-i: deploy i generator ih koriste posredno.

Zadržan je i `.custom-input--hidden`: klasa se generiše dinamički iz
`type` prop-a komponente `CustomInput`.
`generateMetadata`, `RootLayout` i `ErrorPage` sačuvani su kao framework
ulazne tačke. Logo PNG, OG slika, favikon i Montserrat imaju aktivne reference.

## PROVERE

| Provera | Pre čišćenja | Posle čišćenja |
| --- | --- | --- |
| `npm run lint` | Prolazi | Prolazi |
| Production build (`npm run build`, kroz `npm run test`) | Prolazi | Prolazi |
| Postojeći testovi | 1 prolazi, 1 pada zbog nedostajućeg D1 test binding-a | Oba prolaze |
| Test granica zajedničkih helper-a | Nije postojao | Prolazi |
| `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` | 7 postojećih grešaka | Istih 7 grešaka; bez novih |
| `git diff --check` | — | Prolazi |

Test renderovanja dobio je izolovan D1 mock za startup kreiranje schema-e;
test ne pristupa lokalnoj ni produkcionoj bazi. Dodat je test obrade
praznih/neispravnih ulaza, neregistrovanih vozila, formata datuma i statusa.

Dodatno poređenje pre/posle potvrđuje iste efektivne CSS deklaracije svih
preostalih selektora i iste rezultate zajedničkih helper-a na reprezentativnim
normalnim i graničnim ulazima. Rute, autentifikacija, database kod/migracije,
konfiguracije i zavisnosti nisu menjani. API izmene su izdvajanje iste `clean`
funkcije u zajednički modul.

Potpunu interaktivnu regresiju svih korisničkih tokova i stvarnih podataka
ove automatizovane provere ne pokrivaju.

## DODATNE PREPORUKE

- Posebno rešiti postojeće TypeScript greške: nedostaju Cloudflare runtime
  deklaracije (`cloudflare:workers`, `R2Bucket`, `Fetcher`, `D1Database`),
  Worker callback zbog toga ima implicitni `any`, a tip vozila pretrage nema
  `registered` koji zahteva glavni prikaz. Nisu menjani u ovom čišćenju.
- `app/page.tsx` ima preko 5.000 linija. Izdvajanje modula može poboljšati
  održavanje, ali bi povećalo broj fajlova i zahtevalo posebnu regresionu proveru.
- README i opcionu starter dokumentaciju ažurirati u zasebnoj izmeni;
  nisu obrisani samo zato što trenutno nisu deo runtime-a.
- Proširiti integracione testove glavnih korisničkih tokova uz izolovane
  D1/R2 podatke pre većeg preuređivanja API-ja ili UI modula.
