# Projektkontext: AEB-Lehrsimulation (TTC, BTN, Arbitrierung)

Stand: 04.10.2026. Diese Datei fasst die Planung zusammen, damit sie ohne den ursprünglichen Chat weiterverwendet werden kann. Bisher ist **noch kein Code geschrieben**.

## 1. Ziel

Bachelor-Studierenden sollen **Time-to-Collision (TTC)** und **Brake Threat Number (BTN)** sowie deren **Arbitrierung** anschaulich erklärt werden. Dazu läuft eine lokale, flüssige 1D-Simulation (Bewegung entlang einer Geraden) mit **live wirksamer AEB-Steuerung**. Der Dozent ändert den AEB-Code in VS Code und sieht das neue Verhalten sofort in der Simulation. Die Darstellung soll ansprechend sein.

Zielgruppe: Bachelor. Python und TypeScript werden als lesbar vorausgesetzt.

## 2. Bestandsaufnahme

Es gibt nichts Fertiges, das "1D + AEB-Logik live sichtbar + didaktisch schön" abdeckt. CARLA, esmini, SUMO, CommonRoad und highway-env sind für diesen Zweck überdimensioniert bzw. falsch ausgerichtet. Kommerzielle Tools (CarMaker, CANoe, Simulink) sind nicht frei. **Entscheidung: Selbstbau.** Die 1D-Physik ist trivial, der Aufwand liegt in Darstellung und Didaktik.

## 3. Szenarien (Euro NCAP AEB Car-to-Car)

| Szenario | Bedeutung | Startwerte (nur Voreinstellung, vor Nutzung gegen aktuelle PDF prüfen) |
|---|---|---|
| CCRs | Car-to-Car Rear Stationary: Ziel steht | VUT ca. 10–50 km/h (City), 30–80 km/h (Inter-Urban) |
| CCRm | Car-to-Car Rear Moving: Ziel fährt konstant langsamer | VUT ca. 30–80 km/h, Ziel ca. 20 km/h |
| CCRb | Car-to-Car Rear Braking: Ziel bremst | beide ca. 50 km/h, Abstand ca. 12 m oder 40 m, Zielverzögerung ca. 2 oder 6 m/s² |

Zeitbezug laut Protokollen (2019–2021): T0 ist bei CCRs/CCRm der Moment mit TTC = 4 s, bei CCRb der Beginn der Zielverzögerung. VUT = Vehicle under test (Ego), GVT = Global Vehicle Target (Ziel).

**Achtung:** Die Tabellenwerte stammen teils aus dem Gedächtnis und sind nicht belegt. Das MathWorks-Testpaket führt inzwischen Protokolljahre 2026–2028, die aktuelle Fassung wurde nicht eingesehen. Alle Parameter sind in der Simulation frei einstellbar.

**Quellen:**
- Euro NCAP, *Test Protocol – AEB Car-to-Car systems* (u. a. v3.0.1, v3.0.2): https://cdn.euroncap.com/media/56143/euro-ncap-aeb-c2c-test-protocol-v302.pdf und https://cdn.euroncap.com/media/43377/euro-ncap-aeb-c2c-test-protocol-v301.pdf. Parametertabellen in "Test Procedure → Test Scenarios".
- Euro NCAP, *Assessment Protocol – Safety Assist – Collision Avoidance* (v1.0.4): https://cdn.euroncap.com/media/79866/euro-ncap-assessment-protocol-sa-collision-avoidance-v104.pdf
- Euro NCAP, *TB025 – Global Vehicle Target specification*
- ESV-Paper zur Einführung: https://cdn.euroncap.com/media/1373/23esv-000269-0-5ef76a64-bea5-42c8-9752-e5ce54ed8e83.pdf
- Für Threat Numbers: Hillenbrand, Spieker, Kroschel, *A Multilevel Collision Mitigation Approach*, IEEE Trans. ITS, 2006 (aus dem Gedächtnis, Angabe noch prüfen).

## 4. Technische Entscheidung

**Empfehlung: TypeScript im Browser mit Vite** (Start mit `npm run dev` im VS-Code-Terminal, Anzeige im Browser oder VS-Code-Simple-Browser).

Gründe: Hot Module Replacement (Speichern von `aeb.ts` lädt die Logik neu, der Szenariozustand bleibt erhalten), beste Optik per Canvas/SVG, Slider und Zeitsteuerung einfach, eine Sprache für alles.

Alternative nur bei Bedarf: Python mit pygame, pyqtgraph und Datei-Reload per `importlib.reload`. Fertig im Sinne "C/C++/Rust für Metriken" wurde verworfen, weil es für das Verständnis mehr Reibung als Nutzen bringt.

## 5. Architektur (drei getrennte Schichten)

1. **Zeigecode (einzige Datei, die Studierende sehen), z. B. `aeb.ts`:**
   - `computeTTC(...)`: TTC = d / v_rel, nur für v_rel > 0, sonst unendlich.
   - `computeBTN(...)`: a_req = v_rel² / (2d), BTN = a_req / a_max. BTN ≥ 1 bedeutet, die Kollision ist physikalisch nicht mehr vermeidbar. Für ein bremsendes Ziel gilt etwa a_req = v_rel² / (2d) + a_Ziel, solange das Ziel noch rollt. Der Sonderfall "Ziel steht vor dem Aufprall" bleibt als Studierendenaufgabe offen.
   - Triggerlogik: Schwellen für Stufen (Warnung, Teilbremsung, Vollbremsung), Hysterese gegen Flattern.
   - `arbitrate(...)`: bildet aus den Einzelmetriken und der **vom Fahrer bzw. von der Trajektorie angeforderten Beschleunigung** das Gesamtergebnis für die Bremsenregelung, inklusive Warnungen. Basisregel: Die stärkere Verzögerung gewinnt (niedrigere Sollbeschleunigung).
2. **Simulationskern (verdeckt):** Längsdynamik, maximale Verzögerung (abhängig vom Reibwert), Bremsverzug und Aktuatordynamik, Jerk-Limit, optional Sensorrauschen und Sensorlatenz, fester Simulationsschritt, Ego-Trajektorie, Zieltrajektorie.
3. **Visualisierung (verdeckt):** Seitenansicht der Straße, zwei Fahrzeuge, Bremslichter, Abstandsanzeige, Live-Plots, farbige Anzeige der aktiven AEB-Stufe.

**Schnittstelle der AEB-Funktion (Entwurf):**
- Eingang: Ego-Geschwindigkeit, Zielgeschwindigkeit, Abstand, geschätzte Zielbeschleunigung, Fahrer-Sollbeschleunigung, Zeit, interner Zustand des Vorzyklus.
- Ausgang: Sollbeschleunigung an die Bremsenregelung, Warnstufe, Debugwerte (TTC, BTN, aktive Stufe), die die Visualisierung einblendet.

## 6. Festgelegte Anforderungen

- Ego fährt eine **vorgegebene Geschwindigkeitstrajektorie** (konstant, Rampe oder Stützpunkte). Die Fahrer-Sollbeschleunigung folgt daraus; AEB unterbricht und verändert sie. Kein Fahrermodell mit Reaktionszeit.
- Ziel ebenfalls frei per Trajektorie wählbar, Euro-NCAP-Werte als Voreinstellung.
- Alle drei Szenarien (CCRs, CCRm, CCRb) wählbar und individuell parametrierbar.
- Realismusparameter einstellbar: Bremsverzug, Jerk-Limit, maximale Verzögerung/Reibwert, Sensorrauschen (per Schalter, Standard aus).
- Interaktiv: Slider für Startwerte, Pause, Zeitlupe, Neustart, Szenarioauswahl.
- **Geisterfahrzeug**: zusätzlich wird der Ego-Verlauf **ohne AEB** als Geist angezeigt, damit der Nutzen des Eingriffs sichtbar wird.
- Live-Plots: Geschwindigkeiten, Abstand, TTC, BTN, Sollbeschleunigung (Fahrer, AEB, Ergebnis).
- Zeitbasis (vorläufig): Simulationsschritt 10 ms, AEB-Zyklus z. B. 20 ms wie in einem Steuergerät.
- Gezeigt wird nur der AEB-Code (Metriken, Trigger, Arbitrierung); der Rest der Simulation bleibt verdeckt.

## 7. Bewusst außerhalb des Umfangs

- **Fahrer-Override** (starkes Gasgeben oder Lenken unterdrückt AEB): nicht in der ersten Version. Ist als **Transferaufgabe in der Live-Demo** gedacht, falls Zeit bleibt. Die Schnittstelle sollte so entworfen sein, dass die Ergänzung ohne Umbau der Simulation möglich ist (z. B. Pedalstellung und Lenkwinkel als optionale Eingänge).
- Reaktionszeit-Fahrermodell, Mehrspurverkehr, 3D-Darstellung, Reinforcement Learning.

## 8. Umsetzungsstand (Projekt `aeb-sim/`, Vite + TypeScript)

Umgesetzt: Zeigedatei `src/aeb.ts`, Simulationskern `src/sim.ts`, Darstellung `src/main.ts`, `README.md`. Enthalten sind drei Szenarien, Slider, Geisterfahrzeug, vier Live-Plots, Hot Reload der AEB-Logik und Pause/Zeitlupe/Neustart. Der Code wurde vom Autor (Claude) nicht ausgeführt, nur vom Dozenten lokal getestet.

Wichtige Entwurfsentscheidungen:
- Nach AEB-Eingriff (Stufe >= 2) wird die Ego-Trajektorie gekappt (`vCap` in sim.ts): Sobald Ego nicht schneller als das Ziel ist, hält der Fahrerwunsch diese Geschwindigkeit. Ohne das fuhr Ego nach dem Stillstand wieder an (Stufe fiel auf 0, weil vRel = 0).
- Ego-Trajektorie: konstant plus optionale Rampe (`aRamp`, `tRamp`), Erweiterung in `vSet()`.
- Ziel-Verzögerung wird wie im CCRb-Protokoll linear innerhalb von 1,0 s erreicht.
- `AebInput` enthält die optionalen Felder `pedal` und `steering` für die Override-Transferaufgabe (von der Simulation noch nicht gefüllt).
- Schwellen in `decideStage` (TTC 2,5 s; BTN 0,4 und 0,8) sind didaktische Platzhalter.

Gegen Euro NCAP AEB C2C Protocol v3.0.2 (Juli 2019) geprüft:
- T0 bei CCRs/CCRm = TTC 4 s, bei CCRb = Beginn der Zielverzögerung. Startabstand also ca. 4 s mal Relativgeschwindigkeit.
- CCRs: AEB 10-50 km/h (kombiniert AEB+FCW), nur AEB 10-80 km/h. CCRm: 30-80 km/h. Zielgeschwindigkeit bei CCRm steht dort nur in einer Abbildung und wurde nicht verifiziert (Voreinstellung 20 km/h aus dem Gedächtnis).
- CCRb: fest 50 km/h für beide, Zielverzögerung -2 und -6 m/s², Abstand 12 m und 40 m, Zielverzögerung wird innerhalb 1,0 s erreicht.
- Testende: VUT steht, VUT langsamer als Ziel (CCR) oder Kontakt. Teststrecke mit Reibwert (PBC) mindestens 0,9. FCW-Tests mit Bremsroboter: Reaktionszeit 1,2 s, Bremsniveau -4 m/s².
- Neuere Fassungen (Protokolljahre 2023-2028) wurden nicht eingesehen und können abweichen.

## 9. Nächste Schritte

1. Lokal testen (vor allem CCRm und CCRb), Fehler melden.
2. Optional: Sensorlatenz, Stützpunktprofil für Ego, automatische Pause bei Stillstand.
3. Schwellen und Stufenlogik für die Vorlesung festlegen; Transferaufgaben vorbereiten (Fahrer-Override, BTN bei Zielstillstand).
4. Parameter gegen aktuelle Protokollfassung abgleichen.
