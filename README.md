# PartyShow

Gjenbrukbar festapp med utskiftbare temaer, animert storskjerm og eget kontrollpanel. Admin velger hvilken **modus** storskjermen viser, og kan bytte fritt mellom dem uten å miste progresjon.

- **Storskjerm:** `/` – det deltakerne ser
- **Kontrollpanel:** `/admin` – velger modus og styrer storskjermen
- **Mobil:** `/join` – gjestene registrerer seg, nominerer og stemmer (QR-kode på storskjermen)

Node 24+ · React + TypeScript + Vite · Motion · Socket.io · SQLite (`node:sqlite`)

## Kom i gang

```sh
npm install
cp .env.example .env   # sett ADMIN_PIN, og OPENAI_API_KEY for AI-bilder i kåringen
npm run dev            # Vite på :5173, server på :3001
```

Åpne `http://localhost:5173/` på storskjermen og `http://localhost:5173/admin` på laptop/mobil (samme nett). QR-koden peker automatisk på maskinens LAN-adresse; sett `PUBLIC_URL` hvis mobilene skal bruke en annen adresse.

### På festen

```sh
npm run build
npm start              # alt på én port (PORT, standard 3001)
```

## Moduser

Øverst i kontrollpanelet velges hva storskjermen viser: **Logo**, **Gameshow** eller **Kåring**. Før første valg vises PartyShow-logoen. Valget og all tilstand i hver modus lagres, så man kan hoppe fram og tilbake – og en omstart fortsetter der man slapp.

### Gameshow

1. **Lobby** – registrer lag i admin («Lag»); hvert lag dukker opp som et animert gresskar.
2. **Start neste spill** – viser tittel, beskrivelse, bilde/video og evt. timer.
3. Legg inn poeng underveis – de er skjult for storskjermen.
4. **Vis runderesultater** – poengene for spillet avsløres.
5. **Vis sammenlagt** – totalstilling med animert opp/ned-bevegelse.
6. Gjenta fra 2.

### Kåring

1. **Registrering** – gjestene skanner QR-koden og registrerer seg med navn og bilde (én gang per mobil). Bildet sendes til OpenAI, som fjerner bakgrunnen og gir personen en kul positur; originalbildet vises til AI-bildet er klart (eller hvis det feiler / `OPENAI_API_KEY` mangler).
2. **Nominering** – admin oppretter nominasjoner («Nominasjoner») og starter nomineringen. Da stenger registreringen. Alle nominerer én person per nominasjon fra mobilen (ikke seg selv); storskjermen viser hvor mange som er ferdige.
3. **Kåring** – admin går gjennom én nominasjon om gangen. Topp 3 (flere ved likhet) vises, alle stemmer på mobilen, og admin avslører vinneren.
4. **Alle vinnerne** – oversikt over vinnerne i alle nominasjonene.

All tilstand lagres i `data/partyshow.db`. Opplastede filer og bilder ligger i `data/uploads/`.

## Struktur

- `shared/` – typer og ren logikk (poeng, finalister/vinnere) som brukes av både server og klient
- `server/` – Express + Socket.io; `app.ts` samler modusene, `gameshow.ts` og `awards.ts` er tilstandsmaskinene, `imageAi.ts` snakker med OpenAI
- `src/screen/` – storskjerm-visningene (`awards/` for kåringen)
- `src/admin/` – kontrollpanelet
- `src/participant/` – mobilsiden (`/join`)
- `src/themes/` – temaer (`halloween`, `default`); et tema leverer avatar, bakgrunn og CSS-variabler

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm test` · `npm run typecheck`
