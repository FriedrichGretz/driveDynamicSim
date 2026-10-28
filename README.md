# AEB-Lehrsimulation

## Voraussetzung
Eine aktuelle Node.js Version ist installiert. Für Windows wird [Volta](https://volta.sh/) zum Installieren von Node.js empfohlen.
## Bedienung
Start: `npm install`, dann `npm run dev`, die angezeigte Adresse im Browser öffnen.
Live editieren: nur `src/aeb.ts` (TTC, BTN, Stufenlogik, Arbitrierung). Speichern genügt (Hot Reload).
`src/sim.ts` = Fahrzeug-/Szenariokern, `src/main.ts` = Darstellung und Bedienung.
Szenarien: CCRs, CCRm, CCRb (Euro NCAP AEB Car-to-Car); alle Werte per Slider änderbar.
Ego-Trajektorie: konstante Geschwindigkeit plus optionale Rampe (`aRamp`, `tRamp`); Erweiterung in `vSet()` (sim.ts).
