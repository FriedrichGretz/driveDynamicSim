// ============================================================
//  AEB-Auslösung: TTC, BTN und Arbitrierung  (hier wird live editiert)
//  Speichern -> die laufende Simulation übernimmt die neue Logik sofort.
// ============================================================

export interface AebInput {
  vEgo: number;     // m/s
  vTarget: number;  // m/s
  distance: number; // m, Stoßstange Ego bis Heck Ziel
  aTarget: number;  // m/s², Zielbeschleunigung (negativ = Ziel bremst)
  aDriver: number;  // m/s², Wunsch von Fahrer/Trajektorie (negativ = Verzögerung)
  aMax: number;     // m/s², maximal mögliche Verzögerung (positiv)
  // Für die Transferaufgabe "Fahrer-Override" (derzeit von der Simulation nicht gefüllt):
  pedal?: number;   // Gaspedalstellung 0..1
  steering?: number; // Lenkradwinkelgeschwindigkeit [°/s]
}
export interface AebOutput { aCmd: number; stage: 0 | 1 | 2 | 3; ttc: number; btn: number }
export interface AebState { stage: number }
export const initState = (): AebState => ({ stage: 0 });

// --- 1. Metriken -------------------------------------------------
export function computeTTC(distance: number, vRel: number): number {
  return vRel > 0 ? distance / vRel : Infinity;
}

export function computeBTN(distance: number, vRel: number, aTarget: number, aMax: number): number {
  if (vRel <= 0) return 0;
  // Nötige Verzögerung; bremst das Ziel (aTarget < 0), steigt sie
  // (Näherung: Ziel bremst weiter, bis zum Stillstand wird nicht betrachtet).
  const aReq = (vRel * vRel) / (2 * Math.max(distance, 0.01)) - aTarget;
  return Math.max(aReq, 0) / aMax;           // BTN >= 1: nicht mehr vermeidbar
}

// --- 2. Triggerlogik ---------------------------------------------
export function decideStage(ttc: number, btn: number, prev: number): 0 | 1 | 2 | 3 {
  let s = 0;
  if (ttc < 2.5) s = 1;   // Warnung
  if (btn > 0.4) s = 2;   // Teilbremsung
  if (btn > 0.8) s = 3;   // Vollbremsung
  return Math.max(s, prev) as 0 | 1 | 2 | 3;   // Stufe bleibt gehalten (Hysterese)
}

// --- 3. Arbitrierung ---------------------------------------------
// Aus Stufe und Fahrerwunsch entsteht der Sollwert für die Bremsenregelung.
export function arbitrate(aDriver: number, stage: number, aMax: number): number {
  const aAeb = [Infinity, Infinity, -0.5 * aMax, -aMax][stage];
  return Math.min(aDriver, aAeb);              // die stärkere Verzögerung gewinnt
}

// --- Zyklus (alle 20 ms) -----------------------------------------
export function aebStep(inp: AebInput, st: AebState): AebOutput {
  const vRel = inp.vEgo - inp.vTarget;
  const ttc = computeTTC(inp.distance, vRel);
  const btn = computeBTN(inp.distance, vRel, inp.aTarget, inp.aMax);
  if (vRel <= 0) st.stage = 0;                 // Gefahr vorbei: Freigabe
  st.stage = decideStage(ttc, btn, st.stage);
  const aCmd = arbitrate(inp.aDriver, st.stage, inp.aMax);
  return { aCmd, stage: st.stage as 0 | 1 | 2 | 3, ttc, btn };
}
