// About page background: a deep sky, seen through a soft gravitational lens.
//
// The sky is generated once per page load:
//   · stars: uniform in space, so counts follow N(>S) ∝ S^(−3/2) (Euclidean);
//     colours are blackbody colours (Planck × CIE 1931 → linear sRGB);
//   · a globular cluster: projected Plummer profile Σ(R) ∝ (1 + R²/a²)^(−2),
//     sampled exactly via M(<R)/M = R²/(R² + a²);
//   · galaxies: an elliptical with a de Vaucouleurs (Sérsic n = 4) profile and
//     inclined spirals (Sérsic bulge + exponential disc with logarithmic arms);
//   · emission nebulae: Hα 656.3 nm and [O III] 500.7 nm line colours on a
//     fractal-noise density, with dust absorption.
//
// The pointer (or, when idle, a slowly drifting clump) is a Plummer-sphere
// mass. Its lens equation is exact for that mass distribution:
//   β = θ − θ_E² θ / (|θ|² + θ_c²),
// and because lensing conserves surface brightness each screen pixel simply
// shows the sky at β. Stars behind the mass are stretched into arcs and, when
// aligned, into an Einstein ring. Light mode shows the sky as a photographic
// negative, as on survey plates. Plain WebGL, no dependencies.
(function () {
  var canvas = document.querySelector("canvas.sky");
  if (!canvas) return;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  var W = 0, H = 0, dpr = 1, dark = false, ink = [0.1, 0.1, 0.09];
  var lens = { x: 0, y: 0, m: 0 }, aim = null, lastMove = -1e9, t0 = performance.now();
  var seed = (Math.random() * 1e9) | 0;

  // ── Random numbers (seeded so a resize keeps the same sky) ───────
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
  function xyz2rgb(c) {           // XYZ → linear sRGB (D65)
    return [3.2406 * c[0] - 1.5372 * c[1] - 0.4986 * c[2],
            -0.9689 * c[0] + 1.8758 * c[1] + 0.0415 * c[2],
            0.0557 * c[0] - 0.2040 * c[1] + 1.0570 * c[2]];
  }
  // Out-of-gamut colours are brought in by adding white, then scaled to max 1.
  function normalise(rgb) {
    var lo = Math.min(rgb[0], rgb[1], rgb[2]); if (lo < 0) rgb = rgb.map(function (v) { return v - lo; });
    var hi = Math.max(rgb[0], rgb[1], rgb[2]) || 1; return rgb.map(function (v) { return v / hi; });
  }
  var bbCache = {};
  function blackbody(T) {          // chromaticity of a Planck spectrum at temperature T (K)
    var k = Math.round(T / 100); if (bbCache[k]) return bbCache[k];
    var X = 0, Y = 0, Z = 0;
    for (var l = 380; l <= 780; l += 5) {
      var lm = l * 1e-9, B = 1 / (Math.pow(lm, 5) * (Math.exp(1.438777e-2 / (lm * T)) - 1)), c = cmf(l);
      X += B * c[0]; Y += B * c[1]; Z += B * c[2];
    }
    return (bbCache[k] = normalise(xyz2rgb([X, Y, Z])));
  }
  function line(l) { return normalise(xyz2rgb(cmf(l))); }   // colour of a single emission line

  // ── Sky texture ─────────────────────────────────────────────────
  var buf, TW, TH;
  function add(x, y, c, v) {
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= TW || y >= TH) return;
    var i = (y * TW + x) * 3; buf[i] += c[0] * v; buf[i + 1] += c[1] * v; buf[i + 2] += c[2] * v;
  }
  function star(x, y, S, c) {      // Gaussian PSF, σ ≈ 0.55 device px scaled by dpr
    var s = 0.55 * dpr * (1 + 0.35 * Math.log(1 + S)), R = Math.ceil(3 * s);
    for (var j = -R; j <= R; j++) for (var i = -R; i <= R; i++) {
      var fx = (x | 0) + i + 0.5 - x, fy = (y | 0) + j + 0.5 - y;
      add(x + i, y + j, c, S * Math.exp(-(fx * fx + fy * fy) / (2 * s * s)));
    }
  }
  function starColour(r) {         // a magnitude-limited field: mostly G/K stars, some A/B
    var u = r();
    var T = u < 0.6 ? 3500 + 2500 * r() : u < 0.9 ? 6000 + 4000 * r() : 10000 + 15000 * r();
    return blackbody(T);
  }
  function noise2(r) {             // value noise with smooth interpolation, for nebulae
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

  function margins() {             // free space beside the 640 px text column, in device px
    var col = Math.min(W, 760) * dpr, side = (TW - col) / 2;
    return side > 140 * dpr ? [[0, side], [TW - side, TW]] : [[0, TW]];
  }
  function inMargin(r, pad) {
    var ms = margins(), m = ms[(r() * ms.length) | 0];
    return { x: m[0] + pad + r() * Math.max(1, m[1] - m[0] - 2 * pad), y: pad + r() * Math.max(1, TH - 2 * pad) };
  }

  function build() {
    TW = Math.max(1, Math.round(W * dpr)); TH = Math.max(1, Math.round(H * dpr));
    buf = new Float32Array(TW * TH * 3);
    var r = rng(seed), area = W * H;

    // field stars: N(>S) ∝ S^(−3/2)  ⇒  S = S_min u^(−2/3)
    var n = Math.round(area / 900);
    for (var i = 0; i < n; i++) star(r() * TW, r() * TH, Math.min(6, 0.05 * Math.pow(r() + 1e-6, -2 / 3)), starColour(r));

    // emission nebulae in the margins
    var nn = noise2(r), dust = noise2(r), Ha = line(656.3), O3 = line(500.7);
    for (var k = 0; k < 2; k++) {
      var c = inMargin(r, 110 * dpr), Rx = (90 + 70 * r()) * dpr, Ry = Rx * (0.55 + 0.4 * r()), off = r() * 50;
      for (var y = Math.max(0, c.y - Ry * 2.6 | 0); y < Math.min(TH, c.y + Ry * 2.6); y++)
        for (var x = Math.max(0, c.x - Rx * 2.6 | 0); x < Math.min(TW, c.x + Rx * 2.6); x++) {
          var dx = (x - c.x) / Rx, dy = (y - c.y) / Ry, e = Math.exp(-(dx * dx + dy * dy) * 1.4);
          if (e < 2e-4) continue;
          // domain-warped fractal noise gives filaments rather than blobs
          var u = x / (60 * dpr) + off, v = y / (60 * dpr);
          var wu = u + 1.6 * fbm(nn, u * 0.6 + 3, v * 0.6), wv = v + 1.6 * fbm(nn, u * 0.6, v * 0.6 + 7);
          var d = Math.pow(Math.max(0, fbm(nn, wu, wv) - 0.3), 1.6) * 3 * e;
          var oiii = Math.pow(Math.max(0, fbm(nn, wu * 1.6 + 9, wv * 1.6) - 0.42), 1.6) * 3.4 * e * e;   // ionised core
          var abs = Math.exp(-4 * Math.max(0, fbm(dust, wu * 1.2, wv * 1.2) - 0.52));                   // dust lanes
          add(x, y, Ha, 0.075 * d * abs); add(x, y, O3, 0.06 * oiii * abs);
        }
      for (var s = 0; s < 40; s++) star(c.x + gauss(r) * Rx * 0.5, c.y + gauss(r) * Ry * 0.5, 0.2 + r() * 1.5, blackbody(15000 + 15000 * r()));
    }

    // a globular cluster: projected Plummer profile, R = a √(u / (1 − u))
    var gc = inMargin(r, 90 * dpr), a = 9 * dpr;
    for (i = 0; i < 1400; i++) {
      var uu = r() * 0.995, R = a * Math.sqrt(uu / (1 - uu)), ph = 6.2832 * r();
      star(gc.x + R * Math.cos(ph), gc.y + R * Math.sin(ph), 0.04 + 0.35 * Math.pow(r(), 3), blackbody(4200 + 1500 * r()));
    }

    // galaxies
    var gals = 3 + (r() * 2 | 0);
    for (k = 0; k < gals; k++) galaxy(inMargin(r, 70 * dpr), r, k);

    upload();
  }
  // Sérsic profile I(R) = exp(−b_n [(R/R_e)^(1/n) − 1]),  b_n ≈ 2n − 1/3 + 4/(405 n)
  function sersic(R, Re, n) { var b = 2 * n - 1 / 3 + 4 / (405 * n); return Math.exp(-b * (Math.pow(R / Re, 1 / n) - 1)); }
  function galaxy(c, r, k) {
    var spiral = k % 3 !== 2, size = (spiral ? 26 + 30 * r() : 14 + 16 * r()) * dpr;
    var inc = Math.acos(0.25 + 0.75 * r()), pa = r() * Math.PI, ci = Math.cos(inc), cp = Math.cos(pa), sp = Math.sin(pa);
    var pitch = (12 + 14 * r()) * Math.PI / 180, arms = 2, old = blackbody(4300), young = blackbody(9000);
    var L = (0.35 + 0.4 * r()), R0 = size * 4;
    for (var y = Math.max(0, c.y - R0 | 0); y < Math.min(TH, c.y + R0); y++)
      for (var x = Math.max(0, c.x - R0 | 0); x < Math.min(TW, c.x + R0); x++) {
        var X = (x - c.x) * cp + (y - c.y) * sp, Y = (-(x - c.x) * sp + (y - c.y) * cp) / ci;   // deproject
        var Rr = Math.hypot(X, Y) + 0.01, I, sky = Math.hypot(x - c.x, y - c.y) / R0;
        var taper = sky > 1 ? 0 : 1 - Math.pow(sky, 6);        // fades the faint wings to zero inside the box
        if (!spiral) { I = sersic(Math.hypot(X, Y * ci / 0.7), size * 0.35, 4) * 0.35; add(x, y, old, I * L * taper); continue; }
        var bulge = sersic(Math.hypot(X, Y * ci), size * 0.12, 4) * 0.6;
        var phi = Math.atan2(Y, X), arm = 0.5 + 0.5 * Math.cos(arms * (phi - Math.log(Rr / (size * 0.1)) / Math.tan(pitch)));
        var disc = Math.exp(-Rr / (size * 0.32)) * (0.25 + 0.75 * Math.pow(arm, 3));
        add(x, y, old, (bulge + disc * 0.35) * L * 0.5 * taper); add(x, y, young, disc * Math.pow(arm, 3) * L * 0.35 * taper);
      }
  }

  // ── WebGL ───────────────────────────────────────────────────────
  var prog, tex, u = {};
  function setupGL() {
    if (!gl) return false;
    var vs = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
    var fs = [
      "precision highp float;",
      "uniform sampler2D sky; uniform vec2 res; uniform vec2 lens; uniform float tE2; uniform float tc2;",
      "uniform float dim; uniform float neg; uniform vec3 ink;",
      "void main(){",
      "  vec2 th = gl_FragCoord.xy - lens;",
      "  vec2 beta = gl_FragCoord.xy - tE2 * th / (dot(th, th) + tc2);   // Plummer lens equation",
      "  vec3 c = texture2D(sky, clamp(beta / res, 0.0, 1.0)).rgb;",
      "  float a = max(c.r, max(c.g, c.b)) * dim;",
      "  if (neg > 0.5) { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)) * 1.35 * dim; gl_FragColor = vec4(ink * l, l); }",
      "  else gl_FragColor = vec4(c * dim, a);",
      "}"].join("\n");
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ["sky", "res", "lens", "tE2", "tc2", "dim", "neg", "ink"].forEach(function (n) { u[n] = gl.getUniformLocation(prog, n); });
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (p) { gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE); });
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return true;
  }
  function upload() {
    // tone map (1 − e^(−x)) then sRGB encode; rows flipped so texture y matches gl_FragCoord
    var px = new Uint8Array(TW * TH * 4);
    for (var y = 0; y < TH; y++) for (var x = 0; x < TW; x++) {
      var i = (y * TW + x) * 3, o = ((TH - 1 - y) * TW + x) * 4;
      for (var k = 0; k < 3; k++) {
        var v = 1 - Math.exp(-buf[i + k]);
        v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        px[o + k] = Math.max(0, Math.min(255, v * 255 + 0.5));
      }
      px[o + 3] = 255;
    }
    buf = null;
    if (!gl) return fallback(px);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TW, TH, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  }
  function fallback(px) {          // no WebGL: show the unlensed sky with a 2D canvas
    var c2 = canvas.getContext("2d"), img = c2.createImageData(TW, TH);
    for (var y = 0; y < TH; y++) img.data.set(px.subarray((TH - 1 - y) * TW * 4, (TH - y) * TW * 4), y * TW * 4);
    for (var i = 3; i < img.data.length; i += 4) img.data[i] = Math.max(img.data[i - 3], img.data[i - 2], img.data[i - 1]) * 0.6;
    c2.putImageData(img, 0, 0);
  }

  // ── Frame ───────────────────────────────────────────────────────
  function theme() {
    dark = getComputedStyle(document.documentElement).colorScheme === "dark";
    var f = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim().replace("#", "");
    if (f.length === 6) { var nb = parseInt(f, 16); ink = [(nb >> 16 & 255) / 255, (nb >> 8 & 255) / 255, (nb & 255) / 255]; }
    draw();
  }
  function draw() {
    if (!gl || !prog || !TW) return;
    gl.viewport(0, 0, TW, TH);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    var tE = 28 * dpr * lens.m;                         // Einstein radius of the clump
    gl.uniform1i(u.sky, 0);
    gl.uniform2f(u.res, TW, TH);
    gl.uniform2f(u.lens, lens.x * dpr, (H - lens.y) * dpr);
    gl.uniform1f(u.tE2, tE * tE);
    gl.uniform1f(u.tc2, (7 * dpr) * (7 * dpr));          // Plummer core radius
    gl.uniform1f(u.dim, dark ? 0.85 : 0.55);
    gl.uniform1f(u.neg, dark ? 0 : 1);
    gl.uniform3f(u.ink, ink[0], ink[1], ink[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function idlePath(now) {         // the clump drifts slowly when nobody is pointing
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
    draw(); wake();
  }
  function wake() { if (!raf && !reduce && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    var nw = innerWidth, nh = innerHeight;
    if (Math.abs(nw - W) < 2 && Math.abs(nh - H) < 120 && TW) return;   // ignore mobile URL-bar jiggle
    W = nw; H = nh; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (!lens.x) { var p = idlePath(performance.now()); lens.x = p.x; lens.y = p.y; }
    build(); draw();
  }

  addEventListener("pointermove", function (ev) {
    aim = { x: ev.clientX, y: ev.clientY }; lastMove = performance.now();
    if (reduce) { lens.x = aim.x; lens.y = aim.y; lens.m = 1; draw(); }
  }, { passive: true });
  var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
  document.addEventListener("visibilitychange", wake);
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);

  if (gl && !setupGL()) gl = null;
  if (reduce) lens.m = 0;
  resize(); theme(); wake();
})();
