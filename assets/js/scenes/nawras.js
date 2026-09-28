/* Nawras case-study world
     hero          → the workflow canvas: a layered DAG of drag-and-drop blocks on a dot grid, one block mid-drag
     overview      → demo vs production: a loose tangle pulled through a gate into ordered, flowing lanes
     capabilities  → the router: one gateway hub with provider rings in orbit, wired to a knowledge-graph / vector cloud
     how 01 → 05   → the run pipeline: a rail through five stage glyphs (Compose, Route, Ground, Guard, Trace);
                     the camera rides it from the first stage to the last
     gallery       → eval and tracing: a trace waterfall of span bars feeding an eval score ring
     outcome       → the reusable core: stacked platform layers branching into Nebras (ontology) and the BI Agent (bars)
     next          → finale: the whole route as one constellation */
import { createWorld } from "../world.js";

createWorld({
  canvas: document.getElementById("scene3d"),
  build(w) {
    const { THREE, V, rr, rnd, randDir, formation, knnEdges, dust, curve, D } = w;
    const TAU = Math.PI * 2;

    /* drawing helpers: g = { nodes, edges }; `list` collects edge indices that carry signals */
    const add = (g, p, s) => (g.nodes.push({ p, s }), g.nodes.length - 1);
    const link = (g, a, b, list) => { if (list) list.push(g.edges.length); g.edges.push([a, b]); };
    function path(g, pts, size, closed = false, list) {
      const base = g.nodes.length;
      pts.forEach((p) => add(g, p, typeof size === "function" ? size() : size));
      for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) link(g, base + i, base + ((i + 1) % pts.length), list);
      return base;
    }
    /* n evenly spaced points along a polyline */
    function resample(verts, n, closed = false) {
      const vs = closed ? [...verts, verts[0]] : verts, lens = [];
      let total = 0;
      for (let i = 0; i < vs.length - 1; i++) { const l = vs[i].distanceTo(vs[i + 1]); lens.push(l); total += l; }
      const pts = [];
      for (let k = 0; k < n; k++) {
        let d = (k / (closed ? n : n - 1)) * total, i = 0;
        while (i < lens.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
        pts.push(vs[i].clone().lerp(vs[i + 1], Math.min(1, d / (lens[i] || 1))));
      }
      return pts;
    }
    const rect = (w2, h2) => [V(-w2, -h2, 0), V(w2, -h2, 0), V(w2, h2, 0), V(-w2, h2, 0)];
    const circle = (n, r, c = V(0, 0, 0)) => Array.from({ length: n }, (_, i) => V(c.x + Math.cos((i / n) * TAU) * r, c.y + Math.sin((i / n) * TAU) * r, c.z));
    /* small outlines (blocks, rings, shield, bars) look lumpy with the engine's default idle wobble (0.05),
       so these formations use a quarter-strength shimmer */
    const crisp = (spec) => formation({ ...spec, wobble: 0.025 });

    /* ---- station 0: the workflow canvas ---- */
    const FLOW = V(2, 0, 0);
    (function workflow() {
      const g = { nodes: [], edges: [] }, flow = [];
      // the canvas' dot grid behind the blocks: no wider than the block layers, nudged right so it sits centred under
      // them from the camera's left-hand view (keep the dot count: every later formation's shape comes from the
      // same seeded random sequence)
      const gx = Math.round(23 * Math.sqrt(D)), gy = Math.round(13 * Math.sqrt(D));
      for (let i = 0; i < gx; i++) for (let j = 0; j < gy; j++)
        add(g, V((i / (gx - 1) - 0.5) * 6.8 + 0.3, (j / (gy - 1) - 0.5) * 5.0, -1.15), rr(0.045, 0.06));
      const layers = [2, 3, 4, 5, 4, 3, 2], LX = 1.0, BY = 0.9, bw = 0.8, bh = 0.44;
      const outline = resample(rect(bw / 2, bh / 2), 18, true);
      const blocks = layers.map((cnt, L) => {
        const col = [];
        for (let b = 0; b < cnt; b++) {
          const dragged = L === 3 && b === 3; // one block lifted off the canvas mid-drag
          const c = V((L - (layers.length - 1) / 2) * LX + rr(-0.06, 0.06), (b - (cnt - 1) / 2) * BY + rr(-0.05, 0.05), dragged ? 1.8 : rr(-0.3, 0.3));
          if (dragged) outline.forEach((p, i) => { if (i % 2 === 0) add(g, p.clone().add(V(c.x - 0.12, c.y - 0.1, -1.8)), 0.045); }); // its empty slot on the canvas
          path(g, outline.map((p) => p.clone().add(c)), () => rr(0.05, 0.072), true);
          path(g, [0, 1, 2, 3].map((i) => V(c.x - bw / 2 + 0.12 + (i * (bw - 0.24)) / 3, c.y + bh / 2 - 0.13, c.z)), 0.04); // header strip
          const inP = L > 0 ? add(g, V(c.x - bw / 2 - 0.08, c.y, c.z), 0.17) : -1;
          const outP = L < layers.length - 1 ? add(g, V(c.x + bw / 2 + 0.08, c.y, c.z), 0.17) : -1;
          col.push({ inP, outP });
        }
        return col;
      });
      // connectors: every block feeds the next layer; signals flow left → right
      const wire = (a, b) => {
        const A = g.nodes[a].p, B = g.nodes[b].p;
        for (let k = 1; k < 5; k++) add(g, A.clone().lerp(B, k / 5), 0.04);
        link(g, a, b, flow);
      };
      for (let L = 0; L < blocks.length - 1; L++) {
        const cur = blocks[L], next = blocks[L + 1], fed = new Set();
        cur.forEach((b, i) => {
          const t = Math.round((i / Math.max(1, cur.length - 1)) * (next.length - 1)), targets = new Set([t]);
          if (rnd() < 0.55) targets.add(Math.max(0, Math.min(next.length - 1, t + (rnd() < 0.5 ? -1 : 1))));
          targets.forEach((j) => { fed.add(j); wire(b.outP, next[j].inP); });
        });
        next.forEach((b, j) => { if (!fed.has(j)) wire(cur[Math.round((j / Math.max(1, next.length - 1)) * (cur.length - 1))].outP, b.inP); });
      }
      crisp({ center: FLOW, nodes: g.nodes, edges: g.edges, pulseEdges: flow, stations: [0], scatter: 8, pulses: 28, lineOpacity: 0.34 });
    })();

    /* ---- station 1: demo vs production ---- */
    const GAP = V(-7, 1.2, -25);
    (function gap() {
      const g = { nodes: [], edges: [] }, mess = [], lanes = [];
      // the demo: a loose tangle, a wire balled up on itself with brittle dead ends
      const T = V(-1.95, 0, 0.3), ctrl = [];
      for (let i = 0; i < 24; i++) ctrl.push(T.clone().add(randDir().multiplyScalar(rr(0.3, 1.2))));
      ctrl.push(V(-0.9, 0, 0), V(-0.3, 0, 0));
      const tangle = curve(ctrl), M = Math.round(430 * D), w0 = g.nodes.length;
      for (let i = 0; i < M; i++) {
        add(g, tangle.getPoint(i / (M - 1)).add(randDir().multiplyScalar(rr(0, 0.05))), rr(0.042, 0.07));
        if (i) link(g, w0 + i - 1, w0 + i, i % 10 === 0 ? mess : null);
      }
      for (let i = 0; i < 9; i++) g.nodes[w0 + ((rnd() * (M - 30)) | 0)].s = rr(0.16, 0.21);
      for (let i = 0, S = Math.round(70 * D); i < S; i++) add(g, T.clone().add(randDir().multiplyScalar(rr(1.05, 1.8))), rr(0.03, 0.055));
      // the gate it is pulled through (turned towards the viewer so it reads as a ring)
      const gateRot = new THREE.Euler(0, -0.75, 0);
      const g0 = path(g, circle(52, 1.0).map((p) => V(0, p.x, p.y).applyEuler(gateRot).add(V(-0.3, 0, 0))), () => rr(0.05, 0.075), true);
      for (let i = 0; i < 4; i++) g.nodes[g0 + i * 13].s = 0.2;
      // production: ordered lanes with aligned checkpoints, receding into depth, signals flowing steadily
      const end = w0 + M - 1, X0 = 0.3, X1 = 3.5, stages = 5;
      const rows = [[0.54, 0.22], [0.18, -0.22], [-0.18, 0.22], [-0.54, -0.22]].map(([y, z]) => {
        const cps = [];
        for (let s = 0; s < stages; s++) { const x = X0 + ((X1 - X0) * s) / (stages - 1); cps.push(add(g, V(x, y, z - x * 0.45), s === stages - 1 ? 0.2 : s === 0 ? 0.17 : 0.11)); }
        for (let s = 0; s < stages - 1; s++) {
          const A = g.nodes[cps[s]].p, B = g.nodes[cps[s + 1]].p;
          for (let k = 1; k < 6; k++) add(g, A.clone().lerp(B, k / 6), 0.042);
          link(g, cps[s], cps[s + 1], lanes);
        }
        link(g, end, cps[0], lanes);
        return cps;
      });
      for (let r = 0; r < rows.length - 1; r++) for (let s = 0; s < stages; s++) link(g, rows[r][s], rows[r + 1][s]);
      formation({ center: GAP, nodes: g.nodes, edges: g.edges, pulseEdges: [...lanes, ...lanes, ...lanes, ...mess], stations: [1], scatter: 7, pulses: 26, lineOpacity: 0.26 });
    })();

    /* ---- station 2: multi-provider router + knowledge (RAG / Graph RAG) ---- */
    const CAP = V(7, -1, -42);
    const GATE = CAP.clone().add(V(-0.9, 0.7, 0));
    (function router() {
      const g = { nodes: [], edges: [] }, fan = [];
      const hub = add(g, V(0, 0, 0), 0.34);
      const golden = Math.PI * (3 - Math.sqrt(5)), S = Math.round(90 * D), s0 = g.nodes.length;
      for (let i = 0; i < S; i++) {
        const y = 1 - (2 * (i + 0.5)) / S, r = Math.sqrt(1 - y * y), th = i * golden;
        add(g, V(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(0.62), rr(0.045, 0.075));
      }
      knnEdges(g.nodes, s0, s0 + S, 2, 0.42).forEach(([a, b]) => link(g, a, b));
      const OR = 2.0; // dotted orbit the providers ride
      circle(Math.round(130 * D), OR).forEach((p) => add(g, p, rr(0.04, 0.055)));
      [0.5, 0.64, 0.45, 0.6, 0.54].forEach((R, k) => {
        const a = (k / 5) * TAU + 0.35, c = V(Math.cos(a) * OR, Math.sin(a) * OR, 0);
        const pc = add(g, c, 0.24);
        link(g, hub, pc, fan);
        const e = new THREE.Euler(rr(-0.55, 0.55), rr(-0.55, 0.55), rr(0, TAU)); // gentle tilt so each still reads as a ring
        const r0 = path(g, circle(34, R).map((p) => p.applyEuler(e).add(c)), () => rr(0.045, 0.07), true);
        if (k % 2 === 0) path(g, circle(18, R * 0.55).map((p) => p.applyEuler(e).add(c)), 0.045, true);
        for (let i = 0; i < 3; i++) link(g, pc, r0 + i * 11);
      });
      formation({ center: GATE, nodes: g.nodes, edges: g.edges, pulseEdges: fan, stations: [2], spin: V(0, 0, 0.07), scatter: 7, pulses: 16, lineOpacity: 0.24 });
    })();
    (function knowledge() {
      const g = { nodes: [], edges: [] }, sig = [];
      const C = V(0.9, -2.2, -1.6), N = Math.round(300 * D);
      for (let i = 0; i < N; i++) { const d = randDir(), r = Math.cbrt(rnd()); add(g, C.clone().add(V(d.x * 1.55 * r, d.y * r, d.z * r)), rr(0.032, 0.058)); }
      const e0 = g.nodes.length, E = 16;
      for (let i = 0; i < E; i++) { const d = randDir().multiplyScalar(rr(0.25, 1)); add(g, C.clone().add(V(d.x * 1.3, d.y * 0.8, d.z * 0.8)), i < 5 ? rr(0.17, 0.22) : rr(0.1, 0.14)); }
      knnEdges(g.nodes, e0, e0 + E, 3, 1.7).forEach(([a, b]) => link(g, a, b, sig)); // the knowledge graph
      for (let i = e0; i < e0 + E; i++) { // each entity anchors its nearest embeddings
        const near = [];
        for (let j = 0; j < N; j++) near.push([g.nodes[i].p.distanceToSquared(g.nodes[j].p), j]);
        near.sort((a, b) => a[0] - b[0]);
        for (let m = 0; m < 4; m++) link(g, i, near[m][1]);
      }
      // retrieval runs between the gateway hub and three different entities: two queries out, one context back
      const hubAt = GATE.clone().sub(CAP);
      [[-0.15, true], [0, false], [0.15, true]].forEach(([o, out], k) => {
        const port = add(g, hubAt.clone().add(V(o, -o, 0)), 0.001), ent = e0 + k * 2;
        if (out) link(g, port, ent, sig); else link(g, ent, port, sig);
      });
      formation({ center: CAP, nodes: g.nodes, edges: g.edges, pulseEdges: sig, stations: [2], scatter: 6, pulses: 14, lineOpacity: 0.22 });
    })();

    /* ---- stations 3–4: the run pipeline, five stage glyphs on a rail ---- */
    // the rail zig-zags up into depth: from station 3 every stage is separate, and at station 4 the earlier stages
    // are behind the camera or to the right of Trace, so the rail enters from the bottom right (never under the text)
    const MK = [V(-6, -0.6, -55), V(-7, -0.8, -62), V(-3.1, -1.1, -67.5), V(-0.4, -0.7, -71.5), V(-2.1, -0.4, -75.5)];
    const railCurve = curve([MK[0].clone().add(V(-1.8, -0.3, 2.2)), ...MK, MK[4].clone().add(V(3.2, 0.2, -1.4))]);
    const RAIL = MK.reduce((a, b) => a.add(b), V(0, 0, 0)).multiplyScalar(1 / MK.length);
    const F3 = MK[0].clone().lerp(MK[1], 0.5).add(V(0, 1.3, 0)), F4 = MK[4].clone().add(V(0, 1.3, 0));
    const CAM3 = F3.clone().add(V(-1.9, 6.5, 12.1)), CAM4 = F4.clone().add(V(-5, 7.2, 7.2)); // station 4 cranes up over the monitor
    const LIFT = V(0, 2.15, 0), GS = 1.2; // glyphs float above their stage marker, scaled up
    const glyphs = [
      function compose(g, T, sig) { // three blocks wired into a branch
        const box = resample(rect(0.32, 0.18), 14, true);
        const ports = [V(-0.7, 0, 0), V(0.62, 0.48, 0), V(0.62, -0.48, 0)].map((c) => {
          path(g, box.map((p) => T(p.clone().add(c))), () => rr(0.05, 0.07), true);
          return [add(g, T(c.clone().add(V(-0.4, 0, 0))), 0.16), add(g, T(c.clone().add(V(0.4, 0, 0))), 0.16)];
        });
        link(g, ports[0][1], ports[1][0], sig); link(g, ports[0][1], ports[2][0], sig);
      },
      function route(g, T, sig) { // one gateway fanning out to three providers
        const inp = add(g, T(V(-0.95, 0, 0)), 0.12), hub = add(g, T(V(-0.3, 0, 0)), 0.24);
        link(g, inp, hub, sig);
        [[0.7, 0.62], [0.85, 0], [0.7, -0.62]].forEach(([x, y]) => {
          link(g, hub, add(g, T(V(x, y, 0)), 0.1), sig);
          path(g, circle(14, 0.22, V(x, y, 0)).map(T), 0.05, true);
        });
      },
      function ground(g, T0, sig) { // a vector store with retrieved chunks rising out of it
        const tip = new THREE.Euler(0.5, 0, 0), T = (p) => T0(p.clone().applyEuler(tip)); // tipped towards the viewer so the rings open up
        const rings = [-0.55, 0, 0.55].map((y) => path(g, circle(30, 0.72).map((p) => T(V(p.x, y, p.y))), () => rr(0.048, 0.07), true));
        [0, 8, 15, 23].forEach((i) => { link(g, rings[0] + i, rings[1] + i); link(g, rings[1] + i, rings[2] + i); });
        const top = add(g, T(V(0, 0.55, 0)), 0.18);
        for (let i = 0; i < 4; i++) link(g, top, add(g, T(V(rr(-0.4, 0.4), 0.85 + i * 0.18, rr(-0.2, 0.2))), 0.07), sig);
      },
      function guard(g, T) { // a shield with a check
        const right = [V(0, 0.9, 0), V(0.72, 0.7, 0), V(0.72, 0.08, 0)];
        for (let i = 1; i <= 6; i++) { const t = i / 6, u = 1 - t; right.push(V(u * u * 0.72 + 2 * u * t * 0.66, u * u * 0.08 + 2 * u * t * -0.6 + t * t * -0.95, 0)); }
        const left = right.slice(1, -1).reverse().map((p) => V(-p.x, p.y, 0));
        path(g, resample([...right, ...left], 56, true).map(T), () => rr(0.05, 0.07), true);
        path(g, resample([V(-0.32, 0.02, 0), V(-0.08, -0.26, 0), V(0.38, 0.32, 0)], 12).map(T), 0.09);
      },
      function trace(g, T, sig) { // a monitor with a live heartbeat
        path(g, resample(rect(1.05, 0.6), 40, true).map(T), () => rr(0.045, 0.065), true);
        const ekg = [V(-0.85, -0.05, 0), V(-0.35, -0.05, 0), V(-0.2, 0.32, 0), V(-0.04, -0.4, 0), V(0.14, 0.45, 0), V(0.3, -0.14, 0), V(0.4, -0.05, 0), V(0.85, -0.05, 0)];
        const pts = resample(ekg, 34), e0 = path(g, pts.map(T), 0.06, false, sig);
        [2, 3, 4].forEach((v) => { let best = 0; pts.forEach((p, i) => { if (p.distanceTo(ekg[v]) < pts[best].distanceTo(ekg[v])) best = i; }); g.nodes[e0 + best].s = 0.17; });
      },
    ];
    (function pipeline() {
      const g = { nodes: [], edges: [] }, run = [], sig = [];
      const loc = (p) => p.clone().sub(RAIL);
      const M = Math.round(200 * D);
      for (const side of [-1, 1]) { // a double rail with ties
        const base = g.nodes.length;
        for (let i = 0; i < M; i++) {
          const p = loc(railCurve.getPointAt(i / (M - 1)));
          p.y += side * 0.2;
          add(g, p, rr(0.042, 0.065));
          if (i) link(g, base + i - 1, base + i);
        }
      }
      for (let i = 0; i < M; i += 8) link(g, i, M + i);
      const up = V(0, 1, 0);
      const marks = MK.map((m, k) => {
        const hub = add(g, loc(m), 0.28);
        const tan = MK[Math.min(4, k + 1)].clone().sub(MK[Math.max(0, k - 1)]).normalize(), side = tan.clone().cross(up).normalize();
        path(g, circle(24, 0.5).map((p) => loc(m).addScaledVector(up, p.x).addScaledVector(side, p.y)), 0.055, true);
        for (let s = 0; s < 5; s++) add(g, loc(m).add(V(0, 0.4 + s * 0.17, 0)), 0.035); // stem up to the glyph
        const c = m.clone().add(LIFT);
        // each glyph turns to the camera that shows it; Trace is seen from both stations, so it splits the difference
        const face = CAM3.clone().sub(c).normalize().add(k === 4 ? CAM4.clone().sub(c).normalize() : V(0, 0, 0));
        const R = new THREE.Matrix4().lookAt(c.clone().add(face), c, up).scale(V(GS, GS, GS)).setPosition(loc(c));
        glyphs[k](g, (p) => p.clone().applyMatrix4(R), sig);
        return hub;
      });
      // signals ride the centre line from stage to stage (the curve has one lead-in point, so MK[k] sits at segment k + 1)
      for (let k = 0; k < MK.length - 1; k++) {
        const mid = add(g, loc(railCurve.getPoint((k + 1.5) / (MK.length + 1))), 0.06);
        link(g, marks[k], mid, run); link(g, mid, marks[k + 1], run);
      }
      crisp({ center: RAIL, nodes: g.nodes, edges: g.edges, pulseEdges: [...run, ...run, ...sig], stations: [3, 4], scatter: 7, pulses: 26, lineOpacity: 0.26 });
    })();

    /* ---- station 5: eval and tracing ---- */
    const EVAL = V(-7, 3.5, -102); // deep and a little high: above the frame of station 4's downward look, so it never ghosts behind the steps
    (function evalTrace() {
      const g = { nodes: [], edges: [] }, sig = [];
      // a trace waterfall: one span per step, staggered in time like a tracing UI
      // [start, length] as fractions of the run; row 0 is the whole run, rows 4–5 are retrieval's parallel children
      const W = 3.6, X0 = -0.8 - W / 2, top = 1.55, rowH = 0.38;
      const spans = [[0, 1], [0.02, 0.17], [0.2, 0.1], [0.31, 0.2], [0.33, 0.1], [0.4, 0.11], [0.52, 0.29], [0.82, 0.07], [0.9, 0.1]];
      const ends = spans.map(([s, l], row) => {
        const y = top - row * rowH, z = -row * 0.06, x0 = X0 + s * W, x1 = X0 + (s + l) * W;
        const n = Math.max(3, Math.round((x1 - x0) / 0.07)); // a dense 5-row band so each span reads as a solid bar
        for (let i = 0; i <= n; i++) for (const dy of [-0.1, -0.05, 0, 0.05, 0.1]) add(g, V(x0 + ((x1 - x0) * i) / n, y + dy, z), rr(0.04, 0.055));
        const a = add(g, V(x0, y, z), 0.17), b = add(g, V(x1, y, z), 0.09);
        link(g, a, b, sig); // a signal runs the length of each span
        return [a, b];
      });
      // causality: the run starts step one, each step hands over to the next, retrieval fans out in parallel
      link(g, ends[0][0], ends[1][0], sig);
      [1, 2, 3, 6, 7, 8].forEach((r, i, seq) => { if (i < seq.length - 1) link(g, ends[r][1], ends[seq[i + 1]][0], sig); });
      link(g, ends[3][0], ends[4][0], sig); link(g, ends[3][0], ends[5][0], sig);
      const rootEnd = ends[0][1];
      for (let i = 0; i <= 36; i++) add(g, V(X0 + (W * i) / 36, top + 0.42, 0.1), i % 4 === 0 ? 0.06 : 0.03); // time axis
      for (let i = 0; i < 24; i++) add(g, V(X0 + 0.74 * W, top + 0.45 - (i / 23) * (spans.length * rowH + 0.3), 0), 0.036); // cursor
      // the eval score ring
      const RC = V(1.9, 0.45, -0.6), RR = 0.95, score = 0.86;
      circle(48, RR, RC).forEach((p) => add(g, p, 0.02)); // faint full track, so the 14% gap in the score arc shows
      circle(24, RR * 0.78, RC).forEach((p) => add(g, p, 0.05));
      const A = Math.round(72 * score), arc = [];
      for (let i = 0; i <= A; i++) { const a = Math.PI / 2 - (i / 72) * TAU; arc.push(V(RC.x + Math.cos(a) * RR, RC.y + Math.sin(a) * RR, RC.z)); }
      const a0 = path(g, arc, () => rr(0.09, 0.12), false, sig);
      g.nodes[a0].s = 0.16; g.nodes[a0 + A].s = 0.3;
      path(g, circle(16, 0.3, RC), 0.05, true);
      add(g, RC.clone(), 0.2);
      link(g, rootEnd, a0, sig); // traces feed the evaluation
      crisp({ center: EVAL, nodes: g.nodes, edges: g.edges, pulseEdges: sig, stations: [5], scatter: 7, pulses: 22, lineOpacity: 0.26 });
    })();

    /* ---- station 6: the reusable core, branching into Nebras and the BI Agent ---- */
    const REUSE = V(7, -0.5, -118);
    (function reuse() {
      const g = { nodes: [], edges: [] }, sig = [];
      const K = V(-1.8, -0.2, 0), rot = new THREE.Euler(0, Math.PI / 4, 0);
      const sq = resample([V(-0.8, 0, -0.8), V(0.8, 0, -0.8), V(0.8, 0, 0.8), V(-0.8, 0, 0.8)], 28, true);
      const LY = 0.7;
      [-LY, 0, LY].forEach((y) => { // three stacked platform slabs, corners marked so each reads as a distinct layer
        const s0 = path(g, sq.map((p) => p.clone().applyEuler(rot).add(K).add(V(0, y, 0))), () => rr(0.05, 0.07), true);
        for (let c = 0; c < 4; c++) g.nodes[s0 + c * 7].s = 0.1;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== 1 || j !== 1) add(g, V((i - 1) * 0.42, y, (j - 1) * 0.42).applyEuler(rot).add(K), 0.04);
      });
      const core = add(g, K.clone().add(V(0, LY, 0)), 0.32);
      const mid = add(g, K.clone(), 0.12), foot = add(g, K.clone().add(V(0, -LY, 0)), 0.12);
      link(g, core, mid, sig); link(g, mid, foot, sig); // the core's spine
      const branch = (to, via) => { // dotted curve with signals riding three chords
        const pts = curve([g.nodes[core].p.clone(), via, g.nodes[to].p.clone()]).getSpacedPoints(18);
        pts.slice(1, -1).forEach((p, i) => { if (i % 6 !== 5) add(g, p, 0.036); });
        const k1 = add(g, pts[6], 0.07), k2 = add(g, pts[12], 0.07);
        link(g, core, k1, sig); link(g, k1, k2, sig); link(g, k2, to, sig);
      };
      // Nebras: a small ontology around an agent hub
      // six concepts on a tilted ring around the hub, each with a few instances, related to their neighbours
      const NB = V(1.7, 1.6, -0.6), nh = add(g, NB, 0.28), concepts = [], tilt = new THREE.Euler(0.5, 0, 0.3);
      for (let c = 0; c < 6; c++) {
        const a = (c / 6) * TAU, d = V(Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85).applyEuler(tilt), ci = add(g, NB.clone().add(d), 0.16);
        concepts.push(ci); link(g, nh, ci, sig);
        for (let l = 0, L = Math.max(4, Math.round(6 * D)); l < L; l++) link(g, ci, add(g, NB.clone().add(d).add(randDir().multiplyScalar(rr(0.15, 0.28))), rr(0.035, 0.06)));
      }
      for (let c = 0; c < 6; c++) link(g, concepts[c], concepts[(c + 1) % 6]);
      // BI Agent: a small bar chart growing on a data grid
      const BB = V(1.8, -1.8, 0.4);
      for (let x = 0; x < 7; x++) for (let z = 0; z < 4; z++) add(g, BB.clone().add(V((x - 3) * 0.26, 0, (z - 1.5) * 0.26)), 0.035);
      const bAnchor = add(g, BB.clone().add(V(-1.05, 0, 0)), 0.16);
      for (let bx = 0; bx < 4; bx++) for (let bz = 0; bz < 1; bz++) { // four bars with a clear rising trend
        const h = 0.4 + bx * 0.32, x0 = (bx - 1.5) * 0.46, z0 = 0, hw = 0.16, tops = [];
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) add(g, BB.clone().add(V(x0 + i * hw * 0.6, h, z0 + j * hw * 0.6)), 0.055); // solid top
        [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]].forEach(([dx, dz]) => {
          const steps = Math.max(2, Math.round(h / 0.16));
          let prev = -1;
          for (let s = 0; s <= steps; s++) {
            const i = add(g, BB.clone().add(V(x0 + dx, (s / steps) * h, z0 + dz)), s === steps ? 0.08 : rr(0.035, 0.055));
            if (prev >= 0) link(g, prev, i, dx < 0 && dz < 0 ? sig : null);
            prev = i;
          }
          tops.push(prev);
        });
        for (let t = 0; t < 4; t++) link(g, tops[t], tops[(t + 1) % 4]);
      }
      branch(nh, V(-0.1, 1.3, -0.2));
      branch(bAnchor, V(-0.4, -1.25, 0.2));
      crisp({ center: REUSE, nodes: g.nodes, edges: g.edges, pulseEdges: sig, stations: [6], scatter: 7, pulses: 22, lineOpacity: 0.26 });
    })();

    /* ---- ambient data dust along the whole route (follows the formations' sway) ---- */
    const sway = [[30, 2], [0, 2], [-25, -7], [-42, 7], [-66, -4], [-102, -7], [-118, 7], [-140, 7]];
    dust({ count: 2400, zFrom: 24, zTo: -136, sway: (z) => {
      for (let i = 0; i < sway.length - 1; i++) {
        const [za, xa] = sway[i], [zb, xb] = sway[i + 1];
        if (z <= za && z >= zb) return V(xa + ((xb - xa) * (za - z)) / (za - zb), 0, 0);
      }
      return V(0, 0, 0);
    } });

    /* phones: the canvas sits behind the card stacks, so where a section leaves an empty band below its cards
       (gallery, outcome), raise the camera and its target together so the formation drops into that band
       (narrowOffset, applied live on resize) */
    const nudge = (st, dy) => ({ ...st, narrowOffset: V(0, dy, 0) });
    /* desktop: the hero, overview and gallery sit a little further back so they clear the text column and the right
       edge; their narrowScale divides that out so phones and tablets keep their framing */
    const stations = [
      { sel: ".phero", F: FLOW, cam: FLOW.clone().add(V(-4.8, 3.4, 16.6).multiplyScalar(1.05)), shift: 0.41, narrowScale: 1.1 / 1.05 },
      { sel: "#overview", F: GAP.clone().add(V(-0.2, 0, 0)), cam: GAP.clone().add(V(-1.5, -0.8, 15).multiplyScalar(1.14)), shift: 0.38, narrowScale: 1.1 / 1.14 },
      { sel: "#capabilities", F: CAP, cam: CAP.clone().add(V(4, 1.8, 15)), shift: 0.4, narrowScale: 1.1 },
      { sel: "#how .step:first-child", F: F3, cam: CAM3.clone(), shift: 0.34, narrowScale: 1.15 },
      { sel: "#how .step:last-child", F: F4, cam: CAM4.clone(), shift: 0.36, narrowScale: 1.15 },
      nudge({ sel: "#gallery", F: EVAL.clone().add(V(0.35, 0.3, 0)), cam: EVAL.clone().add(V(-1.2, 1.4, 14.5).multiplyScalar(1.04)), shift: 0.41, narrowScale: 1.1 / 1.04 }, 6),
      nudge({ sel: "#outcome", F: REUSE, cam: REUSE.clone().add(V(4.8, 4.5, 15)), shift: 0.38, narrowScale: 1.1 }, 6.4),
      { sel: "#next", F: V(0, -10, -66), cam: V(10, 24, 50), shift: 0.42, narrowScale: 1 },
    ];
    // squarer desktop screens need no special casing: the engine widens its field of view to keep 16:10 framing
    const fog = { finaleNear: 110, finaleFar: 250 };
    return { stations, fog };
  },
});
