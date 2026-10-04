/// <reference types="vite/client" />
import * as first from './aeb';
import { Sim, Params, Rec, L, DT, T_END } from './sim';

let aeb = first;   // wird bei Änderung von aeb.ts per HMR ausgetauscht, die Simulation läuft weiter
import.meta.hot?.accept('./aeb', (m) => { if (m) aeb = m as typeof first; });

const C = { mu:0.9, tau:0.15, jerk:30, noise:0 };
const SC: Record<string, Params> = {
  CCRs: { vEgo:50, vTarget:0,  gap:56, targetDecel:0, tBrake:99, ...C },
  CCRm: { vEgo:60, vTarget:20, gap:44, targetDecel:0, tBrake:99, ...C },
  CCRb: { vEgo:50, vTarget:50, gap:12, targetDecel:6, tBrake:1,  ...C },
};
const SL: [keyof Params, string, number, number, number][] = [
  ['vEgo','Ego-Geschwindigkeit [km/h]',10,100,1], ['vTarget','Ziel-Geschwindigkeit [km/h]',0,80,1],
  ['gap','Startabstand [m]',5,100,1], ['targetDecel','Ziel-Verzögerung [m/s²]',0,9,0.5],
  ['tBrake','Ziel bremst ab [s]',0,12,0.5], ['mu','Reibwert μ',0.2,1.1,0.05],
  ['tau','Bremsverzug τ [s]',0.02,0.5,0.01], ['jerk','Jerk-Limit [m/s³]',5,60,1], ['noise','Abstandsrauschen σ [m]',0,2,0.1],
];
let p: Params, sim: Sim, speed = 1, run = true, acc = 0, last = 0;
const ui = document.getElementById('ui')!;
const restart = () => { sim = new Sim({ ...p }); acc = 0; };

function build(name: string) {
  p = { ...SC[name] };
  ui.innerHTML = `<h1>AEB-Lehrsimulation</h1>
  <select id="sc">${Object.keys(SC).map(k => `<option ${k === name ? 'selected' : ''}>${k}</option>`).join('')}</select>
  <select id="sp">${[0.1, 0.25, 1, 2].map(v => `<option ${v === speed ? 'selected' : ''} value="${v}">${v}×</option>`).join('')}</select><br>
  <button id="pp">Pause / Weiter</button><button id="rs">Neustart</button>
  ${SL.map(([k, l, a, b, s]) => `<label>${l}: <b id="v_${k}">${p[k]}</b></label><input type="range" id="r_${k}" min="${a}" max="${b}" step="${s}" value="${p[k]}">`).join('')}`;
  (document.getElementById('sc') as HTMLSelectElement).onchange = e => { build((e.target as HTMLSelectElement).value); restart(); };
  (document.getElementById('sp') as HTMLSelectElement).onchange = e => { speed = +(e.target as HTMLSelectElement).value; };
  document.getElementById('pp')!.onclick = () => { run = !run; };
  document.getElementById('rs')!.onclick = restart;
  SL.forEach(([k]) => (document.getElementById('r_' + k) as HTMLInputElement).oninput = e => {
    p[k] = +(e.target as HTMLInputElement).value; document.getElementById('v_' + k)!.textContent = String(p[k]); restart();
  });
}

function fit(c: HTMLCanvasElement) {
  const d = devicePixelRatio || 1;
  if (c.width !== Math.round(c.clientWidth * d)) { c.width = Math.round(c.clientWidth * d); c.height = Math.round(c.clientHeight * d); }
  const x = c.getContext('2d')!; x.setTransform(d, 0, 0, d, 0, 0); return x;
}
const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r); };

function car(c: CanvasRenderingContext2D, xf: number, yg: number, s: number, col: string, alpha: number, brake: boolean, ghost = false) {
  const w = L * s, h = 1.4 * s;
  c.globalAlpha = alpha; c.fillStyle = col; rr(c, xf - w, yg - h - 0.3 * s, w, h, 8); c.fill();
  rr(c, xf - w * 0.78, yg - h * 1.75 - 0.3 * s, w * 0.5, h * 0.8, 8); c.fill();
  if (ghost) { c.setLineDash([5, 4]); c.strokeStyle = '#fff'; c.lineWidth = 1.5; rr(c, xf - w, yg - h - 0.3 * s, w, h, 8); c.stroke(); c.setLineDash([]); }
  c.fillStyle = '#10131c'; for (const wx of [0.22, 0.78]) { c.beginPath(); c.arc(xf - w * wx, yg - 0.3 * s, 0.38 * s, 0, 7); c.fill(); }
  c.fillStyle = brake ? '#ff2a3d' : '#7a2a33'; c.shadowColor = '#ff2a3d'; c.shadowBlur = brake ? 18 : 0;
  c.fillRect(xf - w - 1, yg - h * 0.95, 4, h * 0.35); c.shadowBlur = 0; c.globalAlpha = 1;
}

const NAMES = ['Normal', 'Warnung', 'Teilbremsung', 'Vollbremsung'], COLS = ['#4b5675', '#f5b942', '#ff8a3d', '#ff4d5e'];

function drawScene() {
  const cv = document.getElementById('scene') as HTMLCanvasElement, c = fit(cv), W = cv.clientWidth, H = cv.clientHeight;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16224a'); g.addColorStop(1, '#2d3b6b');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const s = Math.max(4, Math.min(12, 0.5 * W / (p.gap + L + 5))), yg = H * 0.8, ex = sim.ego.x, X = (x: number) => W * 0.4 + (x - ex) * s;
  c.fillStyle = '#1a1d27'; c.fillRect(0, H * 0.62, W, H); c.fillStyle = '#c9cde0';
  for (let i = -1; i < W / 90 + 2; i++) c.fillRect(i * 90 - (ex * s) % 90, H * 0.9, 45, 3);
  car(c, X(sim.ghost.x), yg, s, '#9db4ff', 0.35, false, true);
  car(c, X(sim.tgt.x), yg, s, '#ff9f43', 1, sim.tgt.a < -0.5);
  car(c, X(sim.ego.x), yg, s, '#3b82f6', 1, sim.ego.a < -0.5);
  const gp = sim.gap(sim.ego);
  if (gp > 0) { const y = H * 0.5; c.strokeStyle = '#e6e9f2'; c.beginPath(); c.moveTo(X(sim.ego.x), y); c.lineTo(X(sim.tgt.x - L), y); c.stroke();
    c.fillStyle = '#e6e9f2'; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText(gp.toFixed(1) + ' m', (X(sim.ego.x) + X(sim.tgt.x - L)) / 2, y - 6); }
  const o = sim.out; rr(c, 14, 12, 190, 34, 10); c.fillStyle = COLS[o.stage]; c.fill();
  c.fillStyle = '#0b1020'; c.font = 'bold 15px system-ui'; c.textAlign = 'left'; c.fillText(NAMES[o.stage], 28, 34);
  c.fillStyle = '#e6e9f2'; c.font = '14px ui-monospace,monospace';
  c.fillText(`TTC ${isFinite(o.ttc) ? o.ttc.toFixed(2) + ' s' : '∞'}   BTN ${o.btn.toFixed(2)}   t ${sim.t.toFixed(1)} s`, 220, 34);
  c.fillText(isNaN(sim.crash) ? (sim.t > 1 && sim.ego.v < 0.1 ? 'Ego: kein Aufprall' : '') : `Ego: Aufprall mit ${sim.crash.toFixed(1)} km/h`, 14, 70);
  c.fillText(isNaN(sim.ghostCrash) ? '' : `Geist (ohne AEB): Aufprall mit ${sim.ghostCrash.toFixed(1)} km/h`, 14, 90);
}

type Ser = [string, (r: Rec) => number, string, boolean?];
function panel(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, lo: number, hi: number, ser: Ser[], lines: number[] = []) {
  c.fillStyle = '#141b2d'; rr(c, x, y, w, h, 10); c.fill();
  const X = (t: number) => x + 40 + t / T_END * (w - 56), Y = (v: number) => y + h - 18 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * (h - 40);
  c.font = '12px system-ui'; c.fillStyle = '#9aa4c2'; c.textAlign = 'left'; c.fillText(title, x + 12, y + 17);
  c.textAlign = 'right'; c.fillText(String(hi), x + 34, Y(hi) + 4); c.fillText(String(lo), x + 34, Y(lo) + 4);
  c.strokeStyle = '#2a3556'; c.setLineDash([4, 4]); for (const v of [0, ...lines]) { if (v < lo || v > hi) continue; c.beginPath(); c.moveTo(X(0), Y(v)); c.lineTo(X(T_END), Y(v)); c.stroke(); }
  for (const [nm, f, col, dash] of ser) {
    c.setLineDash(dash ? [5, 4] : []); c.strokeStyle = col; c.lineWidth = 2; c.beginPath();
    sim.hist.forEach((r, i) => { const v = f(r); i ? c.lineTo(X(r.t), Y(v)) : c.moveTo(X(r.t), Y(v)); }); c.stroke();
    c.setLineDash([]); c.fillStyle = col; c.textAlign = 'right'; c.fillText(nm, x + w - 10 - ser.findIndex(q => q[0] === nm) * 0 , y + 17 + 14 * ser.findIndex(q => q[0] === nm));
  }
  c.setLineDash([]);
}
function drawPlots() {
  const cv = document.getElementById('plots') as HTMLCanvasElement, c = fit(cv), W = cv.clientWidth, H = cv.clientHeight, w = (W - 10) / 2, h = (H - 10) / 2;
  panel(c, 0, 0, w, h, 'Geschwindigkeit [km/h]', 0, 100, [['Ego', r => r.ve, '#3b82f6'], ['Ziel', r => r.vt, '#ff9f43'], ['Geist', r => r.vg, '#9db4ff', true]]);
  panel(c, w + 10, 0, w, h, 'Beschleunigung [m/s²]', -10, 3, [['Wunsch', r => r.aD, '#8892b0', true], ['AEB-Ergebnis', r => r.aC, '#ff4d5e'], ['Ist', r => r.aA, '#3b82f6']]);
  panel(c, 0, h + 10, w, h, 'TTC [s]', 0, 6, [['TTC', r => r.ttc, '#34d399']], [2.5]);
  panel(c, w + 10, h + 10, w, h, 'BTN [–]', 0, 1.5, [['BTN', r => r.btn, '#f5b942']], [0.4, 0.8, 1]);
}

function frame(ts: number) {
  const dt = (ts - last) / 1000; last = ts; sim.aebFn = aeb.aebStep;
  if (run && !sim.done) { acc += Math.min(dt, 0.05) * speed; while (acc >= DT && !sim.done) { sim.step(); acc -= DT; } }
  drawScene(); drawPlots(); requestAnimationFrame(frame);
}
build('CCRs'); restart(); requestAnimationFrame(frame);
