/* Homepage world: hero → agent core · about → inside the core · stack → four skill rings
   work → one formation per project · path → timeline rail · contact → the whole route */
import { createWorld } from "../world.js";

createWorld({
  canvas: document.getElementById("scene3d"),
  build(w) {
    const { THREE, V, rr, rnd, randDir, formation, knnEdges, dust, screen, curve, D } = w;

    /* ---- stations 0/1: the agent core ---- */
    const CORE = V(0, 0, 0);
    (function core() {
      const R = 5, nodes = [];
      const N = Math.round(820 * D);
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) {
        const y = 1 - (2 * (i + 0.5)) / N, rad = Math.sqrt(1 - y * y), th = i * golden;
        nodes.push({ p: V(Math.cos(th) * rad, y, Math.sin(th) * rad).multiplyScalar(R * rr(0.97, 1.03)), s: rr(0.06, 0.11) });
      }
      const edges = knnEdges(nodes, 0, N, 3, 1.15);
      const hub0 = nodes.length;
      for (let i = 0; i < 14; i++) nodes.push({ p: randDir().multiplyScalar(rr(1.2, 3.6)), s: rr(0.2, 0.3) });
      const inner0 = nodes.length;
      for (let i = 0; i < Math.round(360 * D); i++) nodes.push({ p: randDir().multiplyScalar(Math.cbrt(rnd()) * 3.9), s: rr(0.035, 0.065) });
      const synapses = [];
      for (let h = hub0; h < inner0; h++) {
        for (let k = 0; k < 7; k++) { synapses.push(edges.length); edges.push([h, (rnd() * N) | 0]); }
        synapses.push(edges.length); edges.push([h, hub0 + ((rnd() * 14) | 0)]);
      }
      formation({ center: CORE, nodes, edges, pulseEdges: synapses, stations: [0, 1], spin: V(0, 0.045, 0), scatter: 9, pulses: 28, lineOpacity: 0.2 });
    })();

    /* ---- station 2: four skill rings ----
       compact 2x2 grid; at rest each ring faces the camera within ~25–45°, so none reads edge-on (reduced motion has no spin) */
    const STACK = V(0, 0, -26);
    [[-2.3, 1.8, 0.45, 0.25], [2.3, 1.8, -0.45, 0.72], [-2.3, -1.8, 0.55, 0.45], [2.3, -1.8, -0.75, -0.35]].forEach(([x, y, rx, ry], k) => {
      const nodes = [], edges = [], M = Math.round(150 * D), R = 1.5;
      const e = new THREE.Euler(rx, ry, 0);
      for (let i = 0; i < M; i++) {
        const a = (i / M) * Math.PI * 2;
        nodes.push({ p: V(Math.cos(a) * R + rr(-0.1, 0.1), Math.sin(a) * R + rr(-0.1, 0.1), rr(-0.15, 0.15)).applyEuler(e), s: i % 17 === 0 ? 0.2 : rr(0.05, 0.09) });
        edges.push([i, (i + 1) % M]);
        if (i % 9 === 0) edges.push([i, (i + ((M / 3) | 0)) % M]);
      }
      formation({ center: STACK.clone().add(V(x, y, 0)), nodes, edges, stations: [2], spin: V(0, 0, (k % 2 ? -1 : 1) * 0.12), scatter: 5, pulses: 6 });
    });

    /* ---- station 3: Nawras, a workflow graph of drag-and-drop blocks ---- */
    const NAW = V(9, -1.5, -44);
    (function nawras() {
      const nodes = [], edges = [], flow = [];
      const layers = [3, 4, 5, 4, 3, 2], blocks = [];
      layers.forEach((cnt, L) => {
        const col = [];
        for (let b = 0; b < cnt; b++) {
          const cx = (L - (layers.length - 1) / 2) * 1.35, cy = (b - (cnt - 1) / 2) * 0.9, cz = rr(-0.5, 0.5);
          const bw = 0.8, bh = 0.44, base = nodes.length, per = 14;
          for (let i = 0; i < per; i++) {
            const d = (i / per) * 2 * (bw + bh);
            let x, y;
            if (d < bw) { x = -bw / 2 + d; y = -bh / 2; } else if (d < bw + bh) { x = bw / 2; y = -bh / 2 + (d - bw); }
            else if (d < 2 * bw + bh) { x = bw / 2 - (d - bw - bh); y = bh / 2; } else { x = -bw / 2; y = bh / 2 - (d - 2 * bw - bh); }
            nodes.push({ p: V(cx + x, cy + y, cz), s: rr(0.05, 0.075) });
            edges.push([base + i, base + ((i + 1) % per)]);
          }
          const inP = nodes.length; nodes.push({ p: V(cx - bw / 2 - 0.08, cy, cz), s: 0.17 });
          const outP = nodes.length; nodes.push({ p: V(cx + bw / 2 + 0.08, cy, cz), s: 0.17 });
          col.push({ inP, outP });
        }
        blocks.push(col);
      });
      for (let L = 0; L < blocks.length - 1; L++) {
        blocks[L].forEach((b, i) => {
          const next = blocks[L + 1];
          const targets = new Set([Math.min(next.length - 1, Math.round((i / Math.max(1, blocks[L].length - 1)) * (next.length - 1)))]);
          if (rnd() < 0.6) targets.add((rnd() * next.length) | 0);
          targets.forEach((t) => { flow.push(edges.length); edges.push([b.outP, next[t].inP]); });
        });
      }
      // low wobble keeps the block outlines rectangular
      formation({ center: NAW, nodes, edges, pulseEdges: flow, stations: [3], scatter: 7, pulses: 16, lineOpacity: 0.3, wobble: 0.015 });
    })();

    /* ---- station 4: Nebras, an ontology of concepts around an agent hub ---- */
    const NEB = V(-9, 1.5, -62);
    (function nebras() {
      const nodes = [{ p: V(0, 0, 0), s: 0.34 }], edges = [], links = [];
      const C = 7, concepts = [];
      for (let c = 0; c < C; c++) {
        const d = randDir().multiplyScalar(rr(2.2, 2.8));
        concepts.push(nodes.length); nodes.push({ p: d, s: 0.24 });
        links.push(edges.length); edges.push([0, nodes.length - 1]);
        const ci = nodes.length - 1, L = Math.round(34 * D);
        for (let l = 0; l < L; l++) {
          nodes.push({ p: d.clone().add(randDir().multiplyScalar(rr(0.3, 1.0))), s: rr(0.045, 0.08) });
          const e = edges.length; edges.push([ci, nodes.length - 1]); if (l % 3 === 0) links.push(e);
        }
      }
      for (let c = 0; c < C; c++) { links.push(edges.length); edges.push([concepts[c], concepts[(c + 2) % C]]); }
      formation({ center: NEB, nodes, edges, pulseEdges: links, stations: [4], spin: V(0, -0.06, 0), scatter: 7, pulses: 22, lineOpacity: 0.24 });
    })();
    screen({ src: { light: "./assets/Nebras/nebras-chat.light.png", dark: "./assets/Nebras/nebras-chat.dark.png" },
      center: NEB.clone().add(V(1.3, -2.9, -2.2)), width: 5.6, stations: [4] });

    /* ---- station 5: BI Agent, a 3D bar chart on a data grid ---- */
    const BI = V(8, -1, -80);
    (function bi() {
      const nodes = [], edges = [], up = [];
      for (let gx = 0; gx < 12; gx++) for (let gz = 0; gz < 8; gz++)
        nodes.push({ p: V((gx - 5.5) * 0.55, -1.6, (gz - 3.5) * 0.55), s: 0.04 });
      for (let bx = 0; bx < 6; bx++) for (let bz = 0; bz < 3; bz++) {
        const h = 0.6 + Math.abs(Math.sin(bx * 1.3 + bz * 0.7)) * 2.8 + rr(0, 0.5);
        const x0 = (bx - 2.5) * 1.05, z0 = (bz - 1) * 1.05, bw = 0.34;
        const corners = [[-bw, -bw], [bw, -bw], [bw, bw], [-bw, bw]], tops = [];
        corners.forEach(([dx, dz]) => {
          const steps = Math.max(2, Math.round(h / 0.3));
          let prev = -1;
          for (let s = 0; s <= steps; s++) {
            const i = nodes.length;
            nodes.push({ p: V(x0 + dx, -1.6 + (s / steps) * h, z0 + dz), s: s === steps ? 0.1 : rr(0.04, 0.065) });
            if (prev >= 0) { up.push(edges.length); edges.push([prev, i]); }
            prev = i;
          }
          tops.push(prev);
        });
        for (let t = 0; t < 4; t++) edges.push([tops[t], tops[(t + 1) % 4]]);
      }
      formation({ center: BI, nodes, edges, pulseEdges: up, stations: [5], spin: V(0, 0.05, 0), scatter: 6, pulses: 18, lineOpacity: 0.26 });
    })();

    /* ---- stations 6–7: career path rail ---- */
    const railCurve = curve([V(-10, -1, -98), V(-3, 1.2, -104), V(3, -0.6, -112), V(10, 1.5, -121)]);
    (function rail() {
      const nodes = [], edges = [], run = [];
      const M = Math.round(260 * D);
      const center = railCurve.getPoint(0.5);
      for (let side = -1; side <= 1; side += 2) {
        const base = nodes.length;
        for (let i = 0; i < M; i++) {
          const t = i / (M - 1), p = railCurve.getPoint(t).sub(center);
          p.y += side * 0.28;
          nodes.push({ p, s: rr(0.045, 0.07) });
          if (i) { run.push(edges.length); edges.push([base + i - 1, base + i]); }
          if (side === 1 && i % 12 === 0) edges.push([i, base + i]);
        }
      }
      // one hub per role, its ring a gate the rail passes through (perpendicular to the rail, so it reads as a loop from the stations' cameras)
      [0.12, 0.5, 0.88].forEach((t) => {
        const c = railCurve.getPoint(t).sub(center), hub = nodes.length;
        const T = railCurve.getTangent(t), u = T.clone().cross(V(0, 1, 0)).normalize(), v = u.clone().cross(T).normalize();
        nodes.push({ p: c, s: 0.34 });
        for (let k = 0; k < 28; k++) {
          const a = (k / 28) * Math.PI * 2;
          nodes.push({ p: c.clone().addScaledVector(u, Math.cos(a) * 0.9).addScaledVector(v, Math.sin(a) * 0.9), s: 0.06 });
          edges.push([hub + 1 + k, hub + 1 + ((k + 1) % 28)]);
        }
      });
      formation({ center, nodes, edges, pulseEdges: run, stations: [6, 7], scatter: 6, pulses: 20, lineOpacity: 0.26, wobble: 0.02 });
    })();

    /* ---- ambient data dust along the whole route ---- */
    dust({ count: 2400, zFrom: 22, zTo: -130, sway: (z) => V(z < -40 ? Math.sin(z * 0.05) * 6 : 0, 0, 0) });

    return {
      stations: [
        // narrow: the core rides up behind the name and role, clear of the hero buttons
        { sel: ".hero", F: CORE, cam: V(0, 0.6, 18.5), shift: 0.4, narrowOffset: V(0, -2.7, 0) },
        { sel: "#about", F: V(0, 0, -7), cam: V(0.5, 0.2, 1.6), shift: 0.18, inside: true },
        { sel: "#stack", F: STACK, cam: STACK.clone().add(V(6.4, 2.1, 19.2)), shift: 0.35 },
        { sel: "#work .proj:nth-of-type(1)", F: NAW, cam: NAW.clone().add(V(4.2, 2.2, 18.2)), shift: 0.345 },
        // Nebras and BI are pulled back and pushed right so they stay clear of the 56–60% text column
        { sel: "#work .proj:nth-of-type(2)", F: NEB, cam: NEB.clone().add(V(-4.6, 1.4, 13.2)), shift: 0.36 },
        { sel: "#work .proj:nth-of-type(3)", F: BI, cam: BI.clone().add(V(6.2, 4.3, 13.6)), shift: 0.36 },
        // the rail is seen from behind its start, so it recedes up and to the right, away from the timeline column
        { sel: "#path .tl-item:first-of-type", F: railCurve.getPoint(0.2), cam: railCurve.getPoint(0.2).add(V(-7.8, 3.3, 13.6)), shift: 0.44 },
        // further along and up: the end hub ahead, the earlier rail sweeping in from below (clear of the contact headline)
        { sel: "#path .tl-item:last-of-type", F: railCurve.getPoint(0.84), cam: railCurve.getPoint(0.84).add(V(-9.6, 5.6, 14.2)), shift: 0.44 },
        // finale: the whole route as miniatures, lifted clear of the footer and kept right of the contact rows
        // (narrow: the route comes closer, centred, the core dropping into the open band below the contact rows)
        { sel: "#contact", F: V(0, -10, -56), cam: V(25.4, 55.6, 104.3), shift: 0.5, narrowScale: 0.75, narrowOffset: V(-5, 7, 0) },
      ],
      // the finale camera sits further out, so its fog starts later (the far end of the rail stays faintly visible)
      // narrow screens pull cameras back (narrowScale), so their fog starts later too
      fog: { narrowNear: 22, narrowFar: 58, finaleNear: 130, finaleFar: 290 },
    };
  },
});
