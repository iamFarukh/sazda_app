#!/usr/bin/env node
/**
 * Generates the original Lottie atmosphere accents for the home prayer card.
 *
 * These are authored programmatically (no external/licensed assets) so they are fully
 * original, reproducible, and tweakable. Run `node scripts/generate-prayer-lottie.js`
 * to regenerate the JSON in src/assets/lottie/prayer/.
 *
 * Each accent is a transparent-background, seamlessly-looping vector animation meant to
 * sit *behind* the card content as a subtle, premium ambient layer:
 *   - stars      → twinkling star field            (Night, Isha, Fajr)
 *   - particles  → soft dust motes drifting upward  (Dhuhr, Asr)
 *   - rays       → slow radiating light rays        (Sunrise, Dhuhr)
 *   - embers     → warm glints rising               (Maghrib)
 *
 * Colors are baked per-accent because each accent only ever renders over a sky whose
 * mood it already matches. Keep opacities low — these are ambience, never the subject.
 */
const fs = require('fs');
const path = require('path');

const FR = 30;
const OUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'lottie', 'prayer');

// Deterministic PRNG (mulberry32) so regenerating gives identical files — no churn.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Eased keyframe sets (gentle in/out). Single-dimension bezier — lottie applies it
// across all value dimensions, which is the most broadly compatible hand-authored form.
const EASE_IO = { i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } };

function scalarKeys(frames) {
  // 1-D properties: opacity, rotation. frames: [[t, value], ...]
  return {
    a: 1,
    k: frames.map(([t, s]) => ({ t, s: [s], ...EASE_IO })),
  };
}

function scaleKeys(frames) {
  // Transform scale must be multi-dimensional. frames: [[t, percent], ...]
  return {
    a: 1,
    k: frames.map(([t, s]) => ({ t, s: [s, s], ...EASE_IO })),
  };
}

function posKeys(frames) {
  // frames: [[t, x, y], ...]
  return {
    a: 1,
    k: frames.map(([t, x, y]) => ({ t, s: [x, y, 0], ...EASE_IO })),
  };
}

function still(value) {
  return { a: 0, k: value };
}

// Shape builders ------------------------------------------------------------
function ellipse(d) {
  return { ty: 'el', p: still([0, 0]), s: still([d, d]), d: 1 };
}
function fill(rgba) {
  return { ty: 'fl', c: still(rgba.slice(0, 3).concat([1])), o: still(rgba[3] ?? 100), r: 1, bm: 0 };
}
function roundRect(w, h, r) {
  return { ty: 'rc', p: still([0, 0]), s: still([w, h]), r: still(r), d: 1 };
}
function trGroup({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) {
  return { ty: 'tr', p: still(p), a: still(a), s: still(s), r: still(r), o: still(o), sk: still(0), sa: still(0) };
}
function group(items) {
  return { ty: 'gr', it: items };
}

function layer({ nm, op, ks, shapes }) {
  return { ddd: 0, ty: 4, nm, sr: 1, st: 0, ip: 0, op, bm: 0, ks, shapes };
}

function comp({ nm, w, h, op, layers }) {
  return { v: '5.9.0', fr: FR, ip: 0, op, w, h, nm, ddd: 0, assets: [], layers, meta: { g: 'sazda-prayer-atmosphere' } };
}

function write(name, data) {
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data));
  console.log('  wrote', name);
}

// 1. STARS — twinkling field ------------------------------------------------
function buildStars() {
  const W = 300, H = 300, OP = 150; // 5s loop
  const r = rng(101);
  const N = 30;
  const layers = [];
  for (let i = 0; i < N; i++) {
    const x = Math.round(r() * W);
    const y = Math.round(r() * H * 0.85);
    const d = 1.6 + r() * 2.6;
    const base = 12 + r() * 22; // dim baseline
    const peak = 55 + r() * 45;
    const phase = Math.round(r() * OP); // stagger the shimmer
    const mid = (phase + Math.round(OP * (0.35 + r() * 0.3))) % OP;
    // seamless: opacity returns to `base` at OP
    const frames = [[0, base], [phase, peak], [mid, base + 6], [OP, base]]
      .sort((a, b) => a[0] - b[0]);
    // de-dupe identical t
    const seen = new Set();
    const fr = frames.filter(([t]) => (seen.has(t) ? false : seen.add(t)));
    const warm = r() > 0.78;
    const col = warm ? [1, 0.93, 0.74] : [1, 1, 1];
    layers.push(
      layer({
        nm: `star${i}`,
        op: OP,
        ks: {
          o: scalarKeys(fr),
          r: still(0),
          p: still([x, y, 0]),
          a: still([0, 0, 0]),
          s: scaleKeys([[0, 100], [phase, 124], [OP, 100]]),
        },
        shapes: [group([ellipse(d), fill(col), trGroup()])],
      }),
    );
  }
  return comp({ nm: 'stars', w: W, h: H, op: OP, layers });
}

// 2. PARTICLES — soft motes drifting up ------------------------------------
function buildParticles(name, seed, color) {
  const W = 300, H = 360, OP = 300; // 10s loop
  const r = rng(seed);
  const N = 16;
  const layers = [];
  for (let i = 0; i < N; i++) {
    const x = Math.round(r() * W);
    const startY = H + 20 + r() * 60;
    const rise = 220 + r() * 180;
    const endY = startY - rise;
    const drift = (r() - 0.5) * 44;
    const d = 2 + r() * 4;
    const peakO = 26 + r() * 40;
    // Each layer stays active the whole loop (ip=0, op=OP) and moves linearly start→end.
    // Visibility is a staggered opacity "window" that is 0 at both loop ends, so the
    // position wrap (top→bottom) is never seen — a seamless, desynced drift.
    const a0 = r() * 0.45; // window start fraction
    const wl = 0.34 + r() * 0.5; // window length fraction
    const a1 = Math.min(a0 + wl, 0.985);
    const mid = (a0 + a1) / 2;
    const t = f => Math.round(f * OP);
    const o = scalarKeys([
      [0, 0],
      [t(a0), 0],
      [t(mid), peakO],
      [t(a1), 0],
      [OP, 0],
    ]);
    const p = posKeys([[0, x, startY], [OP, x + drift, endY]]);
    layers.push(
      layer({
        nm: `${name}${i}`,
        op: OP,
        ks: {
          o,
          r: still(0),
          p,
          a: still([0, 0, 0]),
          s: scaleKeys([[0, 80], [t(mid), 112], [OP, 80]]),
        },
        shapes: [group([ellipse(d), fill(color), trGroup()])],
      }),
    );
  }
  return comp({ nm: name, w: W, h: H, op: OP, layers });
}

// 3. RAYS — slow radiating light rays --------------------------------------
function buildRays() {
  const W = 300, H = 300, OP = 600; // 20s for one calm full rotation
  const N = 12;
  const rayItems = [];
  for (let i = 0; i < N; i++) {
    rayItems.push(
      group([
        roundRect(3, 150, 2),
        fill([1, 0.85, 0.45]),
        trGroup({ p: [0, -86], r: (360 / N) * i }),
      ]),
    );
  }
  // wrapper transform group rotates the whole fan; layer opacity breathes
  rayItems.push(trGroup());
  const fan = layer({
    nm: 'rayfan',
    op: OP,
    ks: {
      o: scalarKeys([[0, 14], [OP / 2, 30], [OP, 14]]),
      r: scalarKeys([[0, 0], [OP, 360]]),
      p: still([W / 2, H / 2, 0]),
      a: still([0, 0, 0]),
      s: scaleKeys([[0, 96], [OP / 2, 104], [OP, 96]]),
    },
    shapes: [group(rayItems)],
  });
  // soft central glow
  const glow = layer({
    nm: 'core',
    op: OP,
    ks: {
      o: scalarKeys([[0, 28], [OP / 2, 46], [OP, 28]]),
      r: still(0),
      p: still([W / 2, H / 2, 0]),
      a: still([0, 0, 0]),
      s: scaleKeys([[0, 100], [OP / 2, 116], [OP, 100]]),
    },
    shapes: [group([ellipse(60), fill([1, 0.9, 0.6]), trGroup()])],
  });
  return comp({ nm: 'rays', w: W, h: H, op: OP, layers: [fan, glow] });
}

// Generate ------------------------------------------------------------------
fs.mkdirSync(OUT_DIR, { recursive: true });
console.log('Generating prayer atmosphere Lottie accents →', path.relative(process.cwd(), OUT_DIR));
write('stars.json', buildStars());
write('particles.json', buildParticles('particles', 202, [1, 1, 1]));
write('embers.json', buildParticles('embers', 303, [1, 0.78, 0.42]));
write('rays.json', buildRays());
console.log('Done.');
