// About page background: a three-dimensional universe drawn as points, seen
// through a soft gravitational lens that follows the pointer.
//
// Everything is a point with a real position in depth; the viewpoint drifts
// slowly, so nearer objects shift against farther ones (parallax).
//   · field stars: uniform in volume, so p(d) ∝ d²; apparent flux S = L/d², which
//     reproduces the Euclidean counts N(>S) ∝ S^(−3/2); colours are blackbody
//     colours (Planck × CIE 1931 → sRGB);
//   · spiral galaxies: exponential disc Σ ∝ e^(−R/R_d), sampled exactly as
//     R = R_d (−ln u₁u₂); sech² vertical profile, z = z₀ artanh(2u − 1);
//     logarithmic arms by rejection; Hernquist bulge, r = a √u / (1 − √u).
//     Stars orbit on a flat rotation curve, Ω(R) = v₀ / √(R² + R_c²), so the
//     disc rotates differentially (time is scaled by ~10¹⁵, stated below);
//   · an elliptical galaxy: Hernquist sphere (the 3-D profile whose projection
//     is close to de Vaucouleurs), flattened;
//   · a globular cluster: Plummer sphere, r = a (u^(−2/3) − 1)^(−1/2);
//   · emission nebulae: points drawn from a fractal density, in the Hα 656.3 nm
//     and [O III] 500.7 nm line colours.
// The pointer is a Plummer-sphere mass at depth D_l. A source at depth D_s > D_l
// is lensed with θ_E² scaled by D_ls/D_s = (D_s − D_l)/D_s (thin lens). Its
// images solve the lens equation along the lens–source line,
//   θ³ − βθ² + (θ_c² − θ_E²)θ − βθ_c² = 0,
// and each image is drawn with magnification μ = |(β/θ) dβ/dθ|⁻¹. Light mode
// shows the field as a photographic negative. Plain WebGL, no dependencies.
(function () {
  var canvas = document.querySelector("canvas.sky");
  if (!canvas) return;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) { canvas.hidden = true; return; }

  var W = 0, H = 0, dpr = 1, dark = false, ink = [0.1, 0.1, 0.09];
  var lens = { x: 0, y: 0, m: 0 }, aim = null, lastMove = -1e9, t0 = performance.now();
  var seed = (Math.random() * 1e9) | 0, FOV = 50 * Math.PI / 180, DL = 700;
  var GAL = 5, galaxies = [];       // up to 5 rotating discs (uniform arrays)

  function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2831853 * r()); }

  // ── Colour science ──────────────────────────────────────────────
  // CIE 1931 colour-matching functions, multi-lobe fit of Wyman, Sloan & Shirley (2013).
  function g(l, mu, s1, s2) { var t = (l - mu) / (l < mu ? s1 : s2); return Math.exp(-0.5 * t * t); }
  function cmf(l) {
    return [1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
            0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
            1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8)];
  }
  function xyz2rgb(c) {
    return [3.2406 * c[0] - 1.5372 * c[1] - 0.4986 * c[2], -0.9689 * c[0] + 1.8758 * c[1] + 0.0415 * c[2],
            0.0557 * c[0] - 0.2040 * c[1] + 1.0570 * c[2]];
  }
  function normalise(rgb) {        // out-of-gamut colours: add white, then scale to max 1
    var lo = Math.min(rgb[0], rgb[1], rgb[2]); if (lo < 0) rgb = rgb.map(function (v) { return v - lo; });
    var hi = Math.max(rgb[0], rgb[1], rgb[2]) || 1; return rgb.map(function (v) { return v / hi; });
  }
  var bbCache = {};
  function blackbody(T) {
    var k = Math.round(T / 100); if (bbCache[k]) return bbCache[k];
    var X = 0, Y = 0, Z = 0;
    for (var l = 380; l <= 780; l += 5) {
      var lm = l * 1e-9, B = 1 / (Math.pow(lm, 5) * (Math.exp(1.438777e-2 / (lm * T)) - 1)), c = cmf(l);
      X += B * c[0]; Y += B * c[1]; Z += B * c[2];
    }
    return (bbCache[k] = normalise(xyz2rgb([X, Y, Z])));
  }
  function line(l) { return normalise(xyz2rgb(cmf(l))); }
  function noise2(r) {
    var P = 64, v = new Float32Array(P * P); for (var i = 0; i < P * P; i++) v[i] = r();
    function at(x, y) { x = ((x % P) + P) % P; y = ((y % P) + P) % P; return v[(y | 0) * P + (x | 0)]; }
    function sm(t) { return t * t * (3 - 2 * t); }
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi);
      var a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
  }
  function fbm(n, x, y) { var s = 0, a = 0.5; for (var o = 0; o < 5; o++) { s += a * n(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; }

  // ── Building the point cloud ────────────────────────────────────
  // attributes per point: position (or R, φ₀, z for disc stars), kind (−1 static,
  // k ≥ 0 disc of galaxy k), flux, colour; each point is emitted three times,
  // once per possible lensed image (root index 0, 1, 2).
  var P = [], K = [], F = [], C = [], focal = 1;
  function push(x, y, z, kind, flux, col) { P.push(x, y, z); K.push(kind); F.push(flux); C.push(col[0], col[1], col[2]); }
  // world position whose projection is screen point (sx, sy) in CSS px at depth d
  function at(sx, sy, d) { return [(sx - W / 2) / focal * d, -(sy - H / 2) / focal * d, -d]; }
  function margins() {
    var col = Math.min(W, 760), side = (W - col) / 2;
    return side > 140 ? [[0, side], [W - side, W]] : [[0, W]];
  }
  var slot = 0;                    // spread objects round the margins
  function spot(r, pad) {
    var ms = margins(), m = ms[slot++ % ms.length];
    return { x: m[0] + pad + r() * Math.max(1, m[1] - m[0] - 2 * pad), y: pad + r() * Math.max(1, H - 2 * pad) };
  }

  function build() {
    P = []; K = []; F = []; C = []; galaxies = []; slot = 0;
    var r = rng(seed); focal = (H / 2) / Math.tan(FOV / 2);
    var area = W * H;

    // field stars, uniform in the viewing volume between 60 and 4000
    var dmin = 60, dmax = 4000, n = Math.round(area / 260);
    for (var i = 0; i < n; i++) {
      var d = Math.cbrt(dmin * dmin * dmin + r() * (dmax * dmax * dmax - dmin * dmin * dmin));
      var p = at((r() * 1.1 - 0.05) * W, (r() * 1.1 - 0.05) * H, d);
      var u = r(), T = u < 0.6 ? 3500 + 2500 * r() : u < 0.9 ? 6000 + 4000 * r() : 10000 + 15000 * r();
      var L = Math.pow(r() + 1e-4, -1.2);              // a broad luminosity function
      push(p[0], p[1], p[2], -1, 2.5e5 * L / (d * d), blackbody(T));
    }

    // spiral galaxies, far away
    var nsp = W > 900 ? 3 : 2;
    for (var k = 0; k < nsp; k++) spiral(r, k);
    elliptical(r);
    globular(r);
    for (k = 0; k < (W > 900 ? 2 : 1); k++) nebula(r);
    upload();
  }
  function frame3(r) {             // random orientation: unit vectors u, v in the disc plane, n normal
    var inc = Math.acos(0.35 + 0.65 * r()), pa = r() * Math.PI;
    var n = [Math.sin(inc) * Math.cos(pa), Math.sin(inc) * Math.sin(pa), Math.cos(inc)];
    var a = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    var u = norm(cross(a, n)), v = cross(n, u);
    return { u: u, v: v, n: n };
  }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; }

  function spiral(r, k) {
    var s = spot(r, 80), d = 1800 + 1600 * r(), c = at(s.x, s.y, d), f = frame3(r);
    var Rd = (14 + 10 * r()) / focal * d, z0 = 0.08 * Rd, pitch = (12 + 12 * r()) * Math.PI / 180;
    var arms = 2, old = blackbody(4300), young = blackbody(10000), N = 9000, flux = 0.42 * (2000 / d) * (2000 / d);   // a point stands for many unresolved stars
    galaxies.push({ c: c, u: f.u, v: f.v, n: f.n, v0: 0.28 * Rd, rc: 0.6 * Rd });   // v0 sets the display rotation rate
    var gi = galaxies.length - 1;
    for (var i = 0; i < N; i++) {
      var R = Rd * -Math.log((r() + 1e-9) * (r() + 1e-9)), phi = 6.2832 * r();
      if (R > 6 * Rd) continue;
      var arm = R < 0.35 * Rd ? 1 : 0.5 + 0.5 * Math.cos(arms * (phi - Math.log(R / (0.2 * Rd)) / Math.tan(pitch)));
      var wArm = Math.pow(arm, 3);
      if (r() > 0.06 + 0.94 * wArm * wArm) continue;   // rejection: stars concentrate on the arms
      var z = z0 * Math.atanh(Math.max(-0.999, Math.min(0.999, 2 * r() - 1)));
      push(R, phi, z, gi, flux * (0.7 + 0.6 * r()), wArm > 0.5 && r() < 0.6 ? young : old);
    }
    // Hernquist bulge, static in the galaxy frame (pressure-supported)
    var a = 0.25 * Rd;
    for (i = 0; i < 700; i++) {
      var q = Math.sqrt(r() * 0.98), rr = a * q / (1 - q), th = Math.acos(2 * r() - 1), ph = 6.2832 * r();
      var x = rr * Math.sin(th) * Math.cos(ph), y = rr * Math.sin(th) * Math.sin(ph), zz = rr * Math.cos(th) * 0.7;
      push(c[0] + f.u[0] * x + f.v[0] * y + f.n[0] * zz, c[1] + f.u[1] * x + f.v[1] * y + f.n[1] * zz,
           c[2] + f.u[2] * x + f.v[2] * y + f.n[2] * zz, -1, flux * 1.3, old);
    }
  }
  function elliptical(r) {
    var s = spot(r, 70), d = 2200 + 1200 * r(), c = at(s.x, s.y, d), f = frame3(r);
    var a = (7 + 5 * r()) / focal * d, col = blackbody(4200), flux = 0.38 * (2500 / d) * (2500 / d), eps = 0.55 + 0.35 * r();
    for (var i = 0; i < 3000; i++) {
      var q = Math.sqrt(r() * 0.985), rr = a * q / (1 - q), th = Math.acos(2 * r() - 1), ph = 6.2832 * r();
      var x = rr * Math.sin(th) * Math.cos(ph), y = rr * Math.sin(th) * Math.sin(ph) * eps, z = rr * Math.cos(th) * eps;
      push(c[0] + f.u[0] * x + f.v[0] * y + f.n[0] * z, c[1] + f.u[1] * x + f.v[1] * y + f.n[1] * z,
           c[2] + f.u[2] * x + f.v[2] * y + f.n[2] * z, -1, flux, col);
    }
  }
  function globular(r) {
    var s = spot(r, 70), d = 500 + 400 * r(), c = at(s.x, s.y, d), a = 7 / focal * d, flux = 0.3 * (700 / d) * (700 / d);
    for (var i = 0; i < 2600; i++) {
      var rr = a / Math.sqrt(Math.pow(r() * 0.999 + 1e-6, -2 / 3) - 1), th = Math.acos(2 * r() - 1), ph = 6.2832 * r();
      push(c[0] + rr * Math.sin(th) * Math.cos(ph), c[1] + rr * Math.sin(th) * Math.sin(ph), c[2] + rr * Math.cos(th),
           -1, flux * Math.pow(r(), 2) * 3, blackbody(4300 + 1800 * r()));
    }
  }
  function nebula(r) {
    var s = spot(r, 120), d = 350 + 400 * r(), nn = noise2(r), Ha = line(656.3), O3 = line(500.7);
    var Rx = (85 + 60 * r()), Ry = Rx * (0.6 + 0.35 * r()), off = r() * 40, got = 0, flux = 0.3 * (500 / d) * (500 / d);
    for (var tries = 0; tries < 160000 && got < 11000; tries++) {
      var gx = gauss(r) * Rx, gy = gauss(r) * Ry, u = (s.x + gx) / 55 + off, v = (s.y + gy) / 55;
      var wu = u + 1.6 * fbm(nn, u * 0.6 + 3, v * 0.6), wv = v + 1.6 * fbm(nn, u * 0.6, v * 0.6 + 7);
      var dens = Math.max(0, fbm(nn, wu, wv) - 0.32) * 2.2, core = Math.max(0, fbm(nn, wu * 1.6 + 9, wv * 1.6) - 0.45) * 3;
      if (r() > dens) continue;
      var depth = d + gauss(r) * 0.15 * d, p = at(s.x + gx, s.y + gy, depth);
      push(p[0], p[1], p[2], -1, flux, r() < Math.min(0.5, core * 0.6) ? O3 : Ha); got++;
    }
    for (var i = 0; i < 30; i++) {                    // young hot stars inside it
      var q = at(s.x + gauss(r) * Rx * 0.4, s.y + gauss(r) * Ry * 0.4, d);
      push(q[0], q[1], q[2], -1, 2.5e5 * (2 + 6 * r()) / (d * d), blackbody(15000 + 15000 * r()));
    }
  }

  // ── WebGL ───────────────────────────────────────────────────────
  var VS = [
    "precision highp float;",
    "attribute vec3 a_pos; attribute float a_kind; attribute float a_flux; attribute vec3 a_col; attribute float a_root;",
    "uniform mat4 u_view; uniform mat4 u_proj; uniform float u_t; uniform vec2 u_res; uniform float u_dpr;",
    "uniform vec3 u_gc[5]; uniform vec3 u_gu[5]; uniform vec3 u_gv[5]; uniform vec3 u_gn[5]; uniform vec2 u_gw[5];",
    "uniform vec2 u_lens; uniform float u_tE2; uniform float u_tc2; uniform float u_Dl; uniform float u_gain;",
    "varying vec3 v_col; varying float v_a;",
    "float cbrt(float x) { return sign(x) * pow(abs(x), 1.0 / 3.0); }",
    "void main() {",
    "  vec3 p = a_pos;",
    "  if (a_kind > -0.5) {                       // a disc star of galaxy k: flat rotation curve",
    "    int k = int(a_kind + 0.5);",
    "    vec3 c = u_gc[0], gu = u_gu[0], gv = u_gv[0], gn = u_gn[0]; vec2 w = u_gw[0];",
    "    for (int i = 1; i < 5; i++) if (i == k) { c = u_gc[i]; gu = u_gu[i]; gv = u_gv[i]; gn = u_gn[i]; w = u_gw[i]; }",
    "    float R = a_pos.x, phi = a_pos.y + w.x / sqrt(R * R + w.y * w.y) * u_t;",
    "    p = c + gu * (R * cos(phi)) + gv * (R * sin(phi)) + gn * a_pos.z;",
    "  }",
    "  vec4 cam = u_view * vec4(p, 1.0); float d = -cam.z;",
    "  vec4 clip = u_proj * cam;",
    "  if (d < 1.0) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); v_a = 0.0; return; }",
    "  vec2 s = (clip.xy / clip.w * 0.5 + 0.5) * u_res;      // device px, y up",
    "  vec2 img = s; float mu = 1.0; float ok = a_root < 0.5 ? 1.0 : 0.0;",
    "  float eff = d > u_Dl ? (d - u_Dl) / d : 0.0;            // D_ls / D_s",
    "  float tE2 = u_tE2 * eff;",
    "  if (tE2 > 1e-3) {",
    "    vec2 bv = s - u_lens; float b = length(bv); vec2 dir = b > 1e-4 ? bv / b : vec2(1.0, 0.0);",
    "    float A = -b, B = u_tc2 - tE2, Cc = -b * u_tc2;",
    "    float pp = B - A * A / 3.0, qq = 2.0 * A * A * A / 27.0 - A * B / 3.0 + Cc;",
    "    float disc = qq * qq / 4.0 + pp * pp * pp / 27.0, th;",
    "    if (disc > 0.0) {                              // one image",
    "      float sq = sqrt(disc); th = cbrt(-qq / 2.0 + sq) + cbrt(-qq / 2.0 - sq) - A / 3.0;",
    "      ok = a_root < 0.5 ? 1.0 : 0.0;",
    "    } else {                                       // three images",
    "      float rr = 2.0 * sqrt(-pp / 3.0);",
    "      float ph = acos(clamp(3.0 * qq / (2.0 * pp) * sqrt(-3.0 / pp), -1.0, 1.0)) / 3.0;",
    "      th = rr * cos(ph - 2.0943951 * a_root) - A / 3.0; ok = 1.0;",
    "    }",
    "    float t2 = th * th, den = t2 + u_tc2;",
    "    float inv = (1.0 - tE2 / den) * (1.0 - tE2 * (u_tc2 - t2) / (den * den));",
    "    mu = min(1.0 / max(abs(inv), 1e-4), 30.0);",
    "    img = u_lens + dir * th;",
    "  }",
    "  gl_Position = vec4(img / u_res * 2.0 - 1.0, 0.0, 1.0);",
    "  float f = a_flux * mu * u_gain;",
    "  v_a = ok * clamp(f, 0.0, 1.0); v_col = a_col;",
    "  gl_PointSize = (1.15 + 1.6 * sqrt(clamp(f - 1.0, 0.0, 3.0))) * u_dpr;",
    "}"].join("\n");
  var FS = [
    "precision mediump float; varying vec3 v_col; varying float v_a; uniform float u_neg; uniform vec3 u_ink;",
    "void main() {",
    "  float r = length(gl_PointCoord - 0.5); if (r > 0.5 || v_a < 0.004) discard;",
    "  float a = v_a * smoothstep(0.5, 0.28, r);",
    "  vec3 c = u_neg > 0.5 ? u_ink : v_col;",
    "  gl_FragColor = vec4(c * a, a);",
    "}"].join("\n");

  var prog, loc = {}, buf = {}, count = 0;
  function setup() {
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    ["a_pos", "a_kind", "a_flux", "a_col", "a_root"].forEach(function (n) { loc[n] = gl.getAttribLocation(prog, n); buf[n] = gl.createBuffer(); });
    ["u_view", "u_proj", "u_t", "u_res", "u_dpr", "u_gc", "u_gu", "u_gv", "u_gn", "u_gw", "u_lens", "u_tE2", "u_tc2", "u_Dl", "u_gain", "u_neg", "u_ink"]
      .forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
    gl.enable(gl.BLEND);
  }
  function attr(name, data, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf[name]); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc[name]); gl.vertexAttribPointer(loc[name], size, gl.FLOAT, false, 0, 0);
  }
  function upload() {
    var n = K.length; count = 3 * n;
    var pos = new Float32Array(count * 3), kind = new Float32Array(count), flux = new Float32Array(count),
        col = new Float32Array(count * 3), root = new Float32Array(count);
    for (var k = 0; k < 3; k++) {
      pos.set(P, k * n * 3); col.set(C, k * n * 3); kind.set(K, k * n); flux.set(F, k * n);
      root.fill(k, k * n, (k + 1) * n);
    }
    attr("a_pos", pos, 3); attr("a_kind", kind, 1); attr("a_flux", flux, 1); attr("a_col", col, 3); attr("a_root", root, 1);
    var gc = [], gu = [], gv = [], gn = [], gw = [];
    for (var i = 0; i < GAL; i++) {
      var gx = galaxies[i] || { c: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], v0: 0, rc: 1 };
      gc.push.apply(gc, gx.c); gu.push.apply(gu, gx.u); gv.push.apply(gv, gx.v); gn.push.apply(gn, gx.n); gw.push(gx.v0, gx.rc);
    }
    gl.uniform3fv(loc.u_gc, gc); gl.uniform3fv(loc.u_gu, gu); gl.uniform3fv(loc.u_gv, gv); gl.uniform3fv(loc.u_gn, gn); gl.uniform2fv(loc.u_gw, gw);
  }

  // ── Camera ──────────────────────────────────────────────────────
  function perspective() {
    var f = 1 / Math.tan(FOV / 2), a = W / H, nr = 1, fr = 10000;
    return [f / a, 0, 0, 0, 0, f, 0, 0, 0, 0, (fr + nr) / (nr - fr), -1, 0, 0, 2 * fr * nr / (nr - fr), 0];
  }
  function view(t) {                // the observer drifts slowly sideways and turns slightly
    var yaw = 0.035 * Math.sin(t * 0.021), pitch = 0.025 * Math.sin(t * 0.017 + 1);
    var ex = 26 * Math.sin(t * 0.013), ey = 14 * Math.sin(t * 0.011 + 2);
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    // R = Rx(pitch) · Ry(yaw); view = Rᵀ applied to (p − eye)
    var r00 = cy, r01 = 0, r02 = -sy, r10 = sy * sp, r11 = cp, r12 = cy * sp, r20 = sy * cp, r21 = -sp, r22 = cy * cp;
    var tx = -(r00 * ex + r01 * ey), ty = -(r10 * ex + r11 * ey), tz = -(r20 * ex + r21 * ey);
    return [r00, r10, r20, 0, r01, r11, r21, 0, r02, r12, r22, 0, tx, ty, tz, 1];
  }

  // ── Frame ───────────────────────────────────────────────────────
  function theme() {
    dark = getComputedStyle(document.documentElement).colorScheme === "dark";
    var f = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim().replace("#", "");
    if (f.length === 6) { var nb = parseInt(f, 16); ink = [(nb >> 16 & 255) / 255, (nb >> 8 & 255) / 255, (nb & 255) / 255]; }
    draw(performance.now());
  }
  // Display time: one unit of u_t is ~10¹⁵ s of real time for a Milky-Way-like
  // disc (v₀ ≈ 220 km/s at R ≈ 8 kpc gives a 230 Myr orbit; here an orbit at R_d
  // takes about three minutes). Scaling time is the only liberty taken.
  function draw(now) {
    if (!prog || !count) return;
    var t = reduce ? 0 : (now - t0) / 1000;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniformMatrix4fv(loc.u_view, false, view(t)); gl.uniformMatrix4fv(loc.u_proj, false, perspective());
    gl.uniform1f(loc.u_t, t * 0.12); gl.uniform2f(loc.u_res, canvas.width, canvas.height); gl.uniform1f(loc.u_dpr, dpr);
    var tE = 24 * dpr * lens.m;
    gl.uniform2f(loc.u_lens, lens.x * dpr, (H - lens.y) * dpr);
    gl.uniform1f(loc.u_tE2, tE * tE); gl.uniform1f(loc.u_tc2, 6 * dpr * 6 * dpr); gl.uniform1f(loc.u_Dl, DL);
    gl.uniform1f(loc.u_gain, dark ? 0.75 : 0.6);
    gl.uniform1f(loc.u_neg, dark ? 0 : 1); gl.uniform3f(loc.u_ink, ink[0], ink[1], ink[2]);
    gl.drawArrays(gl.POINTS, 0, count);
  }
  function idlePath(now) {
    var t = (now - t0) / 1000;
    return { x: W * (0.5 + 0.42 * Math.sin(t * 0.045 + 1.3)), y: H * (0.5 + 0.38 * Math.sin(t * 0.071)) };
  }
  var raf = 0, last = performance.now();
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var live = aim && now - lastMove < 3000, target = live ? aim : idlePath(now);
    var e = 1 - Math.exp(-dt * (live ? 4 : 0.6));
    lens.x += (target.x - lens.x) * e; lens.y += (target.y - lens.y) * e;
    lens.m += ((live ? 1 : 0.7) - lens.m) * (1 - Math.exp(-dt * 1.5));
    draw(now); wake();
  }
  function wake() { if (!raf && !reduce && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    var nw = innerWidth, nh = innerHeight;
    if (Math.abs(nw - W) < 2 && Math.abs(nh - H) < 120 && count) return;
    W = nw; H = nh; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (!lens.x) { var p = idlePath(performance.now()); lens.x = p.x; lens.y = p.y; }
    build(); draw(performance.now());
  }

  addEventListener("pointermove", function (ev) {
    aim = { x: ev.clientX, y: ev.clientY }; lastMove = performance.now();
    if (reduce) { lens.x = aim.x; lens.y = aim.y; lens.m = 1; draw(performance.now()); }
  }, { passive: true });
  var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
  document.addEventListener("visibilitychange", wake);
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);

  try { setup(); } catch (e) { canvas.hidden = true; if (window.console) console.warn("sky:", e.message); return; }
  if (reduce) lens.m = 0;
  resize(); theme(); wake();
})();
