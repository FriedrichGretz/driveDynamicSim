import { aebStep, initState, type AebOutput } from './aeb';

export interface Params { vEgo:number; vTarget:number; gap:number; targetDecel:number; tBrake:number; mu:number; tau:number; jerk:number; noise:number }
export interface Rec { t:number; ve:number; vt:number; vg:number; aD:number; aC:number; aA:number; ttc:number; btn:number }
export const L = 4.5, T_END = 12, DT = 0.01;
export interface Car { x:number; v:number; a:number }

export class Sim {
  t = 0; n = 0; st = initState(); aD = 0;
  out: AebOutput = { aCmd:0, stage:0, ttc:Infinity, btn:0 };
  crash = NaN; ghostCrash = NaN; hist: Rec[] = [];
  ego: Car; ghost: Car; tgt: Car;
  aebFn = aebStep;   // wird von main.ts bei jedem Frame auf die aktuelle (hot-reloaded) Version gesetzt
  constructor(public p: Params) {
    const v = p.vEgo / 3.6;
    this.ego = { x:0, v, a:0 }; this.ghost = { x:0, v, a:0 };
    this.tgt = { x:p.gap + L, v:p.vTarget / 3.6, a:0 };
  }
  get done() { return this.t >= T_END; }
  gap(c: Car) { return this.tgt.x - L - c.x; }

  // Wunsch der Trajektorie: hier ein Geschwindigkeitsprofil v(t) einbauen
  private driver(c: Car) { return Math.max(-3, Math.min(2, this.p.vEgo / 3.6 - c.v)); }

  private plant(c: Car, aCmd: number) {          // Bremsverzug (PT1) + Jerk-Limit
    const j = this.p.jerk * DT;
    c.a += Math.max(-j, Math.min(j, (aCmd - c.a) / this.p.tau * DT));
    c.v = Math.max(0, c.v + c.a * DT); c.x += c.v * DT;
  }

  step() {
    const p = this.p, aMax = p.mu * 9.81, tg = this.tgt;
    tg.a = this.t >= p.tBrake && tg.v > 0 ? -p.targetDecel : 0;
    tg.v = Math.max(0, tg.v + tg.a * DT); tg.x += tg.v * DT;
    this.aD = this.driver(this.ego);
    if (this.n % 2 === 0) {                      // AEB-Zyklus 20 ms
      const noise = p.noise * 2 * (Math.random() + Math.random() + Math.random() - 1.5);
      this.out = this.aebFn({ vEgo:this.ego.v, vTarget:tg.v, distance:this.gap(this.ego) + noise,
        aTarget:tg.a, aDriver:this.aD, aMax }, this.st);
    }
    this.plant(this.ego, Math.max(-aMax, this.out.aCmd));
    this.plant(this.ghost, Math.max(-aMax, this.driver(this.ghost)));
    if (this.gap(this.ego) <= 0) { if (isNaN(this.crash)) this.crash = (this.ego.v - tg.v) * 3.6; this.ego.x = tg.x - L; this.ego.v = tg.v; }
    if (this.gap(this.ghost) <= 0) { if (isNaN(this.ghostCrash)) this.ghostCrash = (this.ghost.v - tg.v) * 3.6; this.ghost.x = tg.x - L; this.ghost.v = tg.v; }
    if (this.n % 5 === 0) this.hist.push({ t:this.t, ve:this.ego.v*3.6, vt:tg.v*3.6, vg:this.ghost.v*3.6,
      aD:this.aD, aC:Math.max(-aMax, this.out.aCmd), aA:this.ego.a, ttc:this.out.ttc, btn:this.out.btn });
    this.t += DT; this.n++;
  }
}
