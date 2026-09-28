/* Nebras case study world:
   hero         → the ontology: a ringed agent hub with beaded spokes to eight concept clusters,
                  relation arcs between concepts, two semantic-layer orbits
   overview     → inside the ontology, among the entities and their relationships
   capabilities → two interlocking loops (agent loop + tool loop), the Python sandbox cube, a skills tree
   how 01 → 05  → a ladder rail climbing through five stage markers: Understand (lens), Plan (tree),
                  Act (gear), Verify (shield + check), Deliver (stack of files); the camera moves from
                  the whole climb (01) to the top of it (05)
   gallery      → the five real screenshots floating in an arc, each in a dotted frame on a shared spine
   outcome      → the ontology standing on a foundation of Nawras workflow blocks (slabs with ports and flows)
   next         → finale: the whole route as one constellation */
import { createWorld } from "../world.js";

createWorld({
  canvas: document.getElementById("scene3d"),
  build(w) {
    const { THREE, V, rr, rnd, randDir, formation, dust, screen, curve, D } = w;

    /* Dotted path through pts with sharp corners. Dots every ~step; edges join anchors every ~link
       (corners are always anchors), so the engine's gentle node drift never makes the lines jagged. */
    function polyline(nodes, edges, pts, { step = 0.14, link = 0.6, s = [0.04, 0.065], closed = false, sig = null } = {}) {
      const idx = [], anchors = [], segs = closed ? pts.length : pts.length - 1;
      for (let k = 0; k < segs; k++) {
        const A = pts[k], B = pts[(k + 1) % pts.length], len = A.distanceTo(B);
        const n = Math.max(1, Math.round(len / step)), m = Math.max(1, Math.min(n, Math.round(len / link)));
        for (let j = 0; j < n; j++) {
          const i = nodes.length; nodes.push({ p: A.clone().lerp(B, j / n), s: rr(s[0], s[1]) }); idx.push(i);
          if (j === 0 || Math.floor((j * m) / n) !== Math.floor(((j - 1) * m) / n)) anchors.push(i);
        }
      }
      if (!closed) { const i = nodes.length; nodes.push({ p: pts[pts.length - 1].clone(), s: rr(s[0], s[1]) }); idx.push(i); anchors.push(i); }
      for (let j = 1; j < anchors.length; j++) { if (sig) sig.push(edges.length); edges.push([anchors[j - 1], anchors[j]]); }
      if (closed) { if (sig) sig.push(edges.length); edges.push([anchors[anchors.length - 1], anchors[0]]); }
      return idx;
    }
    /* a dotted ring of M nodes; edges join every few nodes (about `links` edges around) */
    function ring(nodes, edges, R, M, { hotEvery = 0, s = [0.045, 0.075], plane = "xy", jitter = 0.03, links = 40, sig = null } = {}) {
      const base = nodes.length, every = Math.max(1, Math.round(M / links));
      for (let i = 0; i < M; i++) {
        const a = (i / M) * Math.PI * 2, c = Math.cos(a) * R + rr(-jitter, jitter), d = Math.sin(a) * R + rr(-jitter, jitter);
        nodes.push({ p: plane === "xy" ? V(c, d, rr(-jitter, jitter)) : V(c, rr(-jitter, jitter), d), s: hotEvery && i % hotEvery === 0 ? 0.2 : rr(s[0], s[1]) });
      }
      for (let i = 0; i < M; i += every) { if (sig) sig.push(edges.length); edges.push([base + i, base + (Math.min(i + every, M) % M)]); }
      return base;
    }

    /* ---- stations 0/1: the ontology ---- */
    const ONT = V(0, 0, 0);
    (function ontology() {
      const nodes = [{ p: V(0, 0, 0), s: 0.6 }], edges = [], sig = []; // the agent hub, the brightest thing in the scene
      for (let i = 0; i < Math.round(24 * D); i++) nodes.push({ p: randDir().multiplyScalar(rr(0.95, 1.3)), s: rr(0.035, 0.055) }); // a sparse shell around it
      const C = 8, concepts = [];
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let c = 0; c < C; c++) {
        const y = 1 - (2 * (c + 0.5)) / C, rad = Math.sqrt(1 - y * y), th = c * golden + 0.5;
        const d = V(Math.cos(th) * rad, y * 0.8, Math.sin(th) * rad).normalize().multiplyScalar(rr(2.85, 3.2));
        const ci = nodes.length; concepts.push(ci); nodes.push({ p: d, s: 0.25 });
        sig.push(edges.length); edges.push([0, ci]);
        // the spoke from the hub, beaded so it reads as a relationship and not a stray line
        polyline(nodes, [], [d.clone().setLength(0.8), d.clone().setLength(d.length() - 0.3)], { step: 0.2, s: [0.04, 0.06] });
        const out = d.clone().normalize();
        for (let k = 0; k < 3; k++) {
          const sp = d.clone().addScaledVector(out, 0.55).add(randDir().multiplyScalar(0.62));
          const si = nodes.length; nodes.push({ p: sp, s: rr(0.12, 0.15) });
          sig.push(edges.length); edges.push([ci, si]);
          const L = Math.round(12 * D);
          for (let l = 0; l < L; l++) {
            nodes.push({ p: sp.clone().add(randDir().multiplyScalar(rr(0.12, 0.36))), s: rr(0.04, 0.07) });
            const e = edges.length; edges.push([si, nodes.length - 1]); if (l % 3 === 0) sig.push(e);
          }
        }
      }
      // relation arcs: each concept to its two nearest concepts, bowed outward like links on a globe
      const seen = new Set();
      concepts.forEach((a) => {
        concepts.filter((b) => b !== a).sort((x, y) => nodes[a].p.distanceTo(nodes[x].p) - nodes[a].p.distanceTo(nodes[y].p))
          .slice(0, 2).forEach((b) => {
            const key = a < b ? a + "_" + b : b + "_" + a;
            if (seen.has(key)) return; seen.add(key);
            const A = nodes[a].p, B = nodes[b].p, mid = A.clone().add(B).multiplyScalar(0.5);
            const ctrl = mid.clone().setLength(Math.max(mid.length(), 1.5) + 1.0);
            const K = Math.max(9, Math.round(A.distanceTo(B) / 0.24));
            let prev = a;
            for (let k = 1; k < K; k++) {
              const t = k / K, p = A.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(ctrl, 2 * (1 - t) * t).addScaledVector(B, t * t);
              const i = nodes.length; nodes.push({ p, s: rr(0.035, 0.055) });
              if (k % 3 === 0) { sig.push(edges.length); edges.push([prev, i]); prev = i; }
            }
            sig.push(edges.length); edges.push([prev, b]);
          });
      });
      formation({ center: ONT, nodes, edges, pulseEdges: sig, stations: [0, 1], spin: V(0, 0.035, 0), scatter: 9, pulses: 30, lineOpacity: 0.22 });
    })();
    (function semanticLayers() {
      const nodes = [], edges = [];
      [[4.0, 0.5, 0.25], [4.35, -0.42, -0.55]].forEach(([R, rx, rz]) => {
        const base = ring(nodes, edges, R, Math.round(180 * D), { hotEvery: 30, s: [0.035, 0.06], plane: "xz", jitter: 0.02, links: 60 });
        const e = new THREE.Euler(rx, 0, rz);
        for (let i = base; i < nodes.length; i++) nodes[i].p.applyEuler(e);
      });
      formation({ center: ONT, nodes, edges, stations: [0, 1], spin: V(0, -0.05, 0), scatter: 8, pulses: 8, lineOpacity: 0.16 });
    })();
    (function hubRing() { // a dotted ring around the agent hub, facing the hero camera, with signals circling it
      const nodes = [], edges = [];
      ring(nodes, edges, 0.66, 34, { s: [0.05, 0.07], jitter: 0.01, links: 17 });
      formation({ center: ONT, nodes, edges, stations: [0, 1], spin: V(0, 0, 0.22), scatter: 5, pulses: 6, lineOpacity: 0.34 });
    })();

    /* ---- station 2: agent loop + tool loop, the Python sandbox, a skills tree ---- */
    const CAPS = V(10, -1, -28);
    (function capabilities() {
      const T = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.34, 0.3, 0.06));
      const R = 1.6, ox = -0.7, A0 = V(-0.9 + ox, 0, 0), B0 = V(0.9 + ox, 0, 0), BOX = V(0.9 + ox + R + 0.55, 0, 0);
      const at = (p) => CAPS.clone().add(p.clone().applyQuaternion(T));
      // two interlocking rings, each spinning in its own plane so its bright nodes circle the loop
      [[A0, new THREE.Quaternion(), 0.3], [B0, new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -1.33), -0.38]].forEach(([c, q, sz]) => {
        const nodes = [], edges = [];
        const M = Math.round(150 * D);
        ring(nodes, edges, R, M, { hotEvery: Math.round(M / 5), s: [0.05, 0.085], jitter: 0.03, links: 36 });
        const f = formation({ center: at(c), nodes, edges, stations: [2], spin: V(0, 0, sz), scatter: 5, pulses: 8, lineOpacity: 0.34 });
        f.group.quaternion.copy(T).multiply(q);
      });
      // the sandbox: a wireframe cube of points with data inside; the tool loop runs into its face
      (function sandbox() {
        const nodes = [], edges = [], sig = [], h = 0.78, cs = [];
        for (let i = 0; i < 8; i++) cs.push(V(i & 1 ? h : -h, i & 2 ? h : -h, i & 4 ? h : -h));
        [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
          .forEach(([a, b]) => polyline(nodes, edges, [cs[a], cs[b]], { step: 0.15, link: 2, s: [0.05, 0.075] }));
        const g0 = nodes.length, G = 4, GG = G * G * G;
        for (let x = 0; x < G; x++) for (let y = 0; y < G; y++) for (let z = 0; z < G; z++)
          nodes.push({ p: V((x / (G - 1) - 0.5) * 1.05, (y / (G - 1) - 0.5) * 1.05, (z / (G - 1) - 0.5) * 1.05).add(randDir().multiplyScalar(0.05)), s: rr(0.04, 0.07) });
        // a few axis-aligned links inside the grid: data being worked on
        for (let k = 0; k < 10; k++) {
          const a = (rnd() * GG) | 0, ax = [1, G, G * G][(rnd() * 3) | 0], b = a + ax < GG && ((a / ax) | 0) % G < G - 1 ? a + ax : a - ax;
          if (b >= 0 && b < GG) { sig.push(edges.length); edges.push([g0 + a, g0 + b]); }
        }
        // the port on the face the tool loop touches, with four calls into the data (to the near column of the grid)
        const port = nodes.length; nodes.push({ p: V(-h, 0, 0), s: 0.2 });
        [[0, 1, 1], [0, 2, 2], [0, 1, 2], [0, 2, 1]].forEach(([x, y, z]) => { sig.push(edges.length); edges.push([port, g0 + x * G * G + y * G + z]); });
        const f = formation({ center: at(BOX), nodes, edges, pulseEdges: sig, stations: [2], spin: V(0, 0.16, 0), scatter: 5, pulses: 12, lineOpacity: 0.26 });
        f.group.quaternion.copy(T);
      })();
      // skills: a tree that decomposes a task, rooted on top of the agent loop
      (function skills() {
        const nodes = [], edges = [], sig = [];
        const root = A0.clone().add(V(0, R, 0));
        nodes.push({ p: root, s: 0.18 });
        [-0.8, 0, 0.8].forEach((x1) => {
          const p1 = root.clone().add(V(x1, 0.8, rr(-0.2, 0.2))), i1 = nodes.length; nodes.push({ p: p1, s: 0.13 });
          sig.push(edges.length); edges.push([0, i1]);
          [-0.27, 0.27].forEach((x2) => {
            const p2 = p1.clone().add(V(x2, 0.62, rr(-0.15, 0.15))), i2 = nodes.length; nodes.push({ p: p2, s: 0.09 });
            sig.push(edges.length); edges.push([i1, i2]);
            [-0.14, 0.14].forEach((x3) => {
              const i3 = nodes.length; nodes.push({ p: p2.clone().add(V(x3, 0.42, rr(-0.1, 0.1))), s: 0.06 });
              sig.push(edges.length); edges.push([i2, i3]);
            });
          });
        });
        formation({ center: CAPS.clone(), nodes: nodes.map((n) => ({ p: n.p.clone().applyQuaternion(T), s: n.s })), edges, pulseEdges: sig, stations: [2], scatter: 5, pulses: 10, lineOpacity: 0.34 });
      })();
    })();

    /* ---- stations 3–4: a rail through the five stages ----
       The rail climbs diagonally with little depth, so from the first "how" camera the five markers sit on a
       clean lower-left to upper-right line. The last "how" camera stands off to the left of the top of the
       rail and looks across and down it: Deliver sits in the right half with Verify below it, and the earlier
       stages drop away out of frame instead of running under the text. */
    const railCurve = curve([V(-6, -3, -40), V(-3, 0, -42.5), V(0, 3, -45), V(3, 6, -47.5)]);
    const STAGE_T = [0.06, 0.28, 0.5, 0.72, 0.94];
    const MK = STAGE_T.map((t) => railCurve.getPoint(t).add(V(0, 1.6, 0)));
    const MS = 0.85; // marker scale
    const camHow0 = MK[0].clone().add(V(1, 0, 17)), tgtHow0 = MK[1].clone().lerp(MK[2], 0.5);
    const camHow1 = MK[4].clone().add(V(-11, 2, 5)), tgtHow1 = MK[4].clone().lerp(MK[3], 0.2);
    const markerBottom = [];
    function rail() {
      const nodes = [], edges = [], run = [], M = Math.round(150 * D), center = railCurve.getPoint(0.5), fwd = V(0, 0, 1);
      for (let side = -1; side <= 1; side += 2) {
        const base = nodes.length;
        for (let i = 0; i < M; i++) {
          const t = i / (M - 1), p = railCurve.getPoint(t), tan = railCurve.getTangent(t);
          const across = tan.clone().cross(fwd).normalize(); // the ladder faces the first "how" camera
          p.addScaledVector(across, side * 0.3).sub(center);
          nodes.push({ p, s: rr(0.04, 0.065) });
          if (i && i % 3 === 0) { run.push(edges.length); edges.push([base + i - 3, base + i]); }
          if (side === 1 && i % 6 === 0) edges.push([i, base + i]);
        }
      }
      // a beaded stem from the rail up to each stage marker (kept here so the Act gear can spin freely)
      MK.forEach((m, k) => {
        const a = m.clone().sub(center).add(V(0, -1.6, 0)), b = m.clone().sub(center).add(V(0, markerBottom[k] ?? -1.0, 0));
        const st = polyline(nodes, [], [a, b], { step: 0.1, s: [0.04, 0.055] });
        run.push(edges.length); edges.push([st[0], st[st.length - 1]]);
      });
      return { nodes, edges, run, center };
    }
    const markers = [
      function understand() { // a lens focusing on entities
        const nodes = [{ p: V(0, 0, 0), s: 0.26 }], edges = [], sig = [];
        ring(nodes, edges, 0.92, 42, { jitter: 0.01, links: 21 }); ring(nodes, edges, 0.6, 28, { jitter: 0.01, links: 14 }); ring(nodes, edges, 0.3, 14, { jitter: 0.01, links: 7 });
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + 0.3, i = nodes.length;
          nodes.push({ p: V(Math.cos(a) * 1.32, Math.sin(a) * 1.32, 0), s: 0.13 });
          sig.push(edges.length); edges.push([0, i]);
        }
        return { nodes, edges, sig };
      },
      function plan() { // a goal breaking into steps
        const nodes = [], edges = [], sig = [];
        const root = V(0, 0.95, 0); nodes.push({ p: root, s: 0.24 });
        [-0.82, 0, 0.82].forEach((x) => {
          const m = V(x, 0.12, 0), im = nodes.length; nodes.push({ p: m, s: 0.14 });
          sig.push(edges.length); edges.push([0, im]); polyline(nodes, [], [root, m], { step: 0.14, s: [0.035, 0.05] });
          [-0.28, 0.28].forEach((dx) => {
            const l = V(x + dx, -0.72, 0), il = nodes.length; nodes.push({ p: l, s: 0.1 });
            sig.push(edges.length); edges.push([im, il]); polyline(nodes, [], [m, l], { step: 0.14, s: [0.035, 0.05] });
          });
        });
        return { nodes, edges, sig };
      },
      function act() { // a turning gear: tools doing the work
        const nodes = [{ p: V(0, 0, 0), s: 0.24 }], edges = [], sig = [];
        const th = (Math.PI * 2) / 10, pts = [];
        for (let k = 0; k < 10; k++) {
          const a = k * th, P = (r, f) => V(Math.cos(a + f * th) * r, Math.sin(a + f * th) * r, 0);
          pts.push(P(1.0, 0.06), P(1.0, 0.44), P(0.74, 0.56), P(0.74, 0.94));
        }
        polyline(nodes, edges, pts, { step: 0.11, link: 1, s: [0.045, 0.07], closed: true });
        const r0 = ring(nodes, edges, 0.32, 15, { jitter: 0.01, links: 5 });
        for (let k = 0; k < 5; k++) {
          sig.push(edges.length); edges.push([0, r0 + k * 3]);
          const i = nodes.length, a = (k / 5) * Math.PI * 2; nodes.push({ p: V(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0), s: 0.1 });
          sig.push(edges.length); edges.push([r0 + k * 3, i]);
        }
        return { nodes, edges, sig, spin: V(0, 0, -0.35) };
      },
      function verify() { // a shield with a check
        const nodes = [], edges = [], sig = [];
        polyline(nodes, edges, [V(-0.8, 0.95, 0), V(0, 1.08, 0), V(0.8, 0.95, 0), V(0.8, 0.2, 0), V(0.55, -0.45, 0), V(0, -1.05, 0), V(-0.55, -0.45, 0), V(-0.8, 0.2, 0)],
          { step: 0.11, link: 1, s: [0.045, 0.07], closed: true });
        const a = V(-0.42, 0.02, 0), b = V(-0.1, -0.34, 0), c = V(0.46, 0.42, 0);
        polyline(nodes, [], [a, b, c], { step: 0.09, s: [0.07, 0.1] });
        const ia = nodes.length; nodes.push({ p: a, s: 0.14 }); const ib = nodes.length; nodes.push({ p: b, s: 0.22 }); const ic = nodes.length; nodes.push({ p: c, s: 0.16 });
        sig.push(edges.length); edges.push([ia, ib]); sig.push(edges.length); edges.push([ib, ic]);
        return { nodes, edges, sig };
      },
      function deliver() { // a stack of generated files, returned to the user
        const nodes = [], edges = [], sig = [];
        const P = (x, y, z = 0) => V(x, y, z);
        // front sheet with a folded corner and lines of text
        polyline(nodes, edges, [P(-0.6, -0.78), P(0.6, -0.78), P(0.6, 0.46), P(0.3, 0.78), P(-0.6, 0.78)], { step: 0.11, link: 2, s: [0.05, 0.075], closed: true });
        polyline(nodes, edges, [P(0.3, 0.78), P(0.3, 0.46), P(0.6, 0.46)], { step: 0.1, link: 1, s: [0.045, 0.065] });
        [0.36, 0.12, -0.12, -0.36].forEach((y, k) => polyline(nodes, edges, [P(-0.4, y), P(k === 3 ? 0.05 : 0.38, y)], { step: 0.09, link: 2, s: [0.05, 0.08], sig }));
        // the sheets behind it: only the edges that peek out
        [[0.24, 0.2], [0.48, 0.4]].forEach(([dx, dy], k) => {
          const z = -0.06 * (k + 1), x0 = -0.6 + dx, x1 = 0.6 + dx, y0 = -0.78 + dy, y1 = 0.78 + dy, xin = k ? 0.6 + 0.24 : 0.6, yin = k ? 0.78 + 0.2 : 0.78;
          polyline(nodes, edges, [P(x0, yin, z), P(x0, y1, z), P(x1, y1, z), P(x1, y0, z), P(xin, y0, z)], { step: 0.12, link: 2, s: [0.04, 0.06], sig });
        });
        nodes.push({ p: P(0.05, -0.36), s: 0.2 }); // a cursor at the end of the last line
        return { nodes, edges, sig };
      },
    ];
    // stages 1-3 turn towards the first "how" camera; Verify and Deliver, which also carry the last "how"
    // station, turn most of the way towards the last camera so they read at both (yaw only)
    const yawTo = (from, c) => Math.atan2(c.x - from.x, c.z - from.z);
    markers.forEach((make, k) => {
      const m = make();
      m.nodes.forEach((n) => n.p.multiplyScalar(MS));
      markerBottom[k] = Math.min(...m.nodes.map((n) => n.p.y)) - 0.06;
      const f = formation({ center: MK[k], nodes: m.nodes, edges: m.edges, pulseEdges: m.sig, stations: [3, 4], spin: m.spin || null, scatter: 5, pulses: 8, lineOpacity: 0.34 });
      const a0 = yawTo(MK[k], camHow0), a1 = yawTo(MK[k], camHow1);
      f.group.rotation.set(0, k < 3 ? a0 : a0 + Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)) * 0.65, 0);
    });
    (function railFormation() {
      const r = rail();
      formation({ center: r.center, nodes: r.nodes, edges: r.edges, pulseEdges: r.run, stations: [3, 4], scatter: 6, pulses: 22, lineOpacity: 0.26 });
    })();

    /* ---- station 5: the five real screenshots, floating in an arc ---- */
    const GAL = V(-4, 2, -80);
    const camGal = GAL.clone().add(V(-1.0, 0.5, 15));
    (function gallery() {
      const shots = ["dashboard", "agent.settings", "skills", "mcp.servers", "tracing-dashboard"];
      const f = GAL.clone().sub(camGal).normalize(), r = f.clone().cross(V(0, 1, 0)).normalize(), u = r.clone().cross(f).normalize();
      const dist = camGal.distanceTo(GAL), W = 2.6, H = (W * 9) / 16;
      // [across, up, back]: the arc bows to the right and away in depth, so neighbours separate
      const slots = [[-0.9, 3.7, 0.1], [0.12, 1.85, 0.6], [0.45, 0, 1.0], [0.12, -1.85, 0.6], [-0.9, -3.7, 0.1]];
      const onArc = (x, y, back = 0) => camGal.clone().addScaledVector(f.clone().multiplyScalar(dist).addScaledVector(r, x).addScaledVector(u, y).normalize(), dist + back);
      const nodes = [], edges = [], sig = [], o = new THREE.Object3D(), spine = [];
      slots.forEach(([x, y, back], i) => {
        const pos = onArc(x, y, back);
        screen({ src: "./assets/Nebras/" + shots[i] + ".png", center: pos, width: W, stations: [5], face: 5 });
        o.position.copy(pos); o.lookAt(camGal); o.updateMatrixWorld();
        const fw = W / 2 + 0.07, fh = H / 2 + 0.07, L = (a, b) => o.localToWorld(V(a, b, -0.1)).sub(GAL);
        polyline(nodes, edges, [L(-fw, -fh), L(fw, -fh), L(fw, fh), L(-fw, fh)], { step: 0.2, link: 9, s: [0.04, 0.06], closed: true });
        const port = nodes.length; nodes.push({ p: L(fw, 0), s: 0.15 });
        const sp = onArc(x + W / 2 + 0.95, y, back + 0.4).sub(GAL), si = nodes.length; nodes.push({ p: sp, s: 0.18 });
        spine.push(si); sig.push(edges.length); edges.push([port, si]);
        polyline(nodes, [], [nodes[port].p, sp], { step: 0.16, s: [0.035, 0.05] });
      });
      for (let i = 1; i < spine.length; i++) {
        sig.push(edges.length); edges.push([spine[i - 1], spine[i]]);
        polyline(nodes, [], [nodes[spine[i - 1]].p, nodes[spine[i]].p], { step: 0.16, s: [0.035, 0.05] });
      }
      formation({ center: GAL, nodes, edges, pulseEdges: sig, stations: [5], scatter: 6, pulses: 10, lineOpacity: 0.3 });
    })();

    /* ---- station 6: built on Nawras, the ontology above a foundation of workflow blocks ---- */
    const OUT = V(10.5, -0.5, -100);
    (function outcome() {
      const nodes = [], edges = [], sig = [];
      const Y = -2.0, TH = 0.24, blocks = [];
      // the foundation: Nawras workflow blocks as low slabs, with in/out ports and flows between columns
      const NC = 3;
      for (let c = 0; c < NC; c++) {
        const col = [];
        for (let r = 0; r < 3; r++) {
          const cx = (c - (NC - 1) / 2) * 1.7, cz = (r - 1) * 1.25 + rr(-0.08, 0.08), bw = 1.0, bd = 0.56;
          const rect = (y) => [V(cx - bw / 2, y, cz - bd / 2), V(cx + bw / 2, y, cz - bd / 2), V(cx + bw / 2, y, cz + bd / 2), V(cx - bw / 2, y, cz + bd / 2)];
          polyline(nodes, edges, rect(Y), { step: 0.15, link: 3, s: [0.04, 0.055], closed: true });
          polyline(nodes, edges, rect(Y + TH), { step: 0.13, link: 3, s: [0.045, 0.065], closed: true });
          rect(Y).forEach((q) => { const a = nodes.length; nodes.push({ p: q.clone(), s: 0.05 }); nodes.push({ p: q.clone().add(V(0, TH, 0)), s: 0.05 }); edges.push([a, a + 1]); });
          const inP = nodes.length; nodes.push({ p: V(cx - bw / 2 - 0.1, Y + TH / 2, cz), s: 0.17 });
          const outP = nodes.length; nodes.push({ p: V(cx + bw / 2 + 0.1, Y + TH / 2, cz), s: 0.17 });
          const top = nodes.length; nodes.push({ p: V(cx, Y + TH, cz), s: 0.09 });
          col.push({ inP, outP, top, p: V(cx, Y + TH, cz) });
        }
        blocks.push(col);
      }
      for (let c = 0; c < NC - 1; c++) blocks[c].forEach((b, i) => {
        const t = new Set([i]); if (rnd() < 0.5) t.add((rnd() * 3) | 0);
        t.forEach((j) => {
          sig.push(edges.length); edges.push([b.outP, blocks[c + 1][j].inP]);
          polyline(nodes, [], [nodes[b.outP].p, nodes[blocks[c + 1][j].inP].p], { step: 0.12, s: [0.035, 0.05] });
        });
      });
      // a faint floor grid under the blocks
      for (let gx = 0; gx < 9; gx++) for (let gz = 0; gz < 6; gz++) nodes.push({ p: V((gx - 4) * 0.6, Y - 0.1, (gz - 2.5) * 0.6), s: 0.03 });
      // the ontology above
      const HUB = V(0, 2.0, 0), hub = nodes.length; nodes.push({ p: HUB, s: 0.3 });
      const flat = blocks.flat(), golden = Math.PI * (3 - Math.sqrt(5)), used = new Set(), cons = [];
      for (let c = 0; c < 7; c++) {
        const y = 1 - (2 * (c + 0.5)) / 7, rad = Math.sqrt(1 - y * y), th = c * golden;
        const d = HUB.clone().add(V(Math.cos(th) * rad * 1.45, y * 1.0, Math.sin(th) * rad * 1.35));
        const ci = nodes.length; cons.push(ci); nodes.push({ p: d, s: 0.22 });
        sig.push(edges.length); edges.push([hub, ci]);
        for (let l = 0; l < Math.round(18 * D); l++) {
          nodes.push({ p: d.clone().add(randDir().multiplyScalar(rr(0.14, 0.46))), s: rr(0.04, 0.07) });
          const e = edges.length; edges.push([ci, nodes.length - 1]); if (l % 4 === 0) sig.push(e);
        }
        // grounded in the platform: a beaded link straight down to the block beneath
        const b = flat.filter((q) => !used.has(q)).sort((p, q) => Math.hypot(p.p.x - d.x, p.p.z - d.z) - Math.hypot(q.p.x - d.x, q.p.z - d.z))[0];
        used.add(b); sig.push(edges.length); edges.push([ci, b.top]);
        polyline(nodes, [], [d, b.p], { step: 0.28, s: [0.035, 0.05] });
      }
      for (let c = 0; c < 7; c++) { sig.push(edges.length); edges.push([cons[c], cons[(c + 2) % 7]]); } // relations between concepts
      formation({ center: OUT, nodes, edges, pulseEdges: sig, stations: [6], spin: V(0, 0.04, 0), scatter: 7, pulses: 24, lineOpacity: 0.26 });
    })();

    /* ---- ambient data dust along the whole route ---- */
    const swayX = [[22, 0], [0, 0], [-28, 7], [-46, -1], [-80, -3], [-100, 9], [-130, 6]];
    dust({ count: 2400, zFrom: 22, zTo: -122, sway: (z) => {
      for (let i = 0; i < swayX.length - 1; i++) {
        const [z0, x0] = swayX[i], [z1, x1] = swayX[i + 1];
        if (z <= z0 && z >= z1) return V(x0 + ((z - z0) / (z1 - z0)) * (x1 - x0), 0, 0);
      }
      return V(0, 0, 0);
    } });

    const back = (F, cam, k) => F.clone().add(cam.clone().sub(F).multiplyScalar(k)); // same shot, from further away
    const FIN = V(3, -9, -50);
    return {
      stations: [
        // desktop: every formation starts right of ~66% of the width, so it clears the text column even at
        // 1200px, where that column is widest relative to the screen (60% of 1200 plus the gutter)
        // narrow: the compare slider follows the hero copy, so the ontology sits behind the title and lede, above the
        // buttons; the outcome drops below its cards and the finale rises above the closing call to action
        { sel: ".phero", F: ONT, cam: V(0, 0.8, 20), shift: 0.36, narrowScale: 1.5, narrowOffset: V(0, -9.9, 0) },
        { sel: "#overview", F: V(-0.5, -0.2, -7), cam: V(-1.5, 1.6, 2), shift: 0.12, inside: true },
        { sel: "#capabilities", F: CAPS, cam: back(CAPS, CAPS.clone().add(V(2.5, 1.4, 17.5)), 1.1), shift: 0.41 },
        { sel: "#how .step:first-child", F: tgtHow0, cam: back(tgtHow0, camHow0, 1.06), shift: 0.38 },
        { sel: "#how .step:last-child", F: tgtHow1, cam: camHow1, shift: 0.34 },
        { sel: "#gallery", F: GAL, cam: camGal, shift: 0.385 },
        { sel: "#outcome", F: OUT, cam: OUT.clone().add(V(3.5, 5.5, 15)), shift: 0.415, narrowOffset: V(0, 8.6, 0) },
        { sel: "#next", F: FIN, cam: back(FIN, V(18, 36, 50), 1.12), shift: 0.47, narrowScale: 0.85, narrowOffset: V(-6, -20, 0) },
      ],
      fog: { finaleNear: 112, finaleFar: 258 },
    };
  },
});
