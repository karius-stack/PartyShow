# PartyShow

Gjenbrukbar gameshow-app med utskiftbare temaer, animert storskjerm og eget kontrollpanel.

- **Storskjerm:** `/` – det deltakerne ser
- **Kontrollpanel:** `/admin` – styrer storskjermen (lag, spill, poeng, timer)

Node 24+ · React + TypeScript + Vite · Motion · Socket.io · SQLite (`node:sqlite`)

## Kom i gang

```sh
npm install
cp .env.example .env   # sett ADMIN_PIN
npm run dev            # Vite på :5173, server på :3001
```

Åpne `http://localhost:5173/` på storskjermen og `http://localhost:5173/admin` på laptop/mobil (samme nett).

### På festen

```sh
npm run build
npm start              # alt på én port (PORT, standard 3001)
```

## Flyt

1. **Lobby** – registrer lag i admin («Lag»); hvert lag dukker opp som et animert gresskar.
2. **Start neste spill** – viser tittel, beskrivelse, bilde/video og evt. timer.
3. Legg inn poeng underveis – de er skjult for storskjermen.
4. **Vis runderesultater** – poengene for spillet avsløres.
5. **Vis sammenlagt** – totalstilling med animert opp/ned-bevegelse.
6. Gjenta fra 2.

All tilstand lagres i `data/partyshow.db`, så en omstart fortsetter der man slapp. Opplastede filer ligger i `data/uploads/`.

## Struktur

- `shared/` – typer og poengberegning som brukes av både server og klient
- `server/` – Express + Socket.io, tilstandsmaskin (`show.ts`) og database (`db.ts`)
- `src/screen/` – storskjerm-visningene
- `src/admin/` – kontrollpanelet
- `src/themes/` – temaer (`halloween`, `default`); et tema leverer avatar, bakgrunn og CSS-variabler

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm test` · `npm run typecheck`
