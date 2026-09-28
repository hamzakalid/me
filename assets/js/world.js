/* world.js: the shared cinematic-scroll engine.
   A page describes a 3D world (formations of nodes and edges, floating screens) and a list of
   stations, one per page section. As the page scrolls, the camera flies a smooth route through the
   stations; each formation assembles as the camera arrives at its stations and dissolves as it
   leaves. The last station can be a "finale" where every formation assembles at once.

   Usage (from a page scene module):
     import { createWorld } from "../world.js";
     createWorld({ canvas: document.getElementById("scene3d"), build(w) { ...; return { stations } } });

   `build(w)` receives helpers (see `api` below) and returns:
     { stations: [{ sel, F, cam, shift }], finale = true }
       sel   CSS selector of the section this station belongs to (anchor = its centre)
       F     world point the camera looks at (the formation's centre)
       cam   camera position
       shift fraction of the camera distance to slide the view target left, so F sits in the right
             half of the screen on desktop (text lives on the left); ignored on narrow screens

   Content always stays in the DOM. Without WebGL the page gets <html class="no3d">; with it,
   <html class="has3d">. Reduced motion: formations stay assembled and the camera cuts between
   stations instead of flying. Rendering pauses while the tab is hidden. */
import * as THREE from "../vendor/three.module.min.js";

export function createWorld({ canvas, build }) {
  const root = document.documentElement;
  const RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function webglOK() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }
  if (!canvas || !webglOK()) { root.classList.add("no3d"); return null; }
  try { return init(); } catch (e) { root.classList.add("no3d"); if (canvas) canvas.style.display = "none"; console.error(e); return null; }

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
    const narrowNow = () => window.innerWidth < 760;

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
    function shaderMaterial(vert, frag, opacity) {
      const m = new THREE.ShaderMaterial({
        uniforms: { ...U, uAssemble: { value: 0 }, uOpacity: { value: opacity } },
        vertexShader: vert, fragmentShader: frag,
        transparent: true, depthWrite: false,
      });
      materials.push(m); return m;
    }

    /* ---------------- formations ---------------- */
    const formations = [];
    /* A formation is a group of nodes with optional edges and signals travelling along them.
         center      Vector3 world position of the group
         nodes       [{ p: Vector3 (local), s: size in world units (~0.04–0.34; >= 0.16 renders "hot") }]
         edges       [[a, b]] node index pairs
         pulseEdges  indices into edges that signals travel on (default: all edges)
         stations    station indices where this formation is assembled
         spin        Vector3 radians/second, or null
         scatter     how far nodes fly apart when dissolved
         pulses      number of signals
         lineOpacity edge opacity
         always      true = ignore stations and stay assembled (ambient layers)
         opacity     overall point opacity (default 1) */
    function formation({ center, nodes, edges = [], pulseEdges, stations = [], spin = null, scatter = 6, pulses = 10, lineOpacity = 0.22, always = false, opacity = 1 }) {
      const group = new THREE.Group();
      group.position.copy(center);
      scene.add(group);
      const n = nodes.length;
      const pos = new Float32Array(n * 3), sca = new Float32Array(n * 3), sd = new Float32Array(n), sz = new Float32Array(n);
      const scat = [];
      nodes.forEach((nd, i) => {
        const s = always ? nd.p.clone() : nd.p.clone().add(randDir().multiplyScalar(rr(scatter * 0.4, scatter)))
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
      const pm = shaderMaterial(pointVert, pointFrag, opacity);
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
        lm = shaderMaterial(lineVert, lineFrag, lineOpacity);
        const lines = new THREE.LineSegments(lg, lm); lines.frustumCulled = false; group.add(lines);
      }

      // signals travelling along edges
      const pe = pulseEdges && pulseEdges.length ? pulseEdges : edges.map((_, i) => i);
      const P = pe.length ? pulses : 0;
      const pulseState = [];
      let pp = null, pg = null, qm = null;
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
        qm = shaderMaterial(pointVert, pointFrag, 0);
        qm.uniforms.uAssemble.value = 1;
        const q = new THREE.Points(pg, qm); q.frustumCulled = false; group.add(q);
      }

      const f = {
        group, assemble: always ? 1 : 0, stations, always,
        update(dt, u, cw) {
          let a = 1;
          if (!always) {
            a = 0;
            for (const s of stations) a = Math.max(a, 1 - smooth(0.5, 1.45, Math.abs(u - s)));
            a = Math.max(a, cw);
          }
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

    /* k-nearest-neighbour edges among nodes[from..to), capped at distance maxD */
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

    /* ambient data dust along a stretch of the route (always visible, never scatters) */
    function dust({ count = 2400, zFrom = 22, zTo = -130, rMin = 4, rMax = 22, sway = null, opacity = 0.55 } = {}) {
      const nodes = [];
      const N = Math.round(count * D);
      for (let i = 0; i < N; i++) {
        const z = rr(zFrom, zTo), a = rnd() * Math.PI * 2, r = rr(rMin, rMax);
        const off = sway ? sway(z) : V(0, 0, 0);
        nodes.push({ p: V(Math.cos(a) * r + off.x, Math.sin(a) * r * 0.7 + off.y, z), s: rr(0.025, 0.06) });
      }
      return formation({ center: V(0, 0, 0), nodes, always: true, pulses: 0, opacity });
    }

    /* A product screenshot floating in the world.
         src      "path.png" or { light: "a.png", dark: "b.png" } (follows the theme)
         center   Vector3 world position
         width    world units (height follows `aspect`, default 16:9)
         stations station indices where it is visible
         face     station index whose camera the screen turns towards (default: first station)
         tilt     extra rotation (Euler) applied after facing
         bob      gentle float */
    const screens = [];
    const loader = new THREE.TextureLoader();
    function screen({ src, center, width = 5.6, aspect = 16 / 9, stations = [], face, tilt = null, bob = true }) {
      const g = new THREE.PlaneGeometry(width, width / aspect);
      const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(g, m);
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ transparent: true, opacity: 0 }));
      mesh.add(frame);
      mesh.position.copy(center);
      mesh.visible = false;
      scene.add(mesh);
      const tex = {};
      let wanted = false;
      const variant = () => (typeof src === "string" ? "one" : root.getAttribute("data-theme") === "dark" ? "dark" : "light");
      function load() {
        const which = variant();
        if (tex[which]) { if (m.map !== tex[which]) { m.map = tex[which]; m.needsUpdate = true; } return; }
        if (tex[which] === null) return; // in flight
        tex[which] = null;
        loader.load(typeof src === "string" ? src : src[which], (t) => {
          t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; tex[which] = t;
          if (variant() === which) { m.map = t; m.needsUpdate = true; }
        });
      }
      const s = { mesh, m, frame, stations, face: face ?? stations[0], tilt, bob, baseY: center.y, phase: rnd() * 6.28,
        themed() { if (wanted) load(); },
        update(u, time) {
          let a = 0;
          for (const st of stations) a = Math.max(a, 1 - smooth(0.4, 1.3, Math.abs(u - st)));
          if (!wanted) { for (const st of stations) if (Math.abs(u - st) < 2.5) wanted = true; if (wanted) load(); }
          mesh.visible = a > 0.003;
          m.opacity = m.map ? a * 0.94 : 0; frame.material.opacity = a * 0.5;
          if (bob) mesh.position.y = s.baseY + Math.sin(time * 0.6 + s.phase) * 0.12;
        } };
      screens.push(s);
      return s;
    }

    const small = window.innerWidth < 760;
    const D = small ? 0.62 : 1; // density on small screens

    const api = { THREE, scene, V, rnd, rr, clamp, smooth, randDir, formation, knnEdges, dust, screen, curve: (pts, closed = false) => new THREE.CatmullRomCurve3(pts, closed, "centripetal"), D, small };
    const spec = build(api) || {};
    const finale = spec.finale !== false;

    /* ---------------- stations → camera route ---------------- */
    const stations = (spec.stations || []).map((d) => ({ ...d, el: document.querySelector(d.sel) }));
    stations.forEach((s) => { if (!s.el) console.warn("world: station selector matched nothing:", s.sel); });
    const N = stations.length;
    if (N < 2) throw new Error("world: need at least two stations");
    let camCurve, tgtCurve;
    function buildRoute() {
      const narrow = narrowNow();
      const up = V(0, 1, 0);
      const cams = [], tgts = [];
      stations.forEach((s) => {
        let cam = s.cam.clone();
        if (narrow && !s.inside) cam = s.F.clone().add(cam.clone().sub(s.F).multiplyScalar(s.narrowScale || 1.3));
        const dir = s.F.clone().sub(cam), dist = dir.length(); dir.normalize();
        const right = dir.clone().cross(up).normalize();
        const tgt = s.F.clone().addScaledVector(right, -(narrow ? 0 : s.shift || 0) * dist);
        cams.push(cam); tgts.push(tgt);
      });
      camCurve = new THREE.CatmullRomCurve3(cams, false, "centripetal");
      tgtCurve = new THREE.CatmullRomCurve3(tgts, false, "centripetal");
      screens.forEach((sc) => {
        const i = clamp(sc.face ?? 0, 0, N - 1);
        sc.mesh.lookAt(cams[i]);
        if (sc.tilt) sc.mesh.rotateX(sc.tilt.x || 0), sc.mesh.rotateY(sc.tilt.y || 0), sc.mesh.rotateZ(sc.tilt.z || 0);
      });
    }

    /* scroll position → route parameter, with a dwell at each station */
    let anchors = [];
    function measure() {
      const sy = window.pageYOffset || root.scrollTop || 0, vh = window.innerHeight;
      const maxY = Math.max(1, root.scrollHeight - vh);
      anchors = stations.map((s, i) => {
        if (i === 0) return 0;
        if (i === N - 1 && finale) return maxY;
        if (!s.el) return -1;
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
      screens.forEach((s) => { s.frame.material.color.set(dark ? "#6f86ff" : "#2740E6"); s.themed(); });
      if (RM) frame(performance.now(), true);
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
    let uCur = 0, last = performance.now(), raf = 0, running = false, ready = false;
    const fogNear = spec.fog?.near ?? 16, fogFar = spec.fog?.far ?? 46;
    const finNear = spec.fog?.finaleNear ?? 90, finFar = spec.fog?.finaleFar ?? 216;

    function frame(now, still) {
      if (!ready) return;
      const dt = still ? 0 : Math.min(0.05, (now - last) / 1000); last = now;
      if (!still) U.uTime.value += dt;
      const uT = scrollToU();
      uCur = still ? Math.round(uT) : uCur + (uT - uCur) * (1 - Math.exp(-dt * 2.6));
      const cw = finale ? smooth(N - 1.7, N - 1, uCur) : 0;
      const t = uCur / (N - 1);
      camCurve.getPoint(t, camPos); tgtCurve.getPoint(t, tgt);
      mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 3)); mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 3));
      camera.position.copy(camPos);
      camera.position.x += mouse.x * 0.6; camera.position.y += -mouse.y * 0.4;
      camera.lookAt(tgt);
      U.uFogNear.value = fogNear + cw * (finNear - fogNear); U.uFogFar.value = fogFar + cw * (finFar - fogFar);
      formations.forEach((f) => f.update(dt, uCur, cw));
      screens.forEach((s) => s.update(uCur, U.uTime.value));
      canvas.style.opacity = narrowNow() && uCur > 0.6 ? "0.5" : "1";
      renderer.render(scene, camera);
    }
    function loop(now) { frame(now, false); raf = requestAnimationFrame(loop); }
    function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    ready = true;
    applyTheme();
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
    return { scene, camera, formations, screens, stations };
  }
}
