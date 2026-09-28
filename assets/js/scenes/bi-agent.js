/* BI Agent case-study world
     hero          → a dashboard in space: a 3D bar chart on a data grid, signals rising up the bars, the
                     answer bar called out, a line-chart ribbon hovering behind (the homepage BI formation, richer)
     overview      → a question becomes a query: signals stream from one question bubble, through the
                     semantic-layer lattice, down into a database cylinder
     capabilities  → the semantic layer: a loose knowledge-graph cloud of business terms mapped onto an
                     orderly grid of table cards below, signals travelling down the mappings
     how 01 → 05   → the pipeline rail through five stage glyphs (Ask, Map, Query, Explain, Visualize);
                     the camera rides it from the first stage to the last
     gallery       → a dashboard assembling in 3D: floating panels holding a line chart, a donut, bars,
                     KPI digits and a ranking, all fed by one query hub
     outcome       → explainable: one answer with trace edges back to the terms and tables it used,
                     amid the faint context it did not use
     next          → finale: the whole route as one constellation */
import { createWorld } from "../world.js";

createWorld({
  canvas: document.getElementById("scene3d"),
  build(w) {
    const { THREE, V, rr, rnd, randDir, formation, knnEdges, dust, curve, D } = w;
    const TAU = Math.PI * 2, Y = V(0, 1, 0);

    /* drawing helpers: g = { nodes, edges }; `list` collects the edge indices that carry signals */
    const G = () => ({ nodes: [], edges: [] });
    const add = (g, p, s) => (g.nodes.push({ p, s }), g.nodes.length - 1);
    const link = (g, a, b, list) => { if (list) list.push(g.edges.length); g.edges.push([a, b]); };
    const size = (s) => (typeof s === "function" ? s() : s);
    function path(g, pts, s, closed = false, list) {
      const base = g.nodes.length;
      pts.forEach((p) => add(g, p, size(s)));
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
    const rect = (hw, hh) => [V(-hw, -hh, 0), V(hw, -hh, 0), V(hw, hh, 0), V(-hw, hh, 0)];
    function roundRect(hw, hh, r, n) {
      const verts = [];
      [[hw - r, hh - r, 0], [-hw + r, hh - r, 0.5], [-hw + r, -hh + r, 1], [hw - r, -hh + r, 1.5]].forEach(([cx, cy, a0]) => {
        for (let k = 0; k <= 4; k++) { const a = (a0 + k / 8) * Math.PI; verts.push(V(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0)); }
      });
      return resample(verts, n, true);
    }
    const arc = (n, r, a0, a1, c = V(0, 0, 0)) => Array.from({ length: n }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / (n - 1);
      return V(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, c.z);
    });
    /* decorative points along a segment (no edges) */
    function dots(g, A, B, step, s) {
      const n = Math.max(2, Math.round(A.distanceTo(B) / step));
      for (let k = 1; k < n; k++) add(g, A.clone().lerp(B, k / n), size(s));
    }
    /* a planar frame: local xy points → position `o`, turned `ry` about the vertical */
    const frame = (o, ry = 0) => (p) => p.clone().applyAxisAngle(Y, ry).add(o);
    /* a table card: outline, a header row and two data rows; returns the index of its anchor hub */
    function card(g, T, hw, hh, anchor, hub = 0.17) {
      const per = Math.max(12, Math.round((4 * (hw + hh)) / 0.085));
      path(g, resample(rect(hw, hh), per, true).map(T), () => rr(0.04, 0.056), true);
      [[hh * 0.42, 0.07], [0, 0.042], [-hh * 0.42, 0.042]].forEach(([y, s]) =>
        path(g, Array.from({ length: 5 }, (_, i) => T(V(-hw + 0.09 + (i * (2 * hw - 0.18)) / 4, y, 0))), s));
      return add(g, T(anchor), hub);
    }

    /* ---- station 0: a dashboard in space ---- */
    const HERO = V(1.2, -0.3, 0), FY = -2.1, SPIN0 = V(0, 0.022, 0);
    (function heroGrid() {
      const g = G(), GX = 17, GZ = 11, sp = 0.5;
      const at = (i, j) => i * GZ + j;
      for (let i = 0; i < GX; i++) for (let j = 0; j < GZ; j++)
        add(g, V((i - (GX - 1) / 2) * sp, FY, (j - (GZ - 1) / 2) * sp), rr(0.03, 0.045));
      for (let i = 0; i < GX; i++) for (let j = 0; j < GZ; j++) {
        if (i < GX - 1) link(g, at(i, j), at(i + 1, j));
        if (j < GZ - 1) link(g, at(i, j), at(i, j + 1));
      }
      formation({ center: HERO, nodes: g.nodes, edges: g.edges, stations: [0], spin: SPIN0, scatter: 8, pulses: 8, lineOpacity: 0.1 });
    })();
    (function heroChart() {
      const g = G(), up = [];
      const BX = 8, BZ = 4, SX = 0.9, SZ = 0.9, bw = 0.2;
      const bars = [];
      for (let bx = 0; bx < BX; bx++) for (let bz = 0; bz < BZ; bz++) {
        const h = 0.5 + 0.25 * bx + 0.2 * bz + 1.05 * Math.sin(bx * 1.15 + bz * 0.8 + 0.3) ** 2 + rr(0, 0.25);
        bars.push({ x: (bx - (BX - 1) / 2) * SX, z: (bz - (BZ - 1) / 2) * SZ, h });
      }
      const best = bars.reduce((a, b) => (b.h > a.h ? b : a));
      bars.forEach((b) => {
        const hot = b === best, steps = Math.max(2, Math.round(b.h / 0.24)), tops = [];
        [[-bw, -bw], [bw, -bw], [bw, bw], [-bw, bw]].forEach(([dx, dz]) => {
          const base = g.nodes.length;
          for (let s = 0; s <= steps; s++)
            add(g, V(b.x + dx, FY + (s / steps) * b.h, b.z + dz), s === steps ? (hot ? 0.2 : 0.1) : hot ? rr(0.06, 0.08) : rr(0.038, 0.06));
          link(g, base, base + steps, up); // one edge per corner: a signal rises the bar's full height
          tops.push(base + steps);
        });
        for (let t = 0; t < 4; t++) link(g, tops[t], tops[(t + 1) % 4]);
        if (hot) {
          // the answer bar gets a callout: a dotted stem up to a ring marker
          const top = V(b.x, FY + b.h, b.z), m = top.clone().add(V(0, 0.95, 0));
          dots(g, top, m.clone().add(V(0, -0.24, 0)), 0.14, 0.045);
          const r0 = path(g, arc(18, 0.24, 0, TAU * (17 / 18), m), 0.055, true);
          const c = add(g, m, 0.24);
          link(g, tops[0], c, up); link(g, c, r0);
        }
      });
      // y-axis with ticks at the back-left corner of the grid
      const ax = V(-4.4, FY, -2.6);
      path(g, resample([ax, ax.clone().add(V(0, 4.6, 0))], 24), 0.045);
      for (let t = 1; t <= 4; t++) path(g, resample([ax.clone().add(V(0, t, 0)), ax.clone().add(V(0.3, t, 0))], 3), 0.05);
      // a line-chart ribbon hovering behind the bars, trending up
      const vals = [0.15, 0.5, 0.35, 0.75, 0.62, 1.0, 0.9, 1.25, 1.12, 1.5, 1.72];
      const key = vals.map((v, i) => V(-3.6 + i * 0.72, 1.2 + v * 1.25, -2.45 - Math.sin(i * 0.6) * 0.25));
      const rc = curve(key), M = Math.round(96 * D);
      const pts = Array.from({ length: M }, (_, i) => rc.getPoint(i / (M - 1)));
      const a0 = path(g, pts, () => rr(0.045, 0.065));
      const b0 = path(g, pts.map((p) => p.clone().add(V(0, -0.16, 0.06))), 0.035);
      for (let i = 0; i < M; i += 3) link(g, a0 + i, b0 + i);
      key.forEach((p) => add(g, p, 0.17));
      formation({ center: HERO, nodes: g.nodes, edges: g.edges, pulseEdges: up, stations: [0], spin: SPIN0, scatter: 8, pulses: 30, lineOpacity: 0.26 });
    })();

    /* ---- station 1: a question becomes a query ---- */
    const OV = V(-5, 1.2, -24);
    (function overview() {
      const g = G(), flow = [];
      // the question: a speech bubble with a typing indicator; the query leaves from its hot node
      const BC = V(-3.0, 0.75, 0.3);
      const bub = path(g, roundRect(0.7, 0.44, 0.18, 36).map((p) => p.add(BC)), () => rr(0.045, 0.065), true);
      path(g, resample([V(-0.34, -0.44, 0), V(-0.58, -0.86, 0), V(-0.04, -0.44, 0)], 7).map((p) => p.add(BC)), 0.05);
      [-0.26, 0, 0.26].forEach((x) => add(g, V(x, 0, 0).add(BC), 0.15));
      const Q = add(g, BC.clone().add(V(1.05, -0.05, 0)), 0.32);
      link(g, bub, Q); // roundRect starts at its right-hand side
      // the semantic layer: an orderly lattice the question passes through
      const NX = 4, NY = 5, NZ = 4, sp = 0.56, LC = V(0.1, 0.05, 0), L0 = g.nodes.length;
      const L = (i, j, k) => L0 + (i * NY + j) * NZ + k;
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++)
        add(g, V((i - (NX - 1) / 2) * sp, (j - (NY - 1) / 2) * sp, (k - (NZ - 1) / 2) * sp).add(LC), rnd() < 0.1 ? 0.18 : rr(0.05, 0.08));
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) {
        if (i < NX - 1) link(g, L(i, j, k), L(i + 1, j, k), flow);
        if (j < NY - 1) link(g, L(i, j, k), L(i, j + 1, k));
        if (k < NZ - 1) link(g, L(i, j, k), L(i, j, k + 1));
      }
      // the database: rings of points stacked into a cylinder, three bands like the icon
      const DC = V(2.85, -0.3, 0), R = 0.9, H = 2.2, RINGS = 7, per = Math.round(44 * Math.sqrt(D));
      const ring0 = g.nodes.length;
      for (let r = 0; r < RINGS; r++) {
        const y = H / 2 - (r * H) / (RINGS - 1), band = r % 2 === 0;
        path(g, arc(per, R, 0, TAU * ((per - 1) / per), V(0, 0, 0)).map((p) => V(p.x, y, p.y).add(DC)), band ? () => rr(0.06, 0.085) : 0.045, true);
      }
      const hub = add(g, DC.clone().add(V(0, H / 2, 0)), 0.26);
      for (let a = 0; a < per; a += Math.round(per / 8)) {
        link(g, hub, ring0 + a, flow);
        link(g, ring0 + a, ring0 + (RINGS - 1) * per + a, flow); // signals sink down the cylinder
      }
      // the stream: question → every lattice face node, lattice back face → the database
      const front = [], back = [];
      for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) { front.push(L(0, j, k)); back.push(L(NX - 1, j, k)); }
      front.forEach((f) => link(g, Q, f, flow));
      back.forEach((b) => link(g, b, hub, flow));
      const streak = (A, list, n) => { for (let i = 0; i < n; i++) {
        const B = g.nodes[list[(rnd() * list.length) | 0]].p;
        add(g, A.clone().lerp(B, rr(0.12, 0.9)).add(randDir().multiplyScalar(rr(0, 0.1))), rr(0.025, 0.045));
      } };
      streak(g.nodes[Q].p, front, Math.round(80 * D));
      streak(g.nodes[hub].p, back, Math.round(50 * D));
      formation({ center: OV, nodes: g.nodes, edges: g.edges, pulseEdges: flow, stations: [1], scatter: 7, pulses: 28, lineOpacity: 0.22 });
    })();

    /* ---- station 2: business terms (knowledge graph) mapped onto data models (tables) ---- */
    const CAP = V(5, -0.6, -46);
    (function capabilities() {
      const g = G(), map = [];
      // upper: a loose knowledge-graph cloud of term hubs and their satellites
      const hubs = [], HP = [];
      for (let tries = 0; hubs.length < 14 && tries < 800; tries++) {
        const p = V(rr(-3.5, 3.5), 1.95 + rr(-0.55, 0.55), rr(-1.5, 1.5));
        if (HP.some((q) => q.distanceTo(p) < 1.25)) continue;
        HP.push(p); hubs.push(add(g, p, rr(0.19, 0.25)));
      }
      const S = Math.round(11 * D);
      hubs.forEach((h) => {
        for (let s = 0; s < S; s++) {
          const d = randDir().multiplyScalar(rr(0.28, 0.8)); d.y *= 0.6;
          link(g, h, add(g, g.nodes[h].p.clone().add(d), rr(0.04, 0.07)));
        }
      });
      const upperEnd = g.nodes.length;
      knnEdges(g.nodes, hubs.length, upperEnd, 1, 0.55).forEach(([a, b]) => { if (rnd() < 0.5) link(g, a, b); });
      hubs.forEach((h, i) => {
        HP.map((q, j) => [q.distanceToSquared(HP[i]), j]).sort((a, b) => a[0] - b[0]).slice(1, 3)
          .forEach(([, j]) => { if (j > i || rnd() < 0.3) link(g, h, hubs[j]); });
      });
      // lower: an orderly floor of table cards (data models) with join lines between neighbours
      const TX = 5, TZ = 4, tables = [];
      for (let tz = 0; tz < TZ; tz++) for (let tx = 0; tx < TX; tx++) {
        const c = V((tx - (TX - 1) / 2) * 1.3, -2.1, (tz - (TZ - 1) / 2) * 1.05);
        tables.push({ c, a: card(g, (p) => V(p.x, 0, -p.y).add(c), 0.44, 0.3, V(0, 0, 0), 0.16) });
      }
      for (let tz = 0; tz < TZ; tz++) for (let tx = 0; tx < TX; tx++) {
        const t = tables[tz * TX + tx];
        if (tx < TX - 1) link(g, t.a, tables[tz * TX + tx + 1].a);
        if (tz < TZ - 1 && tx % 2 === 0) link(g, t.a, tables[(tz + 1) * TX + tx].a);
      }
      // mappings: every term resolves to one or two tables; signals travel down them
      hubs.forEach((h, i) => {
        const p = HP[i];
        const near = tables.map((t, k) => [Math.hypot(t.c.x - p.x, t.c.z - p.z), k]).sort((a, b) => a[0] - b[0]);
        const picks = new Set([near[0][1]]);
        if (rnd() < 0.6) picks.add(near[1 + ((rnd() * 3) | 0)][1]);
        picks.forEach((k) => {
          dots(g, p, g.nodes[tables[k].a].p, 0.32, 0.03);
          link(g, h, tables[k].a, map);
        });
      });
      formation({ center: CAP, nodes: g.nodes, edges: g.edges, pulseEdges: map, stations: [2], scatter: 7, pulses: 26, lineOpacity: 0.22 });
    })();

    /* ---- stations 3–4: the pipeline rail through five stage glyphs ---- */
    const RC = curve([V(-6, -1, -62), V(-2, -0.4, -71.3), V(2, -0.8, -80.7), V(6, -0.2, -90)]);
    const RCEN = RC.getPoint(0.5);
    const MK = [0.06, 0.25, 0.44, 0.63, 0.94]; // a longer run into the last stage, so the camera can pass stage 04
    /* the riding camera sits above and just right of the rail, a fixed offset behind the stage it frames,
       so the stages still ahead recede up and to the right, away from the text */
    const RD = RC.getPoint(1).sub(RC.getPoint(0)).normalize(), RR = RD.clone().cross(Y).normalize();
    const RIDE = RR.clone().multiplyScalar(2.4).addScaledVector(RD, -8.5).add(V(0, 2.6, 0));
    const FACE = Math.atan2(RIDE.x, RIDE.z) * 0.85; // stage glyphs turn most of the way towards it
    (function rail() {
      const g = G(), run = [];
      const M = Math.round(260 * D);
      for (let side = -1; side <= 1; side += 2) {
        const base = g.nodes.length;
        for (let i = 0; i < M; i++) {
          const p = RC.getPoint(i / (M - 1)).sub(RCEN); p.y += side * 0.15;
          add(g, p, rr(0.04, 0.062));
          if (i) link(g, base + i - 1, base + i);
          if (side === 1 && i % 14 === 0) link(g, i, base + i);
        }
      }
      // a spine of sleeper hubs: signals hop from one to the next along the whole rail
      const SP = 34, sp0 = g.nodes.length;
      for (let i = 0; i < SP; i++) { add(g, RC.getPoint(i / (SP - 1)).sub(RCEN), 0.07); if (i) link(g, sp0 + i - 1, sp0 + i, run); }
      // a hot stage node on the rail at each step
      MK.forEach((t) => add(g, RC.getPoint(t).sub(RCEN), 0.3));
      formation({ center: RCEN, nodes: g.nodes, edges: g.edges, pulseEdges: run, stations: [3, 4], scatter: 6, pulses: 22, lineOpacity: 0.26 });
    })();
    (function stages() {
      const g = G(), sig = [];
      const glyphs = [
        // 01 Ask: a speech bubble with a typing indicator
        (T) => {
          path(g, roundRect(0.62, 0.4, 0.16, 30).map(T), () => rr(0.05, 0.07), true);
          path(g, resample([V(-0.3, -0.4, 0), V(-0.5, -0.74, 0), V(-0.04, -0.4, 0)], 6).map(T), 0.05);
          const d = [-0.22, 0, 0.22].map((x) => add(g, T(V(x, 0, 0)), 0.14));
          link(g, d[0], d[1], sig); link(g, d[1], d[2], sig);
          return add(g, T(V(-0.5, -0.8, 0)), 0.07);
        },
        // 02 Map: terms (rings) resolve to tables (squares)
        (T) => {
          const top = [-0.5, 0, 0.5].map((x) => { path(g, arc(9, 0.14, 0, TAU * (8 / 9), V(x, 0.45, 0)).map(T), 0.045, true); return add(g, T(V(x, 0.45, 0)), 0.17); });
          const bot = [-0.5, 0, 0.5].map((x) => { path(g, resample(rect(0.13, 0.13), 8, true).map((p) => T(p.add(V(x, -0.45, 0)))), 0.05, true); return add(g, T(V(x, -0.45, 0)), 0.1); });
          [[0, 1], [1, 0], [1, 2], [2, 2], [0, 0]].forEach(([a, b]) => {
            dots(g, g.nodes[top[a]].p, g.nodes[bot[b]].p, 0.13, 0.035);
            link(g, top[a], bot[b], sig);
          });
          return add(g, T(V(0, -0.7, 0)), 0.07);
        },
        // 03 Query: a database cylinder
        (T) => {
          const r0 = g.nodes.length;
          [0.4, 0, -0.4].forEach((y) => path(g, arc(20, 0.5, 0, TAU * (19 / 20)).map((p) => T(V(p.x, y, p.y))), y > 0.2 ? 0.07 : 0.05, true));
          for (let a = 0; a < 20; a += 5) link(g, r0 + a, r0 + 40 + a, sig);
          add(g, T(V(0, 0.4, 0)), 0.18);
          return add(g, T(V(0, -0.62, 0)), 0.07);
        },
        // 04 Explain: a lens over a small lineage tree
        (T) => {
          path(g, arc(30, 0.42, 0, TAU * (29 / 30), V(-0.1, 0.12, 0)).map(T), () => rr(0.05, 0.07), true);
          const h0 = V(-0.1, 0.12, 0).add(V(Math.cos(-0.8) * 0.44, Math.sin(-0.8) * 0.44, 0));
          path(g, resample([h0, h0.clone().add(V(0.36, -0.36, 0))], 6).map(T), 0.08);
          const a = add(g, T(V(-0.1, 0.34, 0)), 0.16), b = add(g, T(V(-0.3, -0.04, 0)), 0.1), c = add(g, T(V(0.1, -0.04, 0)), 0.1);
          link(g, a, b, sig); link(g, a, c, sig);
          return add(g, T(V(-0.1, -0.48, 0)), 0.07);
        },
        // 05 Visualize: bars with a trend line over their tops
        (T) => {
          path(g, resample([V(-0.62, -0.55, 0), V(0.62, -0.55, 0)], 10).map(T), 0.045);
          const hs = [0.45, 0.8, 0.6, 1.05], tops = [];
          hs.forEach((h, i) => {
            const x = -0.45 + i * 0.3;
            [-0.06, 0.06].forEach((dx) => { const b = path(g, resample([V(x + dx, -0.5, 0), V(x + dx, -0.5 + h, 0)], Math.max(3, Math.round(h / 0.11))).map(T), 0.045); link(g, b, g.nodes.length - 1, sig); });
            tops.push(add(g, T(V(x, -0.36 + h, 0)), 0.15));
          });
          for (let i = 0; i < 3; i++) link(g, tops[i], tops[i + 1], sig);
          return add(g, T(V(0, -0.62, 0)), 0.07);
        },
      ];
      const GS = 1.3; // glyph scale
      MK.forEach((t, k) => {
        const c = RC.getPoint(t).sub(RCEN);
        const f = frame(c.clone().addScaledVector(RR, -0.5).add(V(0, 2.05, 0)), FACE);
        const T = (p) => f(p.clone().multiplyScalar(GS));
        const foot = glyphs[k](T);
        const railNode = add(g, c.clone().add(V(0, 0.3, 0)), 0.06);
        dots(g, g.nodes[railNode].p, g.nodes[foot].p, 0.16, 0.04);
        link(g, railNode, foot, sig);
      });
      formation({ center: RCEN, nodes: g.nodes, edges: g.edges, pulseEdges: sig, stations: [3, 4], scatter: 5, pulses: 20, lineOpacity: 0.3 });
    })();

    /* ---- station 5: a dashboard assembling in 3D ---- */
    const GAL = V(-5, 1, -112);
    (function gallery() {
      const g = G(), sig = [];
      const hub = add(g, V(0.2, 0, -2.3), 0.3); // the query that feeds every panel
      function panel(o, ry, hw, hh) {
        const T = frame(o, ry);
        const per = Math.round((4 * (hw + hh)) / 0.1);
        path(g, resample(rect(hw, hh), per, true).map(T), () => rr(0.042, 0.06), true);
        path(g, resample([V(-hw + 0.14, hh - 0.16, 0), V(-hw + 0.7, hh - 0.16, 0)], 6).map(T), 0.05); // title bar
        const corners = rect(hw, hh).map((p) => add(g, T(p), 0.11));
        link(g, hub, corners[(rnd() * 4) | 0], sig);
        return T;
      }
      // line chart with an area of dots underneath
      {
        const T = panel(V(-1.5, 1.15, 0), 0.2, 1.75, 0.95);
        const n = 20, pts = [];
        for (let i = 0; i < n; i++) {
          const x = -1.5 + (3 * i) / (n - 1), y = -0.5 + 0.045 * i + 0.22 * Math.sin(i * 0.9) + 0.1 * Math.sin(i * 2.3);
          pts.push(V(x, y, 0));
        }
        const l0 = path(g, pts.map(T), 0.065, false, sig);
        pts.forEach((p, i) => {
          if (i % 4 === 1) g.nodes[l0 + i].s = 0.17;
          for (let y = p.y - 0.16; y > -0.72; y -= 0.16) add(g, T(V(p.x, y, 0)), 0.03);
        });
        path(g, resample([V(-1.55, -0.74, 0), V(1.55, -0.74, 0)], 18).map(T), 0.04);
      }
      // donut: three arcs with gaps and a KPI hub
      {
        const T = panel(V(2.1, 1.15, 0.55), -0.26, 0.95, 0.95);
        let a = Math.PI / 2;
        [0.5, 0.3, 0.2].forEach((f) => {
          const span = f * TAU - 0.22, n = Math.max(6, Math.round(f * 56));
          const o = path(g, arc(n, 0.6, a, a - span).map(T), () => rr(0.06, 0.08), false, sig);
          path(g, arc(n, 0.45, a, a - span).map(T), 0.045);
          g.nodes[o].s = 0.16;
          a -= f * TAU;
        });
        add(g, T(V(0, 0, 0)), 0.2);
      }
      // bars rising from a baseline
      {
        const T = panel(V(-2.2, -1.15, 0.4), 0.3, 1.05, 0.95);
        [0.55, 0.95, 0.7, 1.25, 1.05, 1.4].forEach((h, i) => {
          const x = -0.75 + i * 0.3;
          [-0.06, 0.06].forEach((dx) => {
            const b = path(g, resample([V(x + dx, -0.7, 0), V(x + dx, -0.7 + h, 0)], Math.max(3, Math.round(h / 0.12))).map(T), 0.05);
            link(g, b, g.nodes.length - 1, sig);
          });
          add(g, T(V(x, -0.58 + h, 0)), 0.13);
        });
      }
      // KPI: dot-matrix digits over a sparkline
      {
        const T = panel(V(0.15, -1.15, 0), 0.03, 0.95, 0.95);
        const font = { 9: ["111", "101", "111", "001", "111"], 4: ["101", "101", "111", "001", "001"] };
        ["9", "4"].forEach((ch, d) => font[ch].forEach((row, r) => [...row].forEach((bit, c) => {
          if (bit === "1") add(g, T(V(-0.66 + d * 0.72 + c * 0.17, 0.6 - r * 0.17, 0)), 0.12);
        })));
        add(g, T(V(0.74, 0.28, 0)), 0.17);
        path(g, Array.from({ length: 10 }, (_, i) => T(V(-0.6 + i * 0.133, -0.55 + 0.12 * Math.sin(i * 0.9) + i * 0.02, 0))), 0.05, false, sig);
      }
      // ranking: horizontal bars
      {
        const T = panel(V(2.25, -1.15, 0.6), -0.3, 0.95, 0.95);
        [1.3, 1.05, 0.85, 0.6, 0.4].forEach((len, r) => {
          const y = 0.45 - r * 0.25;
          const b = path(g, resample([V(-0.7, y, 0), V(-0.7 + len, y, 0)], Math.max(3, Math.round(len / 0.1))).map(T), 0.055);
          link(g, b, g.nodes.length - 1, sig);
        });
      }
      formation({ center: GAL, nodes: g.nodes, edges: g.edges, pulseEdges: sig, stations: [5], scatter: 7, pulses: 26, lineOpacity: 0.26 });
    })();

    /* ---- station 6: explainable: an answer traced back to the terms and tables it used ---- */
    const OUT = V(6, -0.4, -133);
    (function outcome() {
      const g = G(), trace = [];
      // faint context the answer did not use
      for (let i = 0; i < Math.round(150 * D); i++)
        add(g, V(rr(-3.6, 1.0), rr(-2.6, 2.6), rr(-2.2, 1.4)), rr(0.03, 0.05));
      // the answer: a hot core inside a shell, with an orbit ring
      const A = V(2.7, 0.25, 0.4), ans = add(g, A, 0.34);
      const sh0 = g.nodes.length, SN = 64, golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < SN; i++) {
        const y = 1 - (2 * (i + 0.5)) / SN, r = Math.sqrt(1 - y * y), th = i * golden;
        add(g, V(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(0.62).add(A), rr(0.045, 0.07));
      }
      knnEdges(g.nodes, sh0, sh0 + SN, 2, 0.45).forEach(([a, b]) => link(g, a, b));
      const e = new THREE.Euler(1.1, 0.4, 0);
      path(g, arc(44, 1.0, 0, TAU * (43 / 44)).map((p) => p.applyEuler(e).add(A)), 0.045, true);
      // the terms it resolved
      const terms = [1.7, 0.85, 0.05, -0.8, -1.65].map((y, i) => {
        const c = V(rr(-0.3, 0.3), y + rr(-0.1, 0.1), rr(-0.8, 0.8) + (i === 2 ? 0.5 : 0));
        path(g, arc(10, 0.22, 0, TAU * 0.9, c), 0.045, true);
        return add(g, c, 0.22);
      });
      // the tables those terms mapped to
      const tables = [2.15, 1.3, 0.45, -0.4, -1.25, -2.1].map((y, i) => {
        const c = V(i % 2 ? -2.3 : -3.05, y, (i % 2 ? 0.7 : -0.5) + rr(-0.2, 0.2));
        return card(g, frame(c, -0.25), 0.42, 0.27, V(0.54, 0, 0), 0.16);
      });
      // unused terms and tables, small and unlinked
      for (let i = 0; i < 4; i++) path(g, arc(8, 0.18, 0, TAU * (7 / 8), V(rr(-1.6, 0.8), rr(-2.3, 2.3), rr(-2, -0.8))), 0.035, true);
      for (let i = 0; i < 3; i++) card(g, frame(V(rr(-3.8, -1.6), rr(-2.3, 2.3), rr(-2.2, -1.4)), -0.25), 0.3, 0.2, V(0, 0, 0), 0.05);
      // trace edges: answer → terms → tables, dotted so they read as the evidence trail
      const traceTo = (a, b) => { dots(g, g.nodes[a].p, g.nodes[b].p, 0.2, 0.04); link(g, a, b, trace); };
      terms.forEach((t) => traceTo(ans, t));
      const used = new Set();
      terms.forEach((t, i) => {
        const k = Math.min(tables.length - 1, Math.round(i * 1.25));
        traceTo(t, tables[k]); used.add(k);
        const k2 = Math.min(tables.length - 1, k + 1);
        if (!used.has(k2) || rnd() < 0.4) { traceTo(t, tables[k2]); used.add(k2); }
      });
      tables.forEach((tb, k) => { if (!used.has(k)) traceTo(terms[Math.min(terms.length - 1, Math.round(k / 1.25))], tb); });
      formation({ center: OUT, nodes: g.nodes, edges: g.edges, pulseEdges: trace, stations: [6], scatter: 7, pulses: 22, lineOpacity: 0.26 });
    })();

    /* ---- ambient data dust along the whole route (follows the formations' sway) ---- */
    const sway = [[26, 1], [0, 1], [-24, -5], [-46, 5], [-62, -6], [-90, 6], [-112, -5], [-133, 6], [-152, 6]];
    dust({ count: 2400, zFrom: 26, zTo: -152, sway: (z) => {
      for (let i = 0; i < sway.length - 1; i++) {
        const [za, xa] = sway[i], [zb, xb] = sway[i + 1];
        if (z <= za && z >= zb) return V(xa + ((xb - xa) * (za - z)) / (za - zb), 0, 0);
      }
      return V(0, 0, 0);
    } });

    const F3 = RC.getPoint(MK[0]).add(V(0, 1.5, 0)), F4 = RC.getPoint(MK[4]).add(V(0, 1.5, 0));
    return {
      stations: [
        { sel: ".phero", F: HERO.clone().add(V(0, -0.2, 0)), cam: HERO.clone().add(V(5.5, 5.5, 21)), shift: 0.41, narrowScale: 1.1 },
        { sel: "#overview", F: OV, cam: OV.clone().add(V(4.2, 4.2, 18.5)), shift: 0.39, narrowScale: 1.1 },
        { sel: "#capabilities", F: CAP, cam: CAP.clone().add(V(-3.2, 7.5, 17.5)), shift: 0.4, narrowScale: 1.1 },
        { sel: "#how .step:first-child", F: F3, cam: F3.clone().add(RIDE), shift: 0.34 },
        { sel: "#how .step:last-child", F: F4, cam: F4.clone().add(RIDE), shift: 0.34 },
        { sel: "#gallery", F: GAL, cam: GAL.clone().add(V(4.5, 1.5, 16.5)), shift: 0.4, narrowScale: 1.1 },
        { sel: "#outcome", F: OUT.clone().add(V(-0.2, 0, 0)), cam: OUT.clone().add(V(-2.8, 2.8, 18)), shift: 0.4, narrowScale: 1.1 },
        { sel: "#next", F: V(0, -10, -56), cam: V(25, 50, 65), shift: 0.445, narrowScale: 1 },
      ],
      fog: { finaleNear: 150, finaleFar: 320 },
    };
  },
});
