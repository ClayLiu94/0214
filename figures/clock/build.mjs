// Fig 1 · How a clock works: an open lever-escapement movement on a bench.
// node build.mjs [--light] [--audit]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../../.claude/skills/anatomy/kit/audit.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as X from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 600;
const HEIGHT = 420;

// ---- The model: a 2.5 Hz balance (18 000 beats an hour) and a 15-tooth escape wheel.
const MODEL = { hz: 2.5, escTeeth: 15, amplitude: (270 * Math.PI) / 180, forkSwing: (7 * Math.PI) / 180, window: 0.06 };

// ---- Arbor positions on the plate. Centre distances are pitch radii of the meshing pair.
const B = [-30, -23];      // barrel, 96 teeth, m 0.7
const C = [0, 0];          // centre wheel 64 / pinion 12 · one turn an hour
const T = [24, -7.7];      // third wheel 60 / pinion 8
const F = [38, 11.6];      // fourth wheel 60 / pinion 8 · one turn a minute
const E = [60, 4.6];       // escape wheel 15 / pinion 6
const ESC_DIR = [0.64, -0.768];  // escapement line, across the view
const PA = [E[0] + 16.6 * ESC_DIR[0], E[1] + 16.6 * ESC_DIR[1]];     // pallet arbor
const BAL = [PA[0] + 22 * ESC_DIR[0], PA[1] + 22 * ESC_DIR[1]];  // balance, 22 from the pallet arbor
const M_AT = [C[0] + 12 * -0.514, C[1] + 12 * 0.857]; // minute wheel of the motion work
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const meshes = [[B, C, 33.6 + 4.2], [C, T, 22.4 + 2.8], [T, F, 21 + 2.8], [F, E, 21 + 2.1], [C, M_AT, 3 + 9]];
for (const [a, b, want] of meshes) if (Math.abs(dist(a, b) - want) > 0.15) throw new Error(`mesh off: ${dist(a, b).toFixed(2)} vs ${want}`);

// ---- Heights (z up, plate top at 0).
const Z = { board: -8, plate: 0, bridge: 46, bridgeH: 3, cock: 50, ringZ: 57, ringH: 1.2 };

const PLATE = { x: -72, y: -64, w: 180, d: 108, r: 9 };
const BOARD = { x: PLATE.x - 11, y: PLATE.y - 11, w: PLATE.w + 22, d: PLATE.d + 22, r: 12 };

const P = k.fitProjection(
  [...k.boxCorners(BOARD, -26, Z.board), [C[0], C[1], 62], [BAL[0], BAL[1], 54], [-60, 12, 24]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 40, elevation: 38 },
);
const V = A.cameraBasis(P).V;
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const K = k;

// ---- Wheels.
const W = {
  barrel: { x: B[0], y: B[1], r: 33.6, n: 96, m: 0.7, z: 15, h: 2.4, spokes: 0, tone: "hi" },
  centrePinion: { x: C[0], y: C[1], r: 4.2, n: 12, m: 0.7, z: 13, h: 7, tone: "mid" },
  centre: { x: C[0], y: C[1], r: 22.4, n: 64, m: 0.7, z: 22, h: 1.4, spokes: 4, rimW: 2.4, hub: 4.6 },
  thirdPinion: { x: T[0], y: T[1], r: 2.8, n: 8, m: 0.7, z: 20, h: 6.6, tone: "mid" },
  third: { x: T[0], y: T[1], r: 21, n: 60, m: 0.7, z: 28, h: 1.4, spokes: 4, rimW: 2.3, hub: 4.2 },
  fourthPinion: { x: F[0], y: F[1], r: 2.8, n: 8, m: 0.7, z: 26, h: 6.6, tone: "mid" },
  fourth: { x: F[0], y: F[1], r: 21, n: 60, m: 0.7, z: 34, h: 1.4, spokes: 4, rimW: 2.3, hub: 4.2 },
  escapePinion: { x: E[0], y: E[1], r: 2.1, n: 6, m: 0.7, z: 32, h: 6.6, tone: "mid" },
  escape: { x: E[0], y: E[1], r: 16, n: 15, kind: "escape", z: 40, h: 0.8, spokes: 5, rimW: 1.8, hub: 3 },
  cannon: { x: C[0], y: C[1], r: 3, n: 12, m: 0.5, z: 50, h: 3.6, tone: "mid" },
  minute: { x: M_AT[0], y: M_AT[1], r: 9, n: 36, m: 0.5, z: 50.6, h: 1.1, spokes: 4, rimW: 1.4, hub: 2 },
  minutePinion: { x: M_AT[0], y: M_AT[1], r: 2.4, n: 10, m: 0.48, z: 51.7, h: 3.6, tone: "mid" },
  hourWheel: { x: C[0], y: C[1], r: 9.6, n: 40, m: 0.48, z: 54, h: 1.1, spokes: 4, rimW: 1.4, hub: 2.6 },
};
const ROTOR = {
  barrel: "barrel", centrePinion: "centre", centre: "centre", thirdPinion: "third", third: "third",
  fourthPinion: "fourth", fourth: "fourth", escapePinion: "escape", escape: "escape",
  cannon: "centre", minute: "minuteWheel", minutePinion: "minuteWheel", hourWheel: "hour",
};
// Phase each wheel so its teeth sit between the mating teeth at time zero.
const PHASE = { thirdPinion: 0.5, fourthPinion: 0.5, escapePinion: 0.5, minute: 0.5 };
const BALANCE = { x: BAL[0], y: BAL[1], r: 18, z: 44, h: 1.8, spring: 10.5, springZ: 47.6, studAngle: Math.atan2(6, 18) };
const HANDS = {
  hour: { x: C[0], y: C[1], z: 58.6, h: 0.6, len: 16, tail: 4, w: 2.3, boss: 2.8 },
  minute: { x: C[0], y: C[1], z: 59.8, h: 0.6, len: 27.5, tail: 5, w: 1.1, boss: 2 },
  seconds: { x: F[0], y: F[1], z: 51.8, h: 0.4, len: 9, tail: 3, w: 0.55, boss: 1.2 },
};

// Pallet fork geometry: stones straddle 2½ teeth of the escape wheel.
const towardA = Math.atan2(PA[0] - E[0], -(PA[1] - E[1]));
const stoneAt = (side) => {
  const a = towardA + side * 0.52;
  const r0 = W.escape.r - 3;
  const r1 = W.escape.r + 1.2;
  const w = 1;
  const [px, py] = X.polar(0, 0, 1, a + Math.PI / 2);
  const p0 = X.polar(E[0], E[1], r0, a);
  const p1 = X.polar(E[0], E[1], r1, a);
  return [[p0[0] - px * w, p0[1] - py * w], [p1[0] - px * w, p1[1] - py * w], [p1[0] + px * w, p1[1] + py * w], [p0[0] + px * w, p0[1] + py * w]];
};
const STONES = [stoneAt(1), stoneAt(-1)];
const U = [(BAL[0] - PA[0]) / 22, (BAL[1] - PA[1]) / 22];
const FORK = {
  x: PA[0], y: PA[1], z: 41.6,
  u: U,
  forkEnd: [PA[0] + U[0] * 17.6, PA[1] + U[1] * 17.6],
  stones: STONES,
  anchor: [STONES[0][1], STONES[0][0], STONES[1][3], STONES[1][2], ...[0.5, 0.75, 1, 1.25, 1.5].map((f) => X.polar(PA[0], PA[1], 3.4, Math.atan2(BAL[0] - PA[0], -(BAL[1] - PA[1])) + (f - 1) * Math.PI))],
};

// ---- Recorder: every drawn item with its true shape, ordered by measured depth.
const R = A.recorder(P, {});
const put = (name, centre, svg, shapes, extra = {}) => R.put({ name, at: centre, svg, shapes: shapes.map((s) => R.solid(s)), ...extra });
const cyl = (name, x, y, r, z, h, tone = "mid", steps = 28, extra = {}) =>
  put(name, [x, y, z + h / 2], S(k.cylinder(x, y, r, z, h, P, steps), { tone, crease: extra.crease ?? "faint", inner: extra.inner ?? "" }), [A.cylinder(x, y, r, z, h, { name, ...(extra.meta ?? {}) })]);

const hull = (pts) => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const up = [];
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
const blob = (centres) => hull(centres.flatMap(([x, y, r]) => k.circleRing(x, y, r, 28)));
// A bar of half-width w along a polyline, with round ends and mitred bends (concave allowed).
function bar(points, w, capSteps = 10) {
  const n = points.length;
  const dir = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  const side = (s) => {
    const out = [];
    for (let i = 1; i < n - 1; i++) {
      const d0 = dir(points[i - 1], points[i]);
      const d1 = dir(points[i], points[i + 1]);
      const n0 = [-d0[1] * s, d0[0] * s];
      const n1 = [-d1[1] * s, d1[0] * s];
      const m = [n0[0] + n1[0], n0[1] + n1[1]];
      const ml = Math.hypot(m[0], m[1]);
      const k2 = w / ((m[0] / ml) * n0[0] + (m[1] / ml) * n0[1]);
      out.push([points[i][0] + (m[0] / ml) * k2, points[i][1] + (m[1] / ml) * k2]);
    }
    return out;
  };
  const cap = (c, d) => {
    const a0 = Math.atan2(d[1], d[0]) - Math.PI / 2;
    return Array.from({ length: capSteps + 1 }, (_, i) => { const a = a0 + (Math.PI * i) / capSteps; return [c[0] + Math.cos(a) * w, c[1] + Math.sin(a) * w]; });
  };
  const dEnd = dir(points[n - 2], points[n - 1]);
  const dStart = dir(points[1], points[0]);
  return [...side(1), ...cap(points[n - 1], dEnd), ...side(-1).reverse(), ...cap(points[0], dStart)];
}

// Bridges and their pillars.
const Q = { barrel: [-62, 14], train: [47, -24], centre: [-19, 31], pallet: [PA[0] - 8.5, PA[1] - 7.2], cock: [BAL[0] + 6, BAL[1] - 18] };
const BRIDGES = [
  { name: "bridge.barrel", ring: blob([[B[0], B[1], 10], [...Q.barrel, 6]]), z: 18.6, h: 3, pillar: Q.barrel, pivots: [B] },
  { name: "bridge.train", ring: bar([Q.train, T, F, E], 4.4), convex: false, z: Z.bridge, h: Z.bridgeH, pillar: Q.train, pivots: [T, F, E] },
  { name: "bridge.centre", ring: blob([[C[0], C[1], 6.5], [...Q.centre, 6]]), z: Z.bridge, h: Z.bridgeH, pillar: Q.centre, pivots: [C] },
  { name: "bridge.pallet", ring: blob([[PA[0], PA[1], 3.2], [...Q.pallet, 3.8]]), z: 44.4, h: 2.4, pillar: Q.pallet, pivots: [PA] },
  { name: "cock", ring: blob([[BAL[0], BAL[1], 4.6], [...Q.cock, 5.5]]), z: Z.cock, h: 3, pillar: Q.cock, pivots: [BAL] },
];

// Chapter-ring posts: three spots at radius 26.5 that clear every wheel, bridge and pillar.
const DISCS = [
  [B, 35], [C, 23.4], [T, 22], [F, 22], [E, 17], [BAL, 18.5], [Q.barrel, 7], [Q.train, 7], [Q.centre, 7], [M_AT, 10],
];
const RING_R = [23.5, 29.5];
const POST_R = (RING_R[0] + RING_R[1]) / 2;
const clearOf = (p) => Math.min(...DISCS.map(([c, r]) => dist(p, c) - r));
let posts = [];
{
  let best = -Infinity;
  for (let a0 = 0; a0 < 360; a0 += 2) {
    for (let gap1 = 90; gap1 <= 150; gap1 += 3) {
      for (let gap2 = 90; gap2 <= 150; gap2 += 3) {
        const angles = [a0, a0 + gap1, a0 + gap1 + gap2].map((d) => (d * Math.PI) / 180);
        if (gap1 + gap2 > 270) continue;
        const pts = angles.map((a) => X.polar(C[0], C[1], POST_R, a));
        const score = Math.min(...pts.map(clearOf)) - 0.01 * Math.abs(gap1 - 120) - 0.01 * Math.abs(gap2 - 120);
        if (score > best) { best = score; posts = pts; }
      }
    }
  }
  if (Math.min(...posts.map(clearOf)) < 2.2) throw new Error("no clear spot for chapter ring posts: " + Math.min(...posts.map(clearOf)).toFixed(2));
}

// ---- Static, unsorted base: board, feet, plate. Drawn first.
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BOARD, -26, 18, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BOARD, 20))) {
    out.push(S(k.cylinder(x, y, 8, -26, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.2, -24.4, 4.4, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BOARD, -20, 12, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BOARD, 5), Z.board, P), { tone: "lo" }));
  const screws = k.corners(BOARD, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, Z.board, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, Z.board])), { size: 0.5 }));
  // Movement feet and the pillar plate.
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(PLATE, 6), Z.board, 0.1, P)}" style="filter:blur(5px)"/>`);
  for (const [x, y] of byDepth(k.corners(PLATE, 14))) out.push(S(k.cylinder(x, y, 5, Z.board, 3, P, 24), { tone: "lo" }));
  out.push(S(k.slabOf(PLATE, -5, 5, P, 8, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4), 0, P), { tone: "faint" }));
  const ps = k.corners(PLATE, 8);
  out.push(L(ps.map(([x, y]) => k.ring(x, y, 1.9, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(ps.map(([x, y]) => at([x, y, 0])), { size: 0.45 }));
  // Bottom jewels where each arbor pivots in the plate.
  for (const p of [B, C, T, F, E, PA, BAL]) out.push(L(k.ring(p[0], p[1], 2, 0, P, 18), { tone: "lo" }), D([at([p[0], p[1], 0])], { size: 0.55, tone: "hi" }));
  // Label plate: maker's rules and the beat rate.
  const label = { x: -60, y: 26, w: 34, d: 15, r: 1.5 };
  const lz = 0.8;
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), lz, P, 4), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 4, label.y + 6.6], lz, P, "x"), "18 000 A/h", { size: 3, tone: "mid" }));
  out.push(L(k.lineOnTop([label.x + 4, label.y + 9.6], [label.x + 30, label.y + 9.6], lz, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([label.x + 4, label.y + 12.2], [label.x + 22, label.y + 12.2], lz, P), { tone: "lo", free: true }));
  out.push(D([at([label.x + label.w - 3.4, label.y + 4, lz]), at([label.x + label.w - 3.4, label.y + label.d - 4, lz])], { size: 0.45 }));
  return out.join("");
}

// ---- Sorted layer.
const LIVE = {};
const live = (id, fn) => { LIVE[id] = true; return `<g data-live="${id}">${fn}</g>`; };
const state0 = X.stateOf(MODEL, 0);

for (const [id, g] of Object.entries(W)) {
  const angle = state0[ROTOR[id]] + (PHASE[id] ?? 0) * (2 * Math.PI) / g.n;
  const tipR = g.kind === "escape" ? g.r : g.r + g.m;
  put(`wheel.${id}`, [g.x, g.y, g.z + g.h / 2], live(id, X.wheelSvg(K, P, g, angle)), [A.cylinder(g.x, g.y, tipR, g.z, g.h, { name: `wheel.${id}` })]);
}

// Barrel drum, cover and ratchet with its click.
cyl("barrel.drum", B[0], B[1], 31.4, 2, 13, "mid", 72, { inner: L(k.sideArc(B[0], B[1], 31.4, 8, P, 48), { tone: "faint" }) });
cyl("barrel.cover", B[0], B[1], 30, 17.4, 0.6, "mid", 72, { crease: "lo" });
{
  const ring = X.escapeRing(B[0], B[1], 12.5, 30, 0.2);
  put("ratchet", [B[0], B[1], 22.6], S(k.extrude(ring, 21.6, 1.8, P, { convex: false }), { tone: "hi", crease: "lo", inner: L(k.ring(B[0], B[1], 6, 23.4, P, 24), { tone: "lo" }) }), [A.cylinder(B[0], B[1], 12.5, 21.6, 1.8, { name: "ratchet" })]);
  const sq = { x: B[0] - 2.4, y: B[1] - 2.4, w: 4.8, d: 4.8, r: 0.4 };
  put("ratchet.square", [B[0], B[1], 24.4], S(k.slabOf(sq, 23.4, 1.8, P, 2), { tone: "mid" }), [A.slab(sq, 23.4, 1.8, { name: "ratchet.square" })]);
  const clickAt = X.polar(B[0], B[1], 16.5, 2.2);
  const click = [X.polar(B[0], B[1], 12.4, 2.0), X.polar(B[0], B[1], 16, 1.92), X.polar(B[0], B[1], 18.2, 2.3), X.polar(B[0], B[1], 15, 2.32)];
  put("click", [clickAt[0], clickAt[1], 22.4], S(k.extrude(click, 21.6, 1.6, P), { tone: "mid" }), [A.extruded(click, 21.6, 1.6, { name: "click" })]);
  const screw = X.polar(B[0], B[1], 16.4, 2.15);
  put("click.screw", [screw[0], screw[1], 23.6], S(k.cylinder(screw[0], screw[1], 1.5, 23.2, 0.8, P, 16), { tone: "mid", inner: L(k.lineOnTop([screw[0] - 1, screw[1] + 0.3], [screw[0] + 1, screw[1] - 0.3], 24, P), { tone: "lo" }) }), [A.cylinder(screw[0], screw[1], 1.5, 23.2, 0.8, { name: "click.screw" })]);
}

// Bridges, pillars, pivots and bridge screws.
for (const br of BRIDGES) {
  const top = br.z + br.h;
  const inner = L(k.ringSeam(br.ring, br.z + br.h * 0.45, P), { tone: "faint" });
  const jewels = br.pivots.map(([x, y]) => L(k.ring(x, y, 2.1, top, P, 18), { tone: "lo" }) + D([at([x, y, top])], { size: 0.6, tone: "hi" })).join("");
  const [qx, qy] = br.pillar;
  const screw = L(k.ring(qx, qy, 2.4, top, P, 18), { tone: "lo" }) + L(k.lineOnTop([qx - 1.7, qy + 1.7], [qx + 1.7, qy - 1.7], top, P), { tone: "lo" });
  put(br.name, [qx * 0.5 + br.pivots[0][0] * 0.5, qy * 0.5 + br.pivots[0][1] * 0.5, br.z + br.h / 2], S(k.extrude(br.ring, br.z, br.h, P, { bevel: br.convex === false ? 0 : 0.5, convex: br.convex !== false }), { tone: "mid", inner }) + jewels + screw, [A.extruded(br.ring, br.z, br.h, { name: br.name })]);
  cyl(`${br.name}.pillar`, qx, qy, 3.6, 0, br.z, "mid", 28, { crease: "none", inner: L(k.sideArc(qx, qy, 3.6, 3, P, 16) + k.sideArc(qx, qy, 3.6, br.z - 3, P, 16), { tone: "faint" }) });
}

// Arbor shafts between the parts they carry.
const shaft = (name, [x, y], z0, z1, r = 0.9) => { if (z1 - z0 > 0.05) cyl(name, x, y, r, z0, z1 - z0, "mid", 14, { crease: "none" }); };
shaft("arbor.barrel.lo", B, 0, 2);
shaft("arbor.barrel.hi", B, 17.4, 18.6, 2.6);
shaft("arbor.centre.a", C, 0, 13);
shaft("arbor.centre.b", C, 20, 22);
shaft("arbor.centre.c", C, 23.4, Z.bridge);
shaft("arbor.centre.d", C, 49, 50);
shaft("arbor.third.a", T, 0, 20);
shaft("arbor.third.b", T, 26.6, 28);
shaft("arbor.third.c", T, 29.4, Z.bridge);
shaft("arbor.fourth.a", F, 0, 26);
shaft("arbor.fourth.b", F, 32.6, 34);
shaft("arbor.fourth.c", F, 35.4, Z.bridge);
shaft("arbor.escape.a", E, 0, 32, 0.8);
shaft("arbor.escape.b", E, 38.6, 40, 0.8);
shaft("arbor.escape.c", E, 40.8, Z.bridge, 0.8);
shaft("arbor.pallet.a", PA, 0, FORK.z - 0.1, 0.7);
shaft("arbor.pallet.b", PA, FORK.z + 2, 44.4, 0.7);
shaft("arbor.balance.a", BAL, 0, 41.4, 0.7);
shaft("arbor.balance.b", BAL, 43.2, 44, 0.9);
shaft("arbor.balance.c", BAL, 45.8, Z.cock, 0.7);
shaft("arbor.minute", M_AT, 49, 50.6, 0.8);
cyl("minute.cap", M_AT[0], M_AT[1], 1.4, 55.3, 0.7, "mid", 14);
// Hour pipe, minute arbor and cap above the motion work.
cyl("hour.pipe", C[0], C[1], 1.8, 55.1, 3.5, "mid", 18, { crease: "none" });
shaft("arbor.minute.top", C, 59.2, 59.8, 0.8);
cyl("minute.nut", C[0], C[1], 1.3, 60.4, 1, "mid", 14);
shaft("arbor.seconds", F, 50.6, 51.8, 0.6);

// Seconds dial on the train bridge.
{
  const top = 50.6;
  const ticks = k.radialTicks(F[0], F[1], 9.6, 60, 5, top, [0.9, 2], P);
  const inner = "";
  put("seconds.dial", [F[0], F[1], 49.8], S(k.cylinder(F[0], F[1], 10, 49, 1.6, P, 48, 0.4), { tone: "mid", crease: "lo", inner }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) + L(k.ring(F[0], F[1], 9.6, top, P, 48), { tone: "lo" }), [A.cylinder(F[0], F[1], 10, 49, 1.6, { name: "seconds.dial" })]);
}

// Roller table with impulse pin, under the balance.
cyl("roller", BAL[0], BAL[1], 3, 41.4, 1.8, "mid", 20);

// Balance and hairspring, fork, hands.
const b0 = state0.balance;
put("balance", [BAL[0], BAL[1], BALANCE.z + 1], live("balance", X.balanceSvg(K, P, BALANCE, b0)), [A.cylinder(BAL[0], BAL[1], BALANCE.r, BALANCE.z, BALANCE.h, { name: "balance" })]);
const stud = X.polar(BAL[0], BAL[1], BALANCE.spring, BALANCE.studAngle);
put("hairspring", [BAL[0], BAL[1], BALANCE.springZ], live("hairspring", L(X.hairspringD(K, P, BALANCE, b0), { tone: "mid" })), [A.cylinder(BAL[0], BAL[1], BALANCE.spring, BALANCE.springZ - 0.2, 0.4, { name: "hairspring" })]);
cyl("hairspring.collet", BAL[0], BAL[1], 2.4, 46.6, 1.4, "mid", 16);
cyl("hairspring.stud", stud[0], stud[1], 1.1, BALANCE.springZ - 0.6, Z.cock - BALANCE.springZ + 0.6, "mid", 12);
put("fork", [PA[0], PA[1], FORK.z + 0.6], live("fork", X.forkSvg(K, P, FORK, state0.fork)), [A.extruded(FORK.anchor.concat([[PA[0], PA[1]]]), FORK.z, 1.2, { name: "fork" })]);
put("hand.hour", [C[0], C[1], HANDS.hour.z], live("hour", X.handSvg(K, P, HANDS.hour, state0.hour)), [A.cylinder(C[0], C[1], HANDS.hour.len, HANDS.hour.z, HANDS.hour.h, { name: "hand.hour" })]);
put("hand.minute", [C[0], C[1], HANDS.minute.z], live("minuteHand", X.handSvg(K, P, HANDS.minute, state0.centre)), [A.cylinder(C[0], C[1], HANDS.minute.len, HANDS.minute.z, HANDS.minute.h, { name: "hand.minute" })]);
put("hand.seconds", [F[0], F[1], HANDS.seconds.z], live("seconds", X.handSvg(K, P, HANDS.seconds, state0.fourth)), [A.cylinder(F[0], F[1], HANDS.seconds.len, HANDS.seconds.z, HANDS.seconds.h, { name: "hand.seconds" })]);

// Chapter ring on three posts.
{
  const Fr = G.frameOf([C[0], C[1], Z.ringZ], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const top = Z.ringZ + Z.ringH;
  const ticks = k.radialTicks(C[0], C[1], RING_R[1] - 0.6, 60, 5, top, [1.5, 2.9], P);
  const svg = S(G.ringBand(0, Z.ringH, RING_R[0], RING_R[1], Fr, P, { hole: [Z.ringH, RING_R[0]] }), { tone: "hi", crease: "lo", className: "cr-ring" }) + L(k.lineOnTop(X.polar(C[0], C[1], RING_R[0] + 0.4, -0.035), X.polar(C[0], C[1], RING_R[1] - 0.6, -0.035), top, P) + k.lineOnTop(X.polar(C[0], C[1], RING_R[0] + 0.4, 0.035), X.polar(C[0], C[1], RING_R[1] - 0.6, 0.035), top, P), { tone: "hi" }) + L(k.ring(C[0], C[1], RING_R[1] - 0.6, top, P, 96), { tone: "lo" }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "hi" });
  put("chapter.ring", [C[0], C[1], Z.ringZ], svg, [A.ring(Fr, 0, Z.ringH, RING_R[0], RING_R[1], { name: "chapter.ring" })]);
  posts.forEach(([x, y], i) => {
    cyl(`chapter.post${i}`, x, y, 1.5, 0, Z.ringZ, "mid", 16, { crease: "none", inner: L(k.sideArc(x, y, 1.5, 3, P, 12), { tone: "faint" }) });
  });
}

// Winding key resting on the plate, its square socket sized for the barrel arbor.
{
  const KF = G.frameAlong([48, 38, 2.4], [1, 0, 0]);
  const profile = [[0, 2.4], [3.2, 2.4], [3.2, 1.5], [15, 1.5], [15, 2.4], [18, 2.4]];
  const shank = G.solidOf(profile, KF, P);
  const socket = L(G.circleOf(KF, 18, 1.3, P, 16), { tone: "lo" });
  put("key.shank", [57, 38, 2.4], S(shank, { tone: "mid", inner: L(G.arcOf(KF, 1.4, 2.4, P), { tone: "faint" }) }) + socket, [A.solid(KF, profile, { name: "key.shank" })]);
  const bow = [[38, 32.5], [42, 31.6], [48.4, 35.6], [48.4, 40.4], [42, 44.4], [38, 43.5], [36.6, 38]];
  put("key.bow", [43, 38, 2.4], `<path class="iso-halo" d="${k.extrude(bow, 0, 0.1, P).fill}" style="filter:blur(2px)"/>` + S(k.extrude(bow, 1.6, 1.6, P, { bevel: 0.4 }), { tone: "mid", inner: "" }) + L(k.ring(41.4, 38, 2.2, 3.2, P, 18), { tone: "lo" }), [A.extruded(bow, 1.6, 1.6, { name: "key.bow" })]);
}

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, { crowd: [] });
if (process.argv.includes("--keys")) console.log(R.items.map((i, n) => n + " " + i.name + " " + i.key.toFixed(2)).join("\n"));

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An open mechanical clock movement on a bench. A mainspring barrel drives a train of four wheels; the last, a 15-tooth escape wheel, is held by a pallet fork that a swinging balance wheel unlocks five times a second. The centre wheel carries the minute hand, the fourth wheel the seconds hand, and a 12:1 motion work the hour hand.",
  body: [base(), ...R.items.map((item) => item.svg)],
});

// ---- Live page code.
const partsSrc = readFileSync(join(HERE, "parts.mjs"), "utf8").replace(/^export /gm, "");
const liveSrc = `
${partsSrc}
const K = { extrude, solidSvg, lineSvg, dotsSvg, onTop, iso, ring, cylinder };
const P = ${JSON.stringify(P)};
const MODEL = ${JSON.stringify(MODEL)};
const W = ${JSON.stringify(W)};
const ROTOR = ${JSON.stringify(ROTOR)};
const PHASE = ${JSON.stringify(PHASE)};
const BALANCE = ${JSON.stringify(BALANCE)};
const FORK = ${JSON.stringify(FORK)};
const HANDS = ${JSON.stringify(HANDS)};
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const node = (id) => svgEl.querySelector('[data-live="' + id + '"]');
const nodes = {};
for (const id of [...Object.keys(W), "balance", "hairspring", "fork", "hour", "minuteHand", "seconds"]) nodes[id] = node(id);
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const RATE = [0.1, 60];
const logOf = (r) => Math.log(r);
const TOUR = [[1, 6], [0.1, 6], [1, 4], [60, 7]];
const tourLength = TOUR.reduce((s, [, d]) => s + d, 0);
const tourAt = (c) => { let t = c % tourLength; for (const [r, d] of TOUR) { if (t < d) return r; t -= d; } return 1; };
const now = new Date();
let t = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
let rate = 1, target = 1, touring = true, clock = 0, last = 0, frame = 0, visible = false, idleTimer = 0;
const drawn = {};
const changed = (id, v, eps) => { if (drawn[id] !== undefined && Math.abs(drawn[id] - v) < eps) return false; drawn[id] = v; return true; };
const ghosts = (fn, from, to, n) => {
  let out = "";
  for (let i = 0; i < n; i++) out += fn(from + ((to - from) * (i + 0.5)) / n, 1 / n);
  return out;
};
function draw(tPrev) {
  const s = stateOf(MODEL, t);
  for (const id of Object.keys(W)) {
    const g = W[id];
    const a = s[ROTOR[id]] + (PHASE[id] ?? 0) * (2 * Math.PI) / g.n;
    if (changed(id, a, 0.0015)) nodes[id].innerHTML = wheelSvg(K, P, g, a);
  }
  const beats = (t - tPrev) * 2 * MODEL.hz;
  if (beats > 0.6) {
    const n = 6;
    nodes.balance.innerHTML = ghosts((tt, al) => balanceSvg(K, P, BALANCE, stateOf(MODEL, tt).balance, al * 1.6), tPrev, t, n);
    nodes.hairspring.innerHTML = lineSvg(hairspringD(K, P, BALANCE, 0), { tone: "mid" });
    nodes.fork.innerHTML = ghosts((tt, al) => forkSvg(K, P, FORK, stateOf(MODEL, tt).fork, Math.min(1, al * 2)), tPrev, t, 2);
    drawn.balance = drawn.fork = undefined;
  } else {
    if (changed("balance", s.balance, 0.002)) {
      nodes.balance.innerHTML = balanceSvg(K, P, BALANCE, s.balance);
      nodes.hairspring.innerHTML = lineSvg(hairspringD(K, P, BALANCE, s.balance), { tone: "mid" });
    }
    if (changed("fork", s.fork, 0.0005)) nodes.fork.innerHTML = forkSvg(K, P, FORK, s.fork);
  }
  if (changed("hour", s.hour, 0.002)) nodes.hour.innerHTML = handSvg(K, P, HANDS.hour, s.hour);
  if (changed("minuteHand", s.centre, 0.002)) nodes.minuteHand.innerHTML = handSvg(K, P, HANDS.minute, s.centre);
  if (changed("seconds", s.fourth, 0.002)) nodes.seconds.innerHTML = handSvg(K, P, HANDS.seconds, s.fourth);
  // Readout: the time the hands show, the rate, and the beat.
  const day = ((t % 43200) + 43200) % 43200;
  const hh = Math.floor(day / 3600) || 12;
  const mm = Math.floor((day % 3600) / 60);
  const ss = Math.floor(day % 60);
  const pad = (v) => String(v).padStart(2, "0");
  const r = rate < 0.95 ? rate.toFixed(2).replace(/0$/, "") : rate < 9.5 ? rate.toFixed(1).replace(/\\.0$/, "") : String(Math.round(rate));
  const text = hh + ":" + pad(mm) + ":" + pad(ss) + " · ×" + r + " · " + (MODEL.hz * 2 * rate).toFixed(MODEL.hz * 2 * rate < 9.95 ? 1 : 0).replace(/\\.0$/, "") + " ticks/s";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", r);
  stage.setAttribute("aria-valuetext", text);
}
function tick(nowMs) {
  const dt = last ? Math.min((nowMs - last) / 1000, 1 / 20) : 1 / 60;
  last = nowMs;
  if (touring) { clock += dt; target = tourAt(clock); }
  const lr = logOf(rate) + (logOf(target) - logOf(rate)) * (1 - Math.exp(-dt / 0.45));
  rate = Math.exp(lr);
  const tPrev = t;
  t += dt * rate;
  draw(tPrev);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  target = Math.min(RATE[1], Math.max(RATE[0], next));
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = true; clock = 0; run(); }, 4000);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svgEl.getBoundingClientRect();
  const share = Math.min(1, Math.max(0, ((event.clientX - box.left) / box.width - 0.12) / 0.76));
  steer(Math.exp(logOf(RATE[0]) + share * (logOf(RATE[1]) - logOf(RATE[0]))));
});
stage.addEventListener("keydown", (event) => {
  const steps = [0.1, 0.25, 1, 4, 15, 60];
  const here = steps.reduce((best, v, i) => (Math.abs(Math.log(v / target)) < Math.abs(Math.log(steps[best] / target)) ? i : best), 0);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(steps.length - 1, here + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, here - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = steps.length - 1;
  if (to === null) return;
  event.preventDefault();
  steer(steps[to]);
});
draw(t);
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Clock movement",
  hint: "Move across to change the rate",
  readout: "12:00:00 · ×1 · 5 ticks/s",
  keys: [
    { mark: "lit", label: "Pallet fork: lets the train advance half a tooth per swing" },
    { mark: "raised", label: "Wheels: barrel → centre → third → fourth → escape" },
  ],
  caption:
    "The mainspring in the barrel pushes on the gear train, but the pallet fork holds the escape wheel still. Each time the balance swings through the middle (five times a second), it flicks the fork, which lets the wheel slip half a tooth and gives the balance a small push to keep it going. The gear ratios turn those ticks into time: the fourth wheel turns once a minute and carries the seconds hand, the centre wheel turns once an hour and carries the minute hand, and the motion work gears that down 12:1 to drive the hour hand. The clock starts at your local time.",
  body: `<style>.cr-ring>.iso-fill,.cr-ring>.iso-top,.cr-ring>.iso-shade{fill-rule:evenodd}</style><div class="iso-stage" tabindex="0" role="slider" aria-label="Clock movement: arrow keys change how fast time runs" aria-valuemin="0.1" aria-valuemax="60" aria-valuenow="1">${svg}</div>`,
});

const file = theme === "light" ? "clock-light.html" : "clock.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "Clock movement", theme, body, script: kitScript() + liveSrc }));
console.log("wrote", file, R.items.length, "items");
