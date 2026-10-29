// ============================================================
//  AEB-Auslösung: TTC und Arbitrierung  (hier wird live editiert)
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
}

export const initState = (): AebState => AebState.NoDanger;

// --- 1. Metriken -------------------------------------------------
export function computeTTC(distance: number, vRel: number): number {
    return vRel > 0 ? distance / vRel : Infinity;
}

// --- 2. Triggerlogik ---------------------------------------------
export const THRESHOLDS = { ttcWarn: 2.3, ttcFull: 1.5 }; // werden auch in den Plots angezeigt

export function decideNextState(
    ttc: number,
    prevState: AebState,
): AebState {
    if(Number.isFinite(ttc)){
        let newState = AebState.NoDanger;
        if (ttc < THRESHOLDS.ttcFull) {
            newState = AebState.FullBraking;
        } else if (ttc < THRESHOLDS.ttcWarn) {
            newState = AebState.Warning;
        }
        return Math.max(newState, prevState); // Stufe bleibt gehalten (Hysterese)
    } else {
        return AebState.NoDanger // Gefahr vorbei: Freigabe
    }
}

// --- 3. Arbitrierung ---------------------------------------------
// Aus Stufe und Fahrerwunsch entsteht der Sollwert für die Bremsenregelung.
export function arbitrate(
    aDriver: number,
    state: number,
    aMax: number,
): number {
    let aAeb = aDriver;
    switch (state) {
        case AebState.PartialBraking:
            aAeb = -0.5 * aMax;
            break;
        case AebState.FullBraking:
            aAeb = -aMax;
            break;
        default:
            break;
    }
    return aAeb;
}

// --- Zyklus (alle 20 ms) -----------------------------------------
export function aebStep(inp: AebInput, prevState: AebState): AebOutput {
    const vRel = inp.vEgo - inp.vTarget;
    const ttc = computeTTC(inp.distance, vRel);
    const newState = decideNextState(ttc, prevState);
    const aCmd = arbitrate(inp.aDriver, newState, inp.aMax);
    return { aCmd, state: newState, ttc };
}
