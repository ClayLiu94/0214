// Moving parts of the clock movement. Pure functions of an angle, shared by the
// build (static first frame) and the page (rebuilt each frame). K is the kit.

export const TAU = Math.PI * 2;

// Angle 0 points to -y and grows clockwise seen from above, like radialTicks.
export const polar = (cx, cy, r, a) => [cx + Math.sin(a) * r, cy - Math.cos(a) * r];

// A spur gear or pinion: n trapezoid teeth on pitch radius r with module m.
export function gearRing(cx, cy, r, n, m, angle) {
  const tip = r + m;
  const root = r - 1.15 * m;
  const p = TAU / n;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = angle + i * p;
    out.push(polar(cx, cy, root, a - 0.3 * p), polar(cx, cy, r, a - 0.2 * p), polar(cx, cy, tip, a - 0.09 * p), polar(cx, cy, tip, a + 0.09 * p), polar(cx, cy, r, a + 0.2 * p), polar(cx, cy, root, a + 0.3 * p));
  }
  return out.reverse();
}

// Club-tooth escape wheel: teeth lean forward (anticlockwise drive).
export function escapeRing(cx, cy, r, n, angle) {
  const p = TAU / n;
  const root = r - 3.4;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = angle + i * p;
    out.push(polar(cx, cy, root, a + 0.42 * p), polar(cx, cy, r - 0.6, a + 0.06 * p), polar(cx, cy, r, a - 0.04 * p), polar(cx, cy, r - 0.5, a - 0.2 * p), polar(cx, cy, root + 0.6, a - 0.3 * p));
  }
  return out;
}

// Openings between the spokes of a crossed-out wheel, as closed outlines on its top face.
export function windows(K, P, cx, cy, rim, hub, spokes, z, angle) {
  const out = [];
  for (let s = 0; s < spokes; s++) {
    const a0 = angle + (s / spokes) * TAU;
    const a1 = a0 + TAU / spokes;
    const w = 1.3;
    const pts = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) pts.push(polar(cx, cy, rim, a0 + w / rim + ((a1 - a0 - (2 * w) / rim) * i) / steps));
    for (let i = 4; i >= 0; i--) pts.push(polar(cx, cy, hub, a0 + w / hub + ((a1 - a0 - (2 * w) / hub) * i) / 4));
    out.push(K.onTop(pts, z, P, true));
  }
  return out.join("");
}

// One wheel (or pinion) at a given angle, as SVG markup.
export function wheelSvg(K, P, g, angle) {
  const ring = g.kind === "escape" ? escapeRing(g.x, g.y, g.r, g.n, angle) : gearRing(g.x, g.y, g.r, g.n, g.m, angle);
  const top = g.z + g.h;
  let inner = "";
  if (g.spokes) {
    const rim = (g.kind === "escape" ? g.r - 3.2 : g.r - 1.15 * g.m) - g.rimW;
    const d = windows(K, P, g.x, g.y, rim, g.hub, g.spokes, top, angle);
    inner += `<path class="iso-shade" data-shade="0" d="${d}"/>` + K.lineSvg(d, { tone: g.lit ? "mid" : "lo" });
  }
  if (g.collet) inner += K.lineSvg(K.ring(g.x, g.y, g.collet, top, P, 24), { tone: "lo" });
  return K.solidSvg(K.extrude(ring, g.z, g.h, P, { convex: false }), { tone: g.tone ?? "hi", crease: "lo", lit: !!g.lit, inner });
}

// Balance wheel: a three-spoke rim with timing screws.
export function balanceSvg(K, P, b, angle, alpha = 1) {
  const top = b.z + b.h;
  const rim = b.r - 2.2;
  const d = windows(K, P, b.x, b.y, rim, 2.6, 3, top, angle);
  const screws = [];
  for (let i = 0; i < 12; i++) screws.push(K.iso([...polar(b.x, b.y, b.r - 1.1, angle + (i + 0.5) * (TAU / 12)), top], P));
  const inner = `<path class="iso-shade" data-shade="0" d="${d}"/>` + K.lineSvg(d, { tone: "lo" });
  const body = K.solidSvg(K.cylinder(b.x, b.y, b.r, b.z, b.h, P, 72), { tone: "hi", crease: "lo", inner }) + K.dotsSvg(screws, { size: 0.45, tone: "mid" });
  return alpha < 1 ? `<g opacity="${alpha.toFixed(2)}">${body}</g>` : body;
}

// Hairspring: inner end turns with the balance, outer end is pinned at the stud.
export function hairspringD(K, P, b, angle) {
  const turns = 7.5;
  const r0 = 2.4;
  const r1 = b.spring;
  const pts = [];
  const steps = 260;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const r = r0 + (r1 - r0) * f;
    pts.push(polar(b.x, b.y, r, b.studAngle - turns * TAU * (1 - f) + angle * (1 - f)));
  }
  return K.onTop(pts, b.springZ, P);
}

// Pallet fork: an anchor with two stones toward the escape wheel and a lever to the balance.
export function forkSvg(K, P, f, angle, alpha = 1) {
  const rot = ([x, y]) => {
    const dx = x - f.x;
    const dy = y - f.y;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [f.x + dx * c - dy * s, f.y + dx * s + dy * c];
  };
  const prism = (pts, z, h, opts = {}) => K.solidSvg(K.extrude(pts.map(rot), z, h, P), { tone: "hi", crease: "lo", lit: true, ...opts });
  const stadium = (a, b, r, n = 10) => {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = ang + Math.PI / 2 + (Math.PI * i) / n;
      pts.push([a[0] + Math.cos(t) * r, a[1] + Math.sin(t) * r]);
    }
    for (let i = 0; i <= n; i++) {
      const t = ang - Math.PI / 2 + (Math.PI * i) / n;
      pts.push([b[0] + Math.cos(t) * r, b[1] + Math.sin(t) * r]);
    }
    return pts;
  };
  const z = f.z;
  const parts = [];
  parts.push(prism([[f.x, f.y], ...f.anchor], z, 1.2));
  parts.push(prism(stadium([f.x, f.y], f.forkEnd, 1.3), z, 1.2));
  const [hx, hy] = f.forkEnd;
  const [ux, uy] = f.u;
  const horn = (side) => [[hx - uy * side * 1.1, hy + ux * side * 1.1], [hx + ux * 3 - uy * side * 2.6, hy + uy * 3 + ux * side * 2.6], [hx + ux * 3.6 - uy * side * 1.5, hy + uy * 3.6 + ux * side * 1.5], [hx + ux * 0.4 - uy * side * 0.2, hy + uy * 0.4 + ux * side * 0.2]];
  parts.push(prism(horn(1), z, 1.2), prism(horn(-1), z, 1.2));
  for (const stone of f.stones) parts.push(prism(stone, z - 1.6, 3, { lit: false, tone: "mid" }));
  parts.push(K.solidSvg(K.cylinder(f.x, f.y, 1.6, z + 1.2, 0.8, P, 16), { tone: "mid" }));
  const body = parts.join("");
  return alpha < 1 ? `<g opacity="${alpha.toFixed(2)}">${body}</g>` : body;
}

// A flat hand: tapered blade with a counterweight tail, lying on its plane.
export function handSvg(K, P, h, angle) {
  const pts = [];
  const local = [
    [0, -h.tail],
    [-h.w * 0.9, -h.tail + 0.4],
    [-h.w, 0],
    [-h.w * 0.55, h.len * 0.75],
    [0, h.len],
    [h.w * 0.55, h.len * 0.75],
    [h.w, 0],
    [h.w * 0.9, -h.tail + 0.4],
  ];
  for (const [u, v] of local) {
    const [px, py] = polar(0, 0, v, angle);
    const [qx, qy] = polar(0, 0, u, angle + Math.PI / 2);
    pts.push([h.x + px + qx, h.y + py + qy]);
  }
  return K.solidSvg(K.extrude(pts, h.z, h.h, P), { tone: "hi", crease: "lo", lit: !!h.lit }) + K.solidSvg(K.cylinder(h.x, h.y, h.boss, h.z, h.h + 0.4, P, 18), { tone: "mid" });
}

// The clock's model: everything follows from beats u = 2·f·t.
export function stateOf(M, t) {
  const u = t * 2 * M.hz;
  const v = u + M.window / 2;
  const i = Math.floor(v);
  const x = Math.min(1, (v - i) / M.window);
  const prog = i + x * x * (3 - 2 * x);
  const step = Math.PI / M.escTeeth;
  const fourth = prog * step / 10;
  const centre = fourth / 60;
  return {
    balance: M.amplitude * Math.sin(Math.PI * u),
    fork: M.forkSwing * Math.cos(Math.PI * prog),
    escape: -prog * step,
    fourth,
    third: -fourth / 7.5,
    centre,
    barrel: -centre / 8,
    minuteWheel: -centre * 3,
    hour: centre / 12,
  };
}
