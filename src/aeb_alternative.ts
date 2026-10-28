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
    btn: number;
}

export const initState = (): AebState => 0;

export function aebStep(inp: AebInput, prevState: AebState): AebOutput {
    let a = inp.vEgo - inp.vTarget;
    let t = Infinity;
    let b = 0;
    let s = 0;
    let c = inp.aDriver;

    if (a > 0) {
        t = inp.distance / a;
        b = Math.max((a * a) / (2 * Math.max(inp.distance, 0.01)) - inp.aTarget, 0) / inp.aMax;
        if (t < 2.5) s = 1;
        if (b > 0.4) s = 2;
        if (b > 0.8) s = 3;
        s = Math.max(s, prevState);
    }

    if (s == 2) c = Math.min(inp.aDriver, -0.5 * inp.aMax);
    else if (s == 3) c = Math.min(inp.aDriver, -inp.aMax);

    return { aCmd: c, state: s, ttc: t, btn: b };
}