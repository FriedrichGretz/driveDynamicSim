// ============================================================
//  AEB-Auslösung: TTC, BTN und Arbitrierung  (hier wird live editiert)
//  Speichern -> die laufende Simulation übernimmt die neue Logik sofort.
// ============================================================

export interface AebInput {
    vEgo: number; // m/s
    vTarget: number; // m/s
    distance: number; // m, Stoßstange Ego bis Heck Ziel
    aTarget: number; // m/s², Zielfahrzeug Beschleunigung (negativ = Ziel bremst)
    aDriver: number; // m/s², Wunsch von Fahrer/Trajektorie (negativ = Verzögerung)
    aMax: number; // m/s², maximal mögliche Verzögerung (positiv)
}
export enum AebState {
    NoDanger = 0,
    Warning = 1,
    PartialBraking = 2,
    FullBraking = 3,
}
export interface AebOutput {
    aCmd: number; // Beschleunigung oder Verzögerung des Notbremsassistenten
    // for simulation or debugging:
    state: AebState;
    ttc: number;
    btn: number;
}

export const initState = (): AebState => AebState.NoDanger;

// --- 1. Metriken -------------------------------------------------

// --- 2. Triggerlogik ---------------------------------------------
export const THRESHOLDS = { ttcWarn: 2.5, btnPartial: 0.4, btnFull: 0.8 }; // werden auch in den Plots angezeigt

// --- 3. Arbitrierung ---------------------------------------------
// Aus Stufe und Fahrerwunsch entsteht der Sollwert für die Bremsenregelung.

// --- Zyklus (alle 20 ms) -----------------------------------------
export function aebStep(inp: AebInput, prevState: AebState): AebOutput {
    const ttc = 1;
    const btn = 0;
    const newState = prevState;
    const aCmd = 0;
    return { aCmd, state: newState, ttc, btn };
}
