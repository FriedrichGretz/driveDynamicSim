export interface AebInput {
    vEgo: number;
    vTarget: number;
    distance: number;
    aTarget: number;
    aDriver: number;
    aMax: number;
}
export enum AebState {
    NoDanger = 0,
    Warning = 1,
    PartialBraking = 2,
    FullBraking = 3,
}
export interface AebOutput {
    aCmd: number;
    state: AebState;
    ttc: number;
}

export const initState = (): AebState => 0;
export const THRESHOLDS = { }; // werden auch in den Plots angezeigt

export function aebStep(inp: AebInput, prevState: AebState): AebOutput {
    let a = inp.vEgo - inp.vTarget;
    let t = a > 0 ? inp.distance / a : Infinity;
    let s = 0;
    let c = inp.aDriver;

    if (Number.isFinite(t)) s = Math.max(t < 1.5 ? 3 : t < 2.3 ? 1 : 0, prevState);

    if (s === 2) c = -0.5 * inp.aMax;
    else if (s === 3) c = -inp.aMax;

    return { aCmd: c, state: s, ttc: t };
}