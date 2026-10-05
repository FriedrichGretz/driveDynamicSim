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
export function computeTTC(distance: number, vRel: number): number {
    return vRel > 0 ? distance / vRel : Infinity;
}

export function computeBTN(
    distance: number,
    vRel: number,
    aTarget: number,
    aMax: number,
): number {
    if (vRel <= 0) return 0;
    // Nötige Verzögerung; bremst das Ziel (aTarget < 0), steigt sie
    // (Näherung: Ziel bremst weiter, bis zum Stillstand wird nicht betrachtet).
    const aReq = (vRel * vRel) / (2 * Math.max(distance, 0.01)) - aTarget;
    return Math.max(aReq, 0) / aMax; // BTN >= 1: nicht mehr vermeidbar
}

// --- 2. Triggerlogik ---------------------------------------------
export const THRESHOLDS = { ttcWarn: 2.5, btnPartial: 0.4, btnFull: 0.8 }; // werden auch in den Plots angezeigt

export function decideNextState(
    ttc: number,
    btn: number,
    prevState: AebState,
): AebState {
    let s = 0;
    if (ttc < THRESHOLDS.ttcWarn) s = AebState.Warning;
    if (btn > THRESHOLDS.btnPartial) s = AebState.PartialBraking;
    if (btn > THRESHOLDS.btnFull) s = AebState.FullBraking;
    return Math.max(s, prevState) as AebState; // Stufe bleibt gehalten (Hysterese)
}

// --- 3. Arbitrierung ---------------------------------------------
// Aus Stufe und Fahrerwunsch entsteht der Sollwert für die Bremsenregelung.
export function arbitrate(
    aDriver: number,
    state: number,
    aMax: number,
): number {
    const aAeb = [Infinity, Infinity, -0.5 * aMax, -aMax][state];
    return Math.min(aDriver, aAeb); // die stärkere Verzögerung gewinnt
}

// --- Zyklus (alle 20 ms) -----------------------------------------
export function aebStep(inp: AebInput, prevState: AebState): AebOutput {
    const vRel = inp.vEgo - inp.vTarget;
    const ttc = computeTTC(inp.distance, vRel);
    const btn = computeBTN(inp.distance, vRel, inp.aTarget, inp.aMax);
    const newState =
        vRel <= 0
            ? AebState.NoDanger // Gefahr vorbei: Freigabe
            : decideNextState(ttc, btn, prevState);
    const aCmd = arbitrate(inp.aDriver, newState, inp.aMax);
    return { aCmd, state: newState, ttc, btn };
}
