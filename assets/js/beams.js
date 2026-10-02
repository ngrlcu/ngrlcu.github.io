// About page background — a small optics table.
//
// Laser beams (one wavelength, the accent colour) enter from the window's
// edges and close on the pointer, like the beams of a magneto-optical trap.
// Each beam points a little off, so they meet in a small region rather than
// a mathematical point. Two white-light beams wander towards the glass
// spheres. Everything follows geometric optics:
//   · plates: beamsplitters (part transmitted, part reflected) and dichroic
//     long-pass mirrors (λ ≥ 560 nm reflected, shorter transmitted);
//   · a sphere of SF11 dense flint glass: Snell refraction with the Schott
//     Sellmeier index n(λ), exact Fresnel reflectance (unpolarised) at every
//     surface, so white light fans out into colours and a small fraction is
//     reflected inside and leaves after a bounce.
// Beam opacity is proportional to intensity; nothing is exaggerated, so
// faint reflections are faint. Click to lock the crossing point; click again
// or press Esc to release it. Plain canvas, no dependencies.
(function () {
  var canvas = document.querySelector("canvas.beams");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var LASERS = 4, WHITE = 1, PLATES = 2, SPHERES = 1, MAXDEPTH = 7;
  var LASER = 600;                                  // nm, drawn in --accent
  var BANDS = [650, 600, 550, 490, 430];            // white light, nm
  var W = 0, H = 0, dpr = 1, dark = false;
  var col = {};
  var focus = { x: 0, y: 0 }, aim = null, lock = null, lastMove = -1e9, t0 = performance.now();
  var lasers = [], whites = [], plates = [], spheres = [];

  // ── Colour ────────────────────────────────────────────────────────
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function hex(h, fb) {
    h = (h || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return fb;
    var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function theme() {
    dark = getComputedStyle(document.documentElement).colorScheme === "dark";
    col.laser = hex(css("--accent"), [181, 84, 45]);
    col.white = hex(css("--fg"), [26, 26, 24]);
    col.glass = hex(css("--muted"), [110, 108, 102]);
    col.dich = hex(css("--accent-2"), [58, 111, 140]);
    // spectral colours, muted to sit on the page in either theme
    col.band = dark
      ? { 650: [235, 110, 100], 600: [236, 160, 90], 550: [140, 205, 120], 490: [100, 180, 230], 430: [170, 140, 240] }
      : { 650: [190, 55, 50], 600: [200, 120, 40], 550: [60, 140, 70], 490: [40, 110, 170], 430: [110, 70, 170] };
    draw();
  }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")"; }
  function specColour(spec) {
    if (spec.length === 1) return spec[0] === LASER ? col.laser : col.band[spec[0]];
    if (spec.length === BANDS.length) return col.white;
    var c = [0, 0, 0];
    spec.forEach(function (l) { var b = col.band[l]; c[0] += b[0]; c[1] += b[1]; c[2] += b[2]; });
    return [c[0] / spec.length | 0, c[1] / spec.length | 0, c[2] / spec.length | 0];
  }
  // Schott SF11, Sellmeier: n(430) = 1.818, n(650) = 1.776
  function index(l) {
    var w = (l / 1000) * (l / 1000);
    return Math.sqrt(1 + 1.73759695 * w / (w - 0.013188707) + 0.313747346 * w / (w - 0.0623068142)
                       + 1.89878101 * w / (w - 155.23629));
  }

  // ── Layout ────────────────────────────────────────────────────────
  function edge(u) {
    u = ((u % 1) + 1) % 1;
    var p = 2 * (W + H), s = u * p;
    if (s < W) return { x: s, y: -2 };
    s -= W; if (s < H) return { x: W + 2, y: s };
    s -= H; if (s < W) return { x: W - s, y: H + 2 };
    s -= W; return { x: -2, y: H - s };
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function seed() {
    lasers = []; whites = [];
    for (var i = 0; i < LASERS; i++) lasers.push({
      u: (i + rnd(0, 0.6)) / LASERS, v: (Math.random() < 0.5 ? -1 : 1) * rnd(0.004, 0.01),
      w: rnd(0.75, 1.15), ph: rnd(0, 6.28), jr: rnd(5, 16)            // pointing error
    });
    for (var j = 0; j < WHITE; j++) whites.push({
      u: rnd(0, 1), v: (Math.random() < 0.5 ? -1 : 1) * rnd(0.003, 0.007), target: j, ph: rnd(0, 6.28)
    });
  }
  function place() {
    plates = []; spheres = [];
    var wideMargins = W > 900, all = [];
    function free(x, y, d) { return all.every(function (o) { return Math.hypot(o.x - x, o.y - y) > d; }); }
    var tries = 0;
    while (spheres.length < SPHERES && tries++ < 300) {
      // spheres prefer the margins beside the text column on wide screens
      var x = wideMargins ? (Math.random() < 0.5 ? rnd(0.05, 0.24) : rnd(0.76, 0.95)) * W : rnd(0.1, 0.9) * W;
      var s = { x: x, y: rnd(0.2, 0.8) * H, r: rnd(34, 46), id: "s" + spheres.length };
      if (free(s.x, s.y, Math.min(W, H) * 0.24)) { spheres.push(s); all.push(s); }
    }
    tries = 0;
    while (plates.length < PLATES && tries++ < 300) {
      var p = { x: (wideMargins ? (Math.random() < 0.5 ? rnd(0.05, 0.22) : rnd(0.78, 0.95)) : rnd(0.07, 0.93)) * W, y: rnd(0.1, 0.9) * H, a: rnd(0, Math.PI), len: rnd(40, 64),
                kind: plates.length % 2 ? "dichroic" : "split", spin: rnd(-0.03, 0.03), id: "p" + plates.length };
      if (free(p.x, p.y, Math.min(W, H) * 0.2)) { plates.push(p); all.push(p); }
    }
  }
  function resize() {
    var ow = W || innerWidth, oh = H || innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    if (!spheres.length) place();
    else plates.concat(spheres).forEach(function (o) { o.x *= W / ow; o.y *= H / oh; });
    if (!aim && !lock) { focus.x = W * 0.62; focus.y = H * 0.34; }
    draw();
  }

  // ── Geometry ──────────────────────────────────────────────────────
  // Nearest optic hit by p + t d for t in (eps, tmax), ignoring `skip`.
  function hit(px, py, dx, dy, tmax, skip) {
    var best = null, eps = 0.5;
    plates.forEach(function (o) {
      if (o.id === skip) return;
      var ux = Math.cos(o.a) * o.len / 2, uy = Math.sin(o.a) * o.len / 2;
      var ax = o.x - ux, ay = o.y - uy, ex = 2 * ux, ey = 2 * uy;
      var den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) return;
      var t = ((ax - px) * ey - (ay - py) * ex) / den, s = ((ax - px) * dy - (ay - py) * dx) / den;
      if (t > eps && t < tmax && s >= 0 && s <= 1 && (!best || t < best.t)) best = { t: t, o: o };
    });
    spheres.forEach(function (o) {
      if (o.id === skip) return;
      var fx = px - o.x, fy = py - o.y, b = fx * dx + fy * dy, c = fx * fx + fy * fy - o.r * o.r, D = b * b - c;
      if (D < 0) return;
      var t = -b - Math.sqrt(D);
      if (t > eps && t < tmax && (!best || t < best.t)) best = { t: t, o: o };
    });
    return best;
  }
  // Refract direction d at a surface with unit normal n facing the incoming ray;
  // eta = n1 / n2. Returns null on total internal reflection.
  function refract(dx, dy, nx, ny, eta) {
    var ci = -(dx * nx + dy * ny), k = 1 - eta * eta * (1 - ci * ci);
    if (k < 0) return null;
    var f = eta * ci - Math.sqrt(k);
    return { x: eta * dx + f * nx, y: eta * dy + f * ny };
  }
  function reflect(dx, dy, nx, ny) { var d = dx * nx + dy * ny; return { x: dx - 2 * d * nx, y: dy - 2 * d * ny }; }
  // Fresnel reflectance for unpolarised light, from n1 into n2, cos(incidence) = ci.
  function fresnel(ci, n1, n2) {
    ci = Math.min(1, Math.abs(ci));
    var st = n1 / n2 * Math.sqrt(1 - ci * ci);
    if (st >= 1) return 1;                                   // total internal reflection
    var ct = Math.sqrt(1 - st * st);
    var rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct), rp = (n2 * ci - n1 * ct) / (n2 * ci + n1 * ct);
    return 0.5 * (rs * rs + rp * rp);
  }

  // ── Tracing ───────────────────────────────────────────────────────
  // amp(s): beam strength at path length s along this ray.
  function trace(px, py, dx, dy, len, amp, spec, depth, skip) {
    if (amp(0) < 0.006 || len < 1) return;
    var h = depth < MAXDEPTH ? hit(px, py, dx, dy, len, skip) : null;
    var end = h ? h.t : len;
    stroke(px, py, dx, dy, end, amp, specColour(spec));
    if (!h) return;
    var hx = px + dx * h.t, hy = py + dy * h.t, o = h.o, a0 = amp(h.t), rest = len - h.t;
    var reach = Math.max(W, H) * 0.65;
    var fade = function (a) { return function (s) { return a * Math.max(0, 1 - s / reach); }; };
    var on = function (k) { return function (s) { return amp(h.t + s) * k; }; };
    o.glow = Math.min(1, (o.glow || 0) + a0 * 1.4);
    if (o.r === undefined) {                                  // a plate
      var nx = -Math.sin(o.a), ny = Math.cos(o.a);
      var r = reflect(dx, dy, nx, ny);
      if (o.kind === "split") {
        trace(hx, hy, dx, dy, rest, on(0.5), spec, depth + 1, o.id);            // 50:50
        trace(hx, hy, r.x, r.y, reach, fade(a0 * 0.5), spec, depth + 1, o.id);
      } else {                                                // dichroic long-pass mirror
        var lng = spec.filter(function (l) { return l >= 560; }), sht = spec.filter(function (l) { return l < 560; });
        if (sht.length) trace(hx, hy, dx, dy, rest, on(sht.length / spec.length), sht, depth + 1, o.id);
        if (lng.length) trace(hx, hy, r.x, r.y, reach, fade(a0 * lng.length / spec.length), lng, depth + 1, o.id);
      }
      return;
    }
    // a sphere: outward normal at the entry point
    var mx = (hx - o.x) / o.r, my = (hy - o.y) / o.r, ci = -(dx * mx + dy * my);
    var Rext = fresnel(ci, 1, index(spec[0]));
    var rr = reflect(dx, dy, mx, my);
    trace(hx, hy, rr.x, rr.y, reach * 0.5, fade(a0 * Rext), spec, depth + 1, o.id);
    spec.forEach(function (l) {                               // each colour bends by its own index
      var t = refract(dx, dy, mx, my, 1 / index(l)), R = fresnel(ci, 1, index(l));
      // each band carries its share of the intensity
      if (t) inside(hx, hy, t.x, t.y, o, l, a0 * (1 - R) / spec.length, depth + 1, 0);
    });
  }
  // A ray of wavelength l travelling inside sphere o from a point on its surface.
  function inside(px, py, dx, dy, o, l, a, depth, bounces) {
    if (a < 0.006) return;
    var s = -2 * ((px - o.x) * dx + (py - o.y) * dy);       // chord length to the far side
    if (s <= 0.01) return;
    stroke(px, py, dx, dy, s, function () { return a; }, specColour([l]));
    var qx = px + dx * s, qy = py + dy * s;
    var mx = (qx - o.x) / o.r, my = (qy - o.y) / o.r, n = index(l);
    var out = refract(dx, dy, -mx, -my, n);                  // normal facing the ray is −m
    var Rin = fresnel(dx * mx + dy * my, n, 1);              // exact; 1 if totally reflected
    if (out) trace(qx, qy, out.x, out.y, Math.max(W, H) * 0.6,
      function (t) { return a * (1 - Rin) * Math.max(0, 1 - t / (Math.max(W, H) * 0.6)); }, [l], depth + 1, o.id);
    if (bounces < 3 && depth < MAXDEPTH + 2) {
      var r = reflect(dx, dy, mx, my);
      inside(qx, qy, r.x, r.y, o, l, a * Rin, depth + 1, bounces + 1);
    }
  }
  function stroke(px, py, dx, dy, len, amp, c) {
    if (len < 0.5) return;
    var x1 = px + dx * len, y1 = py + dy * len;
    var g = ctx.createLinearGradient(px, py, x1, y1);
    for (var k = 0; k <= 5; k++) g.addColorStop(k / 5, rgba(c, amp(len * k / 5)));
    ctx.strokeStyle = g;
    ctx.lineWidth = 3; ctx.globalAlpha = dark ? 0.12 : 0.08; seg(px, py, x1, y1);   // halo
    ctx.lineWidth = 0.9; ctx.globalAlpha = 1; seg(px, py, x1, y1);                    // core
  }
  function seg(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

  // ── Drawing ───────────────────────────────────────────────────────
  function draw(now) {
    if (!col.laser) return;
    now = now || performance.now();
    var t = (now - t0) / 1000, k = dark ? 1.25 : 1, tail = Math.max(W, H) * 0.35;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
    plates.concat(spheres).forEach(function (o) { o.glow = (o.glow || 0) * 0.55; });

    lasers.forEach(function (b) {
      // aim at the focus with a small, slowly wandering pointing error
      var ex = Math.cos(t * 0.7 + b.ph) * b.jr, ey = Math.sin(t * 0.53 + b.ph * 1.7) * b.jr;
      var o = edge(b.u), tx = focus.x + ex, ty = focus.y + ey;
      var dx = tx - o.x, dy = ty - o.y, L = Math.hypot(dx, dy) || 1;
      var peak = 0.3 * b.w * k, base = 0.05 * b.w * k;
      trace(o.x, o.y, dx / L, dy / L, L + tail, function (s) {
        if (s <= L) { var f = s / L; return base + (peak - base) * f * f * f; }
        return peak * 0.6 * Math.max(0, 1 - (s - L) / tail);
      }, [LASER], 0, null);
    });
    whites.forEach(function (b) {
      var sp = spheres[b.target % spheres.length];
      if (!sp) return;
      var o = edge(b.u);
      // aim somewhere across the sphere, sweeping slowly, so the entry angle changes
      var off = Math.sin(t * 0.21 + b.ph) * sp.r * 0.85;
      var dx0 = sp.x - o.x, dy0 = sp.y - o.y, L0 = Math.hypot(dx0, dy0) || 1;
      var tx = sp.x - dy0 / L0 * off, ty = sp.y + dx0 / L0 * off;
      var dx = tx - o.x, dy = ty - o.y, L = Math.hypot(dx, dy) || 1, reach = L + Math.max(W, H) * 0.6;
      trace(o.x, o.y, dx / L, dy / L, reach, function (s) {
        return (0.12 + 0.38 * Math.min(1, s / L)) * k * Math.max(0, 1 - Math.max(0, s - L) / (reach - L));
      }, BANDS.slice(), 0, null);
    });

    ctx.globalCompositeOperation = "source-over";
    drawOptics();
    drawCloud(now, k);
  }
  function drawOptics() {
    plates.forEach(function (o) {
      var ux = Math.cos(o.a) * o.len / 2, uy = Math.sin(o.a) * o.len / 2;
      var nx = -Math.sin(o.a) * 2, ny = Math.cos(o.a) * 2, g = o.glow || 0;
      var tint = o.kind === "dichroic" ? col.dich : col.glass;
      ctx.beginPath();
      ctx.moveTo(o.x - ux - nx, o.y - uy - ny); ctx.lineTo(o.x + ux - nx, o.y + uy - ny);
      ctx.lineTo(o.x + ux + nx, o.y + uy + ny); ctx.lineTo(o.x - ux + nx, o.y - uy + ny); ctx.closePath();
      ctx.fillStyle = rgba(tint, (o.kind === "dichroic" ? 0.09 : 0.05) + 0.06 * g); ctx.fill();
      ctx.lineWidth = 0.8; ctx.strokeStyle = rgba(tint, 0.22 + 0.15 * g); ctx.stroke();
    });
    spheres.forEach(function (o) {
      var g = o.glow || 0;
      var grad = ctx.createRadialGradient(o.x - o.r * 0.35, o.y - o.r * 0.4, o.r * 0.1, o.x, o.y, o.r);
      grad.addColorStop(0, rgba(col.glass, 0.07 + 0.05 * g)); grad.addColorStop(1, rgba(col.glass, 0.025));
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.2832); ctx.fill();
      ctx.lineWidth = 0.8; ctx.strokeStyle = rgba(col.glass, 0.2 + 0.12 * g); ctx.stroke();
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.78, -2.5, -1.7);          // a small highlight
      ctx.strokeStyle = rgba(col.glass, 0.14); ctx.stroke();
    });
  }
  function drawCloud(now, k) {
    var pulse = reduce ? 1 : 1 + 0.1 * Math.sin(now / 520);
    var r = 34 * pulse, g = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, r);
    g.addColorStop(0, rgba(col.laser, 0.2 * k)); g.addColorStop(0.3, rgba(col.laser, 0.07 * k)); g.addColorStop(1, rgba(col.laser, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(focus.x, focus.y, r, 0, 6.2832); ctx.fill();
    if (lock) {
      ctx.lineWidth = 0.8; ctx.strokeStyle = rgba(col.laser, 0.5);
      ctx.beginPath(); ctx.arc(focus.x, focus.y, 14, 0, 6.2832); ctx.stroke();
    }
  }

  // ── Loop ──────────────────────────────────────────────────────────
  function idleFocus(now) {
    var t = (now - t0) / 1000;
    return { x: W * (0.6 + 0.16 * Math.sin(t * 0.17)), y: H * (0.36 + 0.12 * Math.sin(t * 0.23 + 0.8)) };
  }
  var raf = 0, last = performance.now();
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var live = aim && now - lastMove < 4000, target = lock || (live ? aim : idleFocus(now));
    var e = 1 - Math.exp(-dt * (lock ? 6 : live ? 3.5 : 1.2));      // a little lag feels like steering optics
    focus.x += (target.x - focus.x) * e; focus.y += (target.y - focus.y) * e;
    lasers.concat(whites).forEach(function (b) { b.u += b.v * dt; });
    plates.forEach(function (o) { o.a += o.spin * dt; });
    draw(now);
    wake();
  }
  function wake() { if (!raf && !reduce && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  // ── Input ─────────────────────────────────────────────────────────
  addEventListener("pointermove", function (ev) {
    aim = { x: ev.clientX, y: ev.clientY }; lastMove = performance.now();
    if (reduce && !lock) { focus.x = aim.x; focus.y = aim.y; draw(); }
  }, { passive: true });
  var down = null;
  addEventListener("pointerdown", function (ev) { down = { x: ev.clientX, y: ev.clientY }; }, { passive: true });
  addEventListener("click", function (ev) {
    if (ev.target.closest("a, button, input, textarea, select, label, summary")) return;
    if (down && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 6) return;
    if (String(getSelection && getSelection())) return;
    lock = lock ? null : { x: ev.clientX, y: ev.clientY };
    if (!lock) { aim = { x: ev.clientX, y: ev.clientY }; lastMove = performance.now(); }
    if (reduce && lock) { focus.x = lock.x; focus.y = lock.y; }
    draw(); wake();
  });
  addEventListener("keydown", function (ev) { if (ev.key === "Escape" && lock) { lock = null; draw(); wake(); } });
  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", wake);
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);

  seed(); resize(); theme(); wake();
})();
