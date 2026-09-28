/* Cinematic scroll: one continuous 3D world the camera flies through as the page scrolls.
   Each page section is a "station" with its own formation:
     hero → agent core · about → inside the core · stack → four skill rings
     work → one formation per project · path → timeline rail · contact → the whole route
   Formations assemble as the camera arrives and dissolve as it leaves; signals travel
   along their edges. Content stays in the DOM; this canvas is a backdrop. */
import * as THREE from "../vendor/three.module.min.js";

const root = document.documentElement;
const canvas = document.getElementById("scene3d");
const RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { return false; }
}

if (!canvas || !webglOK()) {
  root.classList.add("no3d");
} else {
  try { init(); } catch (e) { root.classList.add("no3d"); console.error(e); }
}

function init() {
  /* ---------------- helpers ---------------- */
  let seed = 7;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + rnd() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function randDir() {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return V(Math.cos(th) * s, u, Math.sin(th) * s);
  }

  /* ---------------- renderer / camera ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

  // uniforms shared by every material
  const U = {
    uTime: { value: 0 },
    uScale: { value: 800 },
    uFogNear: { value: 18 },
    uFogFar: { value: 50 },
    uColor: { value: new THREE.Color("#2740E6") },
    uHot: { value: new THREE.Color("#1c30b8") },
  };

  const pointVert = /* glsl */`
    attribute vec3 aScatter; attribute float aSeed; attribute float aSize;
    uniform float uTime, uScale, uAssemble, uFogNear, uFogFar;
    varying float vAlpha; varying float vHot;
    void main(){
      float t = clamp(uAssemble * 1.7 - aSeed * 0.7, 0.0, 1.0);
      t = t * t * (3.0 - 2.0 * t);
      vec3 p = mix(aScatter, position, t);
      p += 0.05 * vec3(sin(uTime * 0.7 + aSeed * 40.0), cos(uTime * 0.6 + aSeed * 23.0), sin(uTime * 0.5 + aSeed * 11.0));
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float depth = -mv.z;
      gl_Position = projectionMatrix * mv;
      gl_PointSize = min(aSize * uScale / max(depth, 0.1), 72.0);
      float tw = 0.75 + 0.25 * sin(uTime * 1.6 + aSeed * 60.0);
      vAlpha = (0.25 + 0.75 * t) * tw * smoothstep(0.6, 3.2, depth) * (1.0 - smoothstep(uFogNear, uFogFar, depth));
      vHot = step(0.16, aSize);
    }`;
  const pointFrag = /* glsl */`
    uniform vec3 uColor, uHot; uniform float uOpacity;
    varying float vAlpha; varying float vHot;
    void main(){
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      float halo = pow(1.0 - d, 2.0);
      float core = smoothstep(0.42, 0.0, d);
      vec3 col = mix(uColor, uHot, core * (0.45 + 0.4 * vHot));
      float a = (halo * 0.55 + core * 0.75) * vAlpha * uOpacity;
      if (a < 0.004) discard;
      gl_FragColor = vec4(col, a);
    }`;
  const lineVert = /* glsl */`
    attribute vec3 aScatter; attribute float aSeed;
    uniform float uTime, uAssemble, uFogNear, uFogFar;
    varying float vAlpha;
    void main(){
      float t = clamp(uAssemble * 1.7 - aSeed * 0.7, 0.0, 1.0);
      t = t * t * (3.0 - 2.0 * t);
      vec3 p = mix(aScatter, position, t);
      p += 0.05 * vec3(sin(uTime * 0.7 + aSeed * 40.0), cos(uTime * 0.6 + aSeed * 23.0), sin(uTime * 0.5 + aSeed * 11.0));
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float depth = -mv.z;
      gl_Position = projectionMatrix * mv;
      vAlpha = t * t * smoothstep(0.6, 3.2, depth) * (1.0 - smoothstep(uFogNear, uFogFar, depth));
    }`;
  const lineFrag = /* glsl */`
    uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
    void main(){ gl_FragColor = vec4(uColor, vAlpha * uOpacity); }`;

  const materials = [];
  function pointMaterial(opacity) {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...U, uAssemble: { value: 0 }, uOpacity: { value: opacity } },
      vertexShader: pointVert, fragmentShader: pointFrag,
      transparent: true, depthWrite: false,
    });
    materials.push(m); return m;
  }
  function lineMaterial(opacity) {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...U, uAssemble: { value: 0 }, uOpacity: { value: opacity } },
      vertexShader: lineVert, fragmentShader: lineFrag,
      transparent: true, depthWrite: false,
    });
    materials.push(m); return m;
  }

  /* ---------------- formations ---------------- */
  const formations = [];
  /* nodes: [{p:Vector3, s:size}], edges: [[a,b]], pulseEdges: indices into edges */
  function formation({ center, nodes, edges, pulseEdges, stations, spin, scatter = 6, pulses = 10, lineOpacity = 0.22 }) {
    const group = new THREE.Group();
    group.position.copy(center);
    scene.add(group);
    const n = nodes.length;
    const pos = new Float32Array(n * 3), sca = new Float32Array(n * 3), sd = new Float32Array(n), sz = new Float32Array(n);
    const scat = [];
    nodes.forEach((nd, i) => {
      const s = nd.p.clone().add(randDir().multiplyScalar(rr(scatter * 0.4, scatter)))
        .add(nd.p.clone().normalize().multiplyScalar(rr(1, scatter * 0.6)));
      scat.push(s);
      pos.set([nd.p.x, nd.p.y, nd.p.z], i * 3); sca.set([s.x, s.y, s.z], i * 3);
      sd[i] = rnd(); sz[i] = nd.s;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(sca, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    const pm = pointMaterial(1);
    const pts = new THREE.Points(g, pm); pts.frustumCulled = false; group.add(pts);

    let lm = null;
    if (edges.length) {
      const lp = new Float32Array(edges.length * 6), ls = new Float32Array(edges.length * 6), lsd = new Float32Array(edges.length * 2);
      edges.forEach(([a, b], k) => {
        const A = nodes[a].p, B = nodes[b].p, SA = scat[a], SB = scat[b];
        lp.set([A.x, A.y, A.z, B.x, B.y, B.z], k * 6);
        ls.set([SA.x, SA.y, SA.z, SB.x, SB.y, SB.z], k * 6);
        lsd[k * 2] = sd[a]; lsd[k * 2 + 1] = sd[b];
      });
      const lg = new THREE.BufferGeometry();
      lg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
      lg.setAttribute("aScatter", new THREE.BufferAttribute(ls, 3));
      lg.setAttribute("aSeed", new THREE.BufferAttribute(lsd, 1));
      lm = lineMaterial(lineOpacity);
      const lines = new THREE.LineSegments(lg, lm); lines.frustumCulled = false; group.add(lines);
    }

    // signals travelling along edges
    const pe = pulseEdges && pulseEdges.length ? pulseEdges : edges.map((_, i) => i);
    const P = pe.length ? pulses : 0;
    let pulseState = [], pp = null, pg = null, qm = null;
    if (P) {
      pp = new Float32Array(P * 3);
      const psd = new Float32Array(P), psz = new Float32Array(P);
      for (let i = 0; i < P; i++) {
        pulseState.push({ e: pe[(rnd() * pe.length) | 0], t: rnd(), v: rr(0.5, 1.1) });
        psd[i] = 0; psz[i] = rr(0.16, 0.22);
      }
      pg = new THREE.BufferGeometry();
      const attr = new THREE.BufferAttribute(pp, 3); attr.setUsage(THREE.DynamicDrawUsage);
      pg.setAttribute("position", attr);
      pg.setAttribute("aScatter", attr);
      pg.setAttribute("aSeed", new THREE.BufferAttribute(psd, 1));
      pg.setAttribute("aSize", new THREE.BufferAttribute(psz, 1));
      qm = pointMaterial(0);
      qm.uniforms.uAssemble.value = 1;
      const q = new THREE.Points(pg, qm); q.frustumCulled = false; group.add(q);
    }

    const f = {
      group, assemble: 0,
      update(dt, u, cw) {
        let a = 0;
        for (const s of stations) a = Math.max(a, 1 - smooth(0.5, 1.45, Math.abs(u - s)));
        a = Math.max(a, cw);
        f.assemble = a;
        pm.uniforms.uAssemble.value = a;
        if (lm) lm.uniforms.uAssemble.value = a;
        if (spin) { group.rotation.x += spin.x * dt; group.rotation.y += spin.y * dt; group.rotation.z += spin.z * dt; }
        if (P) {
          qm.uniforms.uOpacity.value = a * a * a;
          if (a > 0.02) {
            for (let i = 0; i < P; i++) {
              const st = pulseState[i];
              const [ia, ib] = edges[st.e];
              const A = nodes[ia].p, B = nodes[ib].p;
              st.t += dt * st.v * (1.6 / Math.max(0.4, A.distanceTo(B)));
              if (st.t >= 1) { st.t = 0; st.e = pe[(rnd() * pe.length) | 0]; st.v = rr(0.5, 1.1); }
              pp[i * 3] = A.x + (B.x - A.x) * st.t; pp[i * 3 + 1] = A.y + (B.y - A.y) * st.t; pp[i * 3 + 2] = A.z + (B.z - A.z) * st.t;
            }
            pg.attributes.position.needsUpdate = true;
          }
        }
      },
    };
    formations.push(f);
    return f;
  }

  function knnEdges(nodes, from, to, k, maxD) {
    const edges = [], seen = new Set();
    for (let i = from; i < to; i++) {
      const best = [];
      for (let j = from; j < to; j++) {
        if (i === j) continue;
        const d = nodes[i].p.distanceToSquared(nodes[j].p);
        if (d > maxD * maxD) continue;
        best.push([d, j]);
      }
      best.sort((a, b) => a[0] - b[0]);
      for (let m = 0; m < Math.min(k, best.length); m++) {
        const j = best[m][1], key = i < j ? i + "_" + j : j + "_" + i;
        if (!seen.has(key)) { seen.add(key); edges.push([i, j]); }
      }
    }
    return edges;
  }

  const small = window.innerWidth < 760;
  const D = small ? 0.62 : 1; // density on small screens

  /* ---- station 0/1: the agent core ---- */
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

  /* ---- station 2: four skill rings ---- */
  const STACK = V(0, 0, -26);
  [[-3.1, 2.1, 0.5, 0.2], [3.1, 2.1, -0.4, 0.9], [-3.1, -2.1, 1.1, -0.5], [3.1, -2.1, -1.0, -0.2]].forEach(([x, y, rx, ry], k) => {
    const nodes = [], edges = [], M = Math.round(170 * D), R = 1.9;
    const e = new THREE.Euler(rx, ry, 0);
    for (let i = 0; i < M; i++) {
      const a = (i / M) * Math.PI * 2;
      nodes.push({ p: V(Math.cos(a) * R + rr(-0.12, 0.12), Math.sin(a) * R + rr(-0.12, 0.12), rr(-0.18, 0.18)).applyEuler(e), s: i % 17 === 0 ? 0.2 : rr(0.05, 0.09) });
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
        const cx = (L - (layers.length - 1) / 2) * 1.9, cy = (b - (cnt - 1) / 2) * 1.05, cz = rr(-0.6, 0.6);
        const w = 1.0, h = 0.52, base = nodes.length, per = 14;
        for (let i = 0; i < per; i++) {
          const t = i / per, perim = 2 * (w + h), d = t * perim;
          let x, y;
          if (d < w) { x = -w / 2 + d; y = -h / 2; } else if (d < w + h) { x = w / 2; y = -h / 2 + (d - w); }
          else if (d < 2 * w + h) { x = w / 2 - (d - w - h); y = h / 2; } else { x = -w / 2; y = h / 2 - (d - 2 * w - h); }
          nodes.push({ p: V(cx + x, cy + y, cz), s: rr(0.05, 0.075) });
          edges.push([base + i, base + ((i + 1) % per)]);
        }
        const inP = nodes.length; nodes.push({ p: V(cx - w / 2 - 0.08, cy, cz), s: 0.17 });
        const outP = nodes.length; nodes.push({ p: V(cx + w / 2 + 0.08, cy, cz), s: 0.17 });
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
    formation({ center: NAW, nodes, edges, pulseEdges: flow, stations: [3], spin: null, scatter: 7, pulses: 16, lineOpacity: 0.3 });
  })();

  /* ---- station 4: Nebras, an ontology of concepts around an agent hub ---- */
  const NEB = V(-9, 1.5, -62);
  const nebras = (function () {
    const nodes = [{ p: V(0, 0, 0), s: 0.34 }], edges = [], links = [];
    const C = 7, concepts = [];
    for (let c = 0; c < C; c++) {
      const d = randDir().multiplyScalar(rr(2.6, 3.3));
      concepts.push(nodes.length); nodes.push({ p: d, s: 0.24 });
      links.push(edges.length); edges.push([0, nodes.length - 1]);
      const ci = nodes.length - 1, L = Math.round(34 * D);
      for (let l = 0; l < L; l++) {
        nodes.push({ p: d.clone().add(randDir().multiplyScalar(rr(0.35, 1.2))), s: rr(0.045, 0.08) });
        const e = edges.length; edges.push([ci, nodes.length - 1]); if (l % 3 === 0) links.push(e);
      }
    }
    for (let c = 0; c < C; c++) { links.push(edges.length); edges.push([concepts[c], concepts[(c + 2) % C]]); }
    return formation({ center: NEB, nodes, edges, pulseEdges: links, stations: [4], spin: V(0, -0.06, 0), scatter: 7, pulses: 22, lineOpacity: 0.24 });
  })();

  /* ---- station 5: BI Agent, a 3D bar chart on a data grid ---- */
  const BI = V(8, -1, -80);
  (function bi() {
    const nodes = [], edges = [], up = [];
    for (let gx = 0; gx < 12; gx++) for (let gz = 0; gz < 8; gz++)
      nodes.push({ p: V((gx - 5.5) * 0.55, -1.6, (gz - 3.5) * 0.55), s: 0.04 });
    for (let bx = 0; bx < 6; bx++) for (let bz = 0; bz < 3; bz++) {
      const h = 0.6 + Math.abs(Math.sin(bx * 1.3 + bz * 0.7)) * 2.8 + rr(0, 0.5);
      const x0 = (bx - 2.5) * 1.05, z0 = (bz - 1) * 1.05, w = 0.34;
      const corners = [[-w, -w], [w, -w], [w, w], [-w, w]], tops = [];
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
  const railCurve = new THREE.CatmullRomCurve3([V(-10, -1, -98), V(-3, 1.2, -104), V(3, -0.6, -112), V(10, 1.5, -121)]);
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
    [0.12, 0.5, 0.88].forEach((t) => {
      const c = railCurve.getPoint(t).sub(center), hub = nodes.length;
      nodes.push({ p: c, s: 0.34 });
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2;
        nodes.push({ p: c.clone().add(V(0, Math.cos(a) * 0.9, Math.sin(a) * 0.9)), s: 0.06 });
        edges.push([hub + 1 + k, hub + 1 + ((k + 1) % 28)]);
      }
    });
    formation({ center, nodes, edges, pulseEdges: run, stations: [6, 7], spin: null, scatter: 6, pulses: 20, lineOpacity: 0.26 });
  })();

  /* ---- ambient data dust along the whole route ---- */
  (function dust() {
    const nodes = [];
    const N = Math.round(2400 * D);
    for (let i = 0; i < N; i++) {
      const z = rr(22, -130), a = rnd() * Math.PI * 2, r = rr(4, 22);
      nodes.push({ p: V(Math.cos(a) * r + (z < -40 ? Math.sin(z * 0.05) * 6 : 0), Math.sin(a) * r * 0.7, z), s: rr(0.025, 0.06) });
    }
    const f = formation({ center: V(0, 0, 0), nodes, edges: [], stations: [], scatter: 0.01, pulses: 0 });
    f.update = function () { this.group.children[0].material.uniforms.uAssemble.value = 1; };
    f.group.children[0].material.uniforms.uOpacity.value = 0.55;
  })();

  /* ---- Nebras product screen floating in the ontology ---- */
  const screen = (function () {
    const g = new THREE.PlaneGeometry(5.6, 3.15);
    const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ transparent: true, opacity: 0 }));
    mesh.add(frame);
    mesh.position.copy(NEB).add(V(2.2, -2.9, -2.2));
    scene.add(mesh);
    const loader = new THREE.TextureLoader();
    const tex = {};
    function load(which) {
      if (tex[which]) { m.map = tex[which]; m.needsUpdate = true; return; }
      loader.load("./assets/Nebras/nebras-chat." + which + ".png", (t) => {
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; tex[which] = t;
        if ((root.getAttribute("data-theme") === "dark" ? "dark" : "light") === which) { m.map = t; m.needsUpdate = true; }
      });
    }
    return { mesh, m, frame, load };
  })();

  /* ---------------- stations → camera route ---------------- */
  const stationDefs = [
    { sel: ".hero", F: CORE, cam: V(0, 0.6, 15.5), shift: 0.36 },
    { sel: "#about", F: V(0, 0, -7), cam: V(0.5, 0.2, 1.6), shift: 0.18 },
    { sel: "#stack", F: STACK, cam: STACK.clone().add(V(4.5, 1.6, 12.5)), shift: 0.32 },
    { sel: "#work .proj:nth-of-type(1)", F: NAW, cam: NAW.clone().add(V(5, 2, 11.5)), shift: 0.3 },
    { sel: "#work .proj:nth-of-type(2)", F: NEB, cam: NEB.clone().add(V(-4, 1.2, 11.5)), shift: 0.3 },
    { sel: "#work .proj:nth-of-type(3)", F: BI, cam: BI.clone().add(V(5, 3.5, 11)), shift: 0.3 },
    { sel: "#path .tl-item:first-of-type", F: railCurve.getPoint(0.18), cam: railCurve.getPoint(0.02).add(V(0, 3, 8)), shift: 0.25 },
    { sel: "#path .tl-item:last-of-type", F: railCurve.getPoint(0.86), cam: railCurve.getPoint(0.68).add(V(0, 3, 8)), shift: 0.25 },
    { sel: "#contact", F: V(0, 0, -56), cam: V(44, 42, 46), shift: 0.33 },
  ];
  const stations = stationDefs.map((d) => ({ ...d, el: document.querySelector(d.sel) })).filter((d) => d.el);
  const N = stations.length;
  let camCurve, tgtCurve;
  function buildRoute() {
    const narrow = window.innerWidth < 760;
    const up = V(0, 1, 0);
    const cams = [], tgts = [];
    stations.forEach((s) => {
      let cam = s.cam.clone();
      if (narrow && s.sel !== "#about") cam = s.F.clone().add(cam.clone().sub(s.F).multiplyScalar(1.3));
      const dir = s.F.clone().sub(cam), dist = dir.length(); dir.normalize();
      const right = dir.clone().cross(up).normalize();
      const tgt = s.F.clone().addScaledVector(right, -(narrow ? 0 : s.shift) * dist);
      cams.push(cam); tgts.push(tgt);
    });
    camCurve = new THREE.CatmullRomCurve3(cams, false, "centripetal");
    tgtCurve = new THREE.CatmullRomCurve3(tgts, false, "centripetal");
    screen.mesh.lookAt(cams[Math.min(4, N - 1)]);
  }

  /* scroll position → route parameter, with a dwell at each station */
  let anchors = [];
  function measure() {
    const sy = window.pageYOffset || root.scrollTop || 0, vh = window.innerHeight;
    const maxY = Math.max(1, root.scrollHeight - vh);
    anchors = stations.map((s, i) => {
      if (i === 0) return 0;
      if (i === N - 1) return maxY;
      const r = s.el.getBoundingClientRect();
      return clamp(r.top + sy + Math.min(r.height, vh) / 2 - vh / 2, 0, maxY);
    });
    for (let i = 1; i < N; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
  }
  function scrollToU() {
    const y = window.pageYOffset || root.scrollTop || 0;
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < N - 1; i++) {
      if (y < anchors[i + 1]) {
        const f = (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
        return i + smooth(0.12, 0.88, f);
      }
    }
    return N - 1;
  }

  /* ---------------- theme ---------------- */
  function applyTheme() {
    const dark = root.getAttribute("data-theme") === "dark";
    U.uColor.value.set(dark ? "#6f86ff" : "#2740E6");
    U.uHot.value.set(dark ? "#eef1ff" : "#0f1c8f");
    materials.forEach((m) => { m.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; m.needsUpdate = true; });
    screen.frame.material.color.set(dark ? "#6f86ff" : "#2740E6");
    screen.load(dark ? "dark" : "light");
  }
  new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------------- sizing ---------------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, w < 760 ? 1.5 : 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 760 ? 58 : 45;
    camera.updateProjectionMatrix();
    U.uScale.value = (h * pr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    buildRoute(); measure();
  }

  /* ---------------- loop ---------------- */
  const camPos = V(0, 0, 0), tgt = V(0, 0, 0), mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let uCur = 0, last = performance.now(), raf = 0, running = false;
  const narrowNow = () => window.innerWidth < 760;

  function frame(now, still) {
    const dt = still ? 0 : Math.min(0.05, (now - last) / 1000); last = now;
    if (!still) U.uTime.value += dt;
    const uT = scrollToU();
    uCur = still ? Math.round(uT) : uCur + (uT - uCur) * (1 - Math.exp(-dt * 2.6));
    const cw = smooth(N - 1.7, N - 1, uCur);
    const t = uCur / (N - 1);
    camCurve.getPoint(t, camPos); tgtCurve.getPoint(t, tgt);
    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 3)); mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 3));
    camera.position.copy(camPos);
    camera.position.x += mouse.x * 0.6; camera.position.y += -mouse.y * 0.4;
    camera.lookAt(tgt);
    U.uFogNear.value = 16 + cw * 74; U.uFogFar.value = 46 + cw * 170;
    formations.forEach((f) => f.update(dt, uCur, cw));
    const sa = Math.max(0, 1 - smooth(0.4, 1.3, Math.abs(uCur - 4)));
    screen.m.opacity = sa * 0.92; screen.frame.material.opacity = sa * 0.5;
    screen.mesh.position.y = NEB.y - 2.9 + Math.sin(U.uTime.value * 0.6) * 0.12;
    canvas.style.opacity = narrowNow() && uCur > 0.6 ? "0.5" : "1";
    root.style.setProperty("--route", (uCur / (N - 1)).toFixed(4));
    renderer.render(scene, camera);
  }
  function loop(now) { frame(now, false); raf = requestAnimationFrame(loop); }
  function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  applyTheme();
  resize();
  root.classList.add("has3d");

  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (RM) frame(performance.now(), true); }, 150); });
  window.addEventListener("load", () => { measure(); if (RM) frame(performance.now(), true); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if (window.ResizeObserver) new ResizeObserver(() => measure()).observe(document.body);

  if (RM) {
    // reduced motion: formations fully assembled, no flight; the camera cuts between stations on scroll
    formations.forEach((f) => { const up = f.update; f.update = (dt, u, cw) => up(dt, u, 1); });
    const still = () => frame(performance.now(), true);
    window.addEventListener("scroll", () => requestAnimationFrame(still), { passive: true });
    still();
  } else {
    if (window.matchMedia("(pointer:fine)").matches) {
      window.addEventListener("mousemove", (e) => {
        mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    start();
  }
}
