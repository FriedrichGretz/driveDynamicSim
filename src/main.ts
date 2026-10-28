/// <reference types="vite/client" />
import * as first from "./aeb";
import { Sim, Params, Rec, L, DT, T_END } from "./sim";

let aeb = first; // wird bei Änderung von aeb.ts per HMR ausgetauscht, die Simulation läuft weiter
import.meta.hot?.accept("./aeb", (m) => {
    if (m) aeb = m as typeof first;
});

const SC: Record<string, Params> = {
    CCRs: {
        vEgo: 50,
        vTarget: 0,
        gap: 56,
        targetDecel: 0,
        tBrake: 99,
        aMax: 9,
    },
    CCRm: {
        vEgo: 60,
        vTarget: 20,
        gap: 44,
        targetDecel: 0,
        tBrake: 99,
        aMax: 9,
    },
    CCRb: {
        vEgo: 50,
        vTarget: 50,
        gap: 12,
        targetDecel: 6,
        tBrake: 1,
        aMax: 9,
    },
};
const SL: [keyof Params, string, number, number, number][] = [
    ["vEgo", "Ego-Geschwindigkeit [km/h]", 10, 100, 1],
    ["vTarget", "Ziel-Geschwindigkeit [km/h]", 0, 80, 1],
    ["gap", "Startabstand [m]", 5, 100, 1],
    ["targetDecel", "Ziel-Verzögerung [m/s²]", 0, 9, 0.5],
    ["tBrake", "Ziel bremst ab [s]", 0, 12, 0.5],
    ["aMax", "Max. Verzögerung Ego [m/s²]", 2, 12, 0.5],
];
let p: Params,
    sim: Sim,
    speed = 1,
    run = true,
    acc = 0,
    last = 0;
const ui = document.getElementById("ui")!;
const restart = () => {
    sim = new Sim({ ...p });
    acc = 0;
};

function build(name: string) {
    p = { ...SC[name] };
    const open = (document.getElementById("sl") as HTMLDetailsElement | null)?.open;
    ui.innerHTML = `<div class="bar"><h1>AEB-Lehrsimulation</h1>
  <select id="sc">${Object.keys(SC)
      .map((k) => `<option ${k === name ? "selected" : ""}>${k}</option>`)
      .join("")}</select>
  <select id="sp">${[0.1, 0.25, 1, 2].map((v) => `<option ${v === speed ? "selected" : ""} value="${v}">${v}×</option>`).join("")}</select>
  <button id="pp">Pause / Weiter</button><button id="rs">Neustart</button></div>
  <details id="sl"${open ? " open" : ""}><summary>Parameter</summary><div class="sliders">
  ${SL.map(([k, l, a, b, s]) => `<div><label>${l}: <b id="v_${k}">${p[k]}</b></label><input type="range" id="r_${k}" min="${a}" max="${b}" step="${s}" value="${p[k]}"></div>`).join("")}
  </div></details>`;
    (document.getElementById("sc") as HTMLSelectElement).onchange = (e) => {
        build((e.target as HTMLSelectElement).value);
        restart();
    };
    (document.getElementById("sp") as HTMLSelectElement).onchange = (e) => {
        speed = +(e.target as HTMLSelectElement).value;
    };
    document.getElementById("pp")!.onclick = () => {
        run = !run;
    };
    document.getElementById("rs")!.onclick = restart;
    SL.forEach(
        ([k]) =>
            ((document.getElementById("r_" + k) as HTMLInputElement).oninput = (
                e,
            ) => {
                p[k] = +(e.target as HTMLInputElement).value;
                document.getElementById("v_" + k)!.textContent = String(p[k]);
                restart();
            }),
    );
}

function fit(c: HTMLCanvasElement) {
    const d = devicePixelRatio || 1,
        w = Math.round(c.clientWidth * d),
        h = Math.round(c.clientHeight * d);
    if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
    }
    const x = c.getContext("2d")!;
    x.setTransform(d, 0, 0, d, 0, 0);
    x.clearRect(0, 0, c.clientWidth, c.clientHeight);
    return x;
}
const rr = (
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) => {
    c.beginPath();
    c.roundRect(x, y, w, h, r);
};

function car(
    c: CanvasRenderingContext2D,
    xf: number,
    yg: number,
    s: number,
    col: string,
    alpha: number,
    brake: boolean,
    ghost = false,
) {
    const w = L * s,
        h = 1.4 * s;
    c.globalAlpha = alpha;
    c.fillStyle = col;
    rr(c, xf - w, yg - h - 0.3 * s, w, h, 8);
    c.fill();
    rr(c, xf - w * 0.78, yg - h * 1.75 - 0.3 * s, w * 0.5, h * 0.8, 8);
    c.fill();
    if (ghost) {
        c.setLineDash([5, 4]);
        c.strokeStyle = "#fff";
        c.lineWidth = 1.5;
        rr(c, xf - w, yg - h - 0.3 * s, w, h, 8);
        c.stroke();
        c.setLineDash([]);
    }
    c.fillStyle = "#10131c";
    for (const wx of [0.22, 0.78]) {
        c.beginPath();
        c.arc(xf - w * wx, yg - 0.3 * s, 0.38 * s, 0, 7);
        c.fill();
    }
    c.fillStyle = brake ? "#ff2a3d" : "#7a2a33";
    c.shadowColor = "#ff2a3d";
    c.shadowBlur = brake ? 18 : 0;
    c.fillRect(xf - w - 1, yg - h * 0.95, 4, h * 0.35);
    c.shadowBlur = 0;
    c.globalAlpha = 1;
}

const NAMES = ["Normal", "Warnung", "Teilbremsung", "Vollbremsung"],
    COLS = ["#4b5675", "#f5b942", "#ff8a3d", "#ff4d5e"];

function drawScene() {
    const cv = document.getElementById("scene") as HTMLCanvasElement,
        c = fit(cv),
        W = cv.clientWidth,
        H = cv.clientHeight;
    c.fillStyle = "#1a1d27";
    c.fillRect(0, 0, W, H);
    const s = Math.max(1, Math.min(12, (0.5 * W) / (p.gap + L + 5))),
        yg = H - 42, // Fahrzeuge oben, Abstandsbalken darunter
        ex = sim.ego.x,
        X = (x: number) => W * 0.4 + (x - ex) * s;
    car(c, X(sim.ghost.x), yg, s, "#9db4ff", 0.35, false, true);
    car(c, X(sim.tgt.x), yg, s, "#ff9f43", 1, sim.tgt.a < -0.5);
    car(c, X(sim.ego.x), yg, s, "#3b82f6", 1, sim.ego.a < -0.5);
    const gp = sim.gap(sim.ego);
    if (gp > 0) {
        const y = H - 24,
            x1 = X(sim.ego.x),
            x2 = X(sim.tgt.x - L);
        c.strokeStyle = "#e6e9f2";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x1, y);
        c.lineTo(x2, y);
        c.moveTo(x1, y - 4);
        c.lineTo(x1, y + 4);
        c.moveTo(x2, y - 4);
        c.lineTo(x2, y + 4);
        c.stroke();
        c.fillStyle = "#e6e9f2";
        c.font = "13px system-ui";
        c.textAlign = "center";
        c.fillText(gp.toFixed(1) + " m", (x1 + x2) / 2, y + 16);
    }
}

function drawStatus() {
    const o = sim.out,
        $ = (id: string) => document.getElementById(id)!;
    $("badge").textContent = NAMES[o.state];
    $("badge").style.background = COLS[o.state];
    $("metrics").textContent =
        `TTC ${isFinite(o.ttc) ? o.ttc.toFixed(2) + " s" : "∞"}   t ${sim.t.toFixed(1)} s`;
    $("crash").textContent = isNaN(sim.crash)
        ? sim.t > 1 && sim.ego.v < 0.1
            ? "Ego: kein Aufprall"
            : ""
        : `Ego: Aufprall mit ${sim.crash.toFixed(1)} km/h`;
    $("ghost").textContent = isNaN(sim.ghostCrash)
        ? ""
        : `Geist (ohne AEB): Aufprall mit ${sim.ghostCrash.toFixed(1)} km/h`;
}

type Ser = [string, (r: Rec) => number, string, boolean?];
function panel(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    lo: number,
    hi: number,
    step: number,
    ser: Ser[],
    marks: [number, string][] = [],
) {
    c.fillStyle = "#141b2d";
    rr(c, x, y, w, h, 10);
    c.fill();
    c.font = "12px system-ui";
    const legW = ser.reduce((a, [nm]) => a + c.measureText(nm).width + 14, 0),
        wrap = c.measureText(title).width + 24 + legW > w - 24;
    const L0 = x + 46,
        R0 = x + w - 14,
        T0 = y + (wrap ? 54 : 36),
        B0 = y + h - 24;
    const X = (t: number) => L0 + (t / T_END) * (R0 - L0),
        Y = (v: number) =>
            B0 - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (B0 - T0);
    c.font = "12px system-ui";
    c.lineWidth = 1;
    c.setLineDash([]);
    c.fillStyle = "#e6e9f2";
    c.textAlign = "left";
    c.fillText(title, x + 12, y + 20);
    let lx = x + w - 12;
    c.textAlign = "right"; // Legende rechts neben dem Titel
    for (const [nm, , col] of [...ser].reverse()) {
        c.fillStyle = col;
        c.fillText(nm, lx, wrap ? y + 38 : y + 20);
        lx -= c.measureText(nm).width + 14;
    }
    for (let t = 0; t <= T_END; t += 2) {
        // x-Achse: Zeit
        c.strokeStyle = "#222c49";
        c.beginPath();
        c.moveTo(X(t), T0);
        c.lineTo(X(t), B0);
        c.stroke();
        c.fillStyle = "#9aa4c2";
        c.textAlign = "center";
        c.fillText(t + " s", X(t), B0 + 16);
    }
    for (let v = lo; v <= hi + 1e-9; v += step) {
        // y-Achse: Teilung mit Beschriftung
        c.strokeStyle = v === 0 ? "#4a567f" : "#222c49";
        c.beginPath();
        c.moveTo(L0, Y(v));
        c.lineTo(R0, Y(v));
        c.stroke();
        c.fillStyle = "#9aa4c2";
        c.textAlign = "right";
        c.fillText(String(+v.toFixed(2)), L0 - 6, Y(v) + 4);
    }
    for (const [v, label] of marks) {
        // beschriftete Schwellen
        c.setLineDash([5, 4]);
        c.strokeStyle = "#f5b94299";
        c.beginPath();
        c.moveTo(L0, Y(v));
        c.lineTo(R0, Y(v));
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = "#f5b942";
        c.textAlign = "right";
        c.fillText(label, R0 - 4, Y(v) - 4);
    }
    c.save();
    c.beginPath();
    c.rect(L0, T0 - 2, R0 - L0, B0 - T0 + 4);
    c.clip();
    for (const [, f, col, dash] of ser) {
        c.setLineDash(dash ? [6, 4] : []);
        c.strokeStyle = col;
        c.lineWidth = 2;
        c.beginPath();
        sim.hist.forEach((r, i) =>
            i ? c.lineTo(X(r.t), Y(f(r))) : c.moveTo(X(r.t), Y(f(r))),
        );
        c.stroke();
    }
    c.restore();
    c.setLineDash([]);
}
function drawPlots() {
    const cv = document.getElementById("plots") as HTMLCanvasElement,
        c = fit(cv),
        W = cv.clientWidth,
        H = cv.clientHeight,
        h = (H - 20) / 3;
    const T = aeb.THRESHOLDS;
    panel(c, 0, 0, W, h, "Beschleunigung [m/s²]", -12, 4, 4, [
        ["Fahrerwunsch", (r) => r.aD, "#8892b0", true],
        ["AEB-Ergebnis (Ego)", (r) => r.aC, "#ff4d5e"],
    ]);
    panel(c, 0, h + 10, W, h, "Geschwindigkeit [km/h]", 0, 100, 20, [
        ["Ego", (r) => r.ve, "#3b82f6"],
        ["Ziel", (r) => r.vt, "#ff9f43"],
        ["Geist (ohne AEB)", (r) => r.vg, "#9db4ff", true],
    ]);
    panel(
        c,
        0,
        2 * (h + 10),
        W,
        h,
        "TTC [s]",
        0,
        6,
        1,
        [["TTC", (r) => r.ttc, "#34d399"]],
        [[T.ttcWarn, `Warnung ${T.ttcWarn} s`]],
    );
}

function frame(ts: number) {
    const dt = (ts - last) / 1000;
    last = ts;
    sim.aebFn = aeb.aebStep;
    if (run && !sim.done) {
        acc += Math.min(dt, 0.05) * speed;
        while (acc >= DT && !sim.done) {
            sim.step();
            acc -= DT;
        }
    }
    drawStatus();
    drawScene();
    drawPlots();
    requestAnimationFrame(frame);
}
build("CCRs");
restart();
requestAnimationFrame(frame);
