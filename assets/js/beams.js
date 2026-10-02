// About page background: laser beams enter from random points on the window's
// edges and cross where the pointer is, like the beams of a magneto-optical
// trap closing on a cloud of atoms. A few optics sit at random places:
// beamsplitters send part of a beam off by reflection, and dichroic plates
// reflect it in a second colour. Click (or tap) to lock the crossing point;
// click again or press Esc to release it. Plain canvas, no dependencies.
(function () {
  var canvas = document.querySelector("canvas.beams");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var BEAMS = 5, OPTICS = 5, DEPTH = 3;
  var W = 0, H = 0, dpr = 1, dark = false;
  var col = { a: [181, 84, 45], b: [58, 111, 140], glass: [110, 108, 102] };
  var focus = { x: 0, y: 0 }, aim = null, lock = null, lastMove = -1e9, t0 = performance.now();
  var beams = [], optics = [];

  // ── Setup ─────────────────────────────────────────────────────────
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function hex(h, fallback) {
    h = (h || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return fallback;
    var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function theme() {
    col.a = hex(css("--accent"), col.a);
    col.b = hex(css("--accent-2"), col.b);
    col.glass = hex(css("--muted"), col.glass);
    dark = getComputedStyle(document.documentElement).colorScheme === "dark";
    draw();
  }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.max(0, a).toFixed(3) + ")"; }

  function edge(u) {                       // a point on the window's edge
    u = ((u % 1) + 1) % 1;
    var p = 2 * (W + H), s = u * p;
    if (s < W) return { x: s, y: -2 };
    s -= W; if (s < H) return { x: W + 2, y: s };
    s -= H; if (s < W) return { x: W - s, y: H + 2 };
    s -= W; return { x: -2, y: H - s };
  }
  function seedBeams() {
    beams = [];
    for (var i = 0; i < BEAMS; i++) beams.push({
      u: (i + Math.random() * 0.6) / BEAMS,
      v: (Math.random() < 0.5 ? -1 : 1) * (0.004 + Math.random() * 0.006),
      w: 0.7 + Math.random() * 0.5
    });
  }
  function seedOptics() {
    // Random plates, kept apart from each other; about half are dichroic.
    optics = [];
    var tries = 0;
    while (optics.length < OPTICS && tries++ < 200) {
      var o = {
        x: W * (0.08 + Math.random() * 0.84), y: H * (0.1 + Math.random() * 0.8),
        a: Math.random() * Math.PI, len: 46 + Math.random() * 32,
        kind: optics.length % 2 ? "dichroic" : "split", spin: (Math.random() - 0.5) * 0.05
      };
      if (optics.every(function (p) { return Math.hypot(p.x - o.x, p.y - o.y) > Math.min(W, H) * 0.22; })) optics.push(o);
    }
  }
  function resize() {
    var oldW = W || innerWidth, oldH = H || innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    if (!optics.length) seedOptics();
    else optics.forEach(function (o) { o.x *= W / oldW; o.y *= H / oldH; });
    if (!aim && !lock) { focus.x = W * 0.62; focus.y = H * 0.34; }
    draw();
  }

  // ── Ray tracing ───────────────────────────────────────────────────
  // Nearest crossing of the ray p + t d (t in (0, tmax)) with a plate.
  function hit(px, py, dx, dy, tmax, skip) {
    var best = null;
    optics.forEach(function (o, i) {
      if (i === skip) return;
      var ux = Math.cos(o.a) * o.len / 2, uy = Math.sin(o.a) * o.len / 2;
      var ax = o.x - ux, ay = o.y - uy, ex = 2 * ux, ey = 2 * uy;
      var den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) return;
      var t = ((ax - px) * ey - (ay - py) * ex) / den;
      var s = ((ax - px) * dy - (ay - py) * dx) / den;
      if (t > 0.5 && t < tmax && s >= 0 && s <= 1 && (!best || t < best.t)) best = { t: t, i: i, o: o };
    });
    return best;
  }
  // Draw one ray and whatever it splits into. `amp(s)` gives the beam's
  // strength at path length s along this ray.
  function trace(px, py, dx, dy, length, amp, c, depth, skip) {
    var h = depth < DEPTH ? hit(px, py, dx, dy, length, skip) : null;
    var end = h ? h.t : length;
    segment(px, py, px + dx * end, py + dy * end, 0, end, amp, c);
    if (!h) return;
    var hx = px + dx * h.t, hy = py + dy * h.t, o = h.o, a0 = amp(h.t);
    // surface normal of the plate, and the mirror direction
    var nx = -Math.sin(o.a), ny = Math.cos(o.a), dn = dx * nx + dy * ny;
    var rx = dx - 2 * dn * nx, ry = dy - 2 * dn * ny;
    var rest = length - h.t, reach = Math.max(W, H) * 0.7;
    var T = o.kind === "split" ? 0.6 : 0.8, R = o.kind === "split" ? 0.7 : 0.75;
    var rc = o.kind === "dichroic" ? (c === col.a ? col.b : col.a) : c;
    o.glow = Math.min(1, (o.glow || 0) + a0 * 1.5);
    trace(hx, hy, dx, dy, rest, function (s) { return amp(h.t + s) * T; }, c, depth + 1, h.i);
    trace(hx, hy, rx, ry, reach, function (s) { return a0 * R * Math.max(0, 1 - s / reach); }, rc, depth + 1, h.i);
  }
  function segment(x0, y0, x1, y1, s0, s1, amp, c) {
    if (s1 - s0 < 0.5) return;
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (var k = 0; k <= 6; k++) g.addColorStop(k / 6, rgba(c, amp(s0 + (s1 - s0) * k / 6)));
    ctx.strokeStyle = g;
    ctx.lineWidth = 11; ctx.globalAlpha = dark ? 0.2 : 0.14; line(x0, y0, x1, y1);   // glow
    ctx.lineWidth = 2.4; ctx.globalAlpha = 1; line(x0, y0, x1, y1);                  // core
  }
  function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

  // ── Drawing ───────────────────────────────────────────────────────
  function draw(now) {
    now = now || performance.now();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
    var k = dark ? 1.3 : 1, tail = Math.max(W, H) * 0.35;
    optics.forEach(function (o) { o.glow = (o.glow || 0) * 0.5; });
    beams.forEach(function (b) {
      var o = edge(b.u), dx = focus.x - o.x, dy = focus.y - o.y, L = Math.hypot(dx, dy) || 1;
      var peak = 0.42 * b.w * k, base = 0.06 * b.w * k;
      var amp = function (s) {
        if (s <= L) { var f = s / L; return base + (peak - base) * f * f; }
        return peak * Math.max(0, 1 - (s - L) / tail) * 0.55;
      };
      trace(o.x, o.y, dx / L, dy / L, L + tail, amp, col.a, 0, -1);
    });
    ctx.globalCompositeOperation = "source-over";
    drawOptics();
    drawCloud(now, k);
  }
  function drawOptics() {
    optics.forEach(function (o) {
      var ux = Math.cos(o.a) * o.len / 2, uy = Math.sin(o.a) * o.len / 2;
      var nx = -Math.sin(o.a) * 2.5, ny = Math.cos(o.a) * 2.5;
      var tint = o.kind === "dichroic" ? col.b : col.glass;
      ctx.beginPath();
      ctx.moveTo(o.x - ux - nx, o.y - uy - ny); ctx.lineTo(o.x + ux - nx, o.y + uy - ny);
      ctx.lineTo(o.x + ux + nx, o.y + uy + ny); ctx.lineTo(o.x - ux + nx, o.y - uy + ny); ctx.closePath();
      ctx.fillStyle = rgba(tint, (o.kind === "dichroic" ? 0.16 : 0.08) + 0.12 * (o.glow || 0));
      ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = rgba(tint, 0.38 + 0.3 * (o.glow || 0)); ctx.stroke();
    });
  }
  function drawCloud(now, k) {
    var pulse = reduce ? 1 : 1 + 0.12 * Math.sin(now / 420);
    var r = 30 * pulse, g = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, r);
    g.addColorStop(0, rgba(col.a, 0.6 * k)); g.addColorStop(0.2, rgba(col.a, 0.3 * k)); g.addColorStop(1, rgba(col.a, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(focus.x, focus.y, r, 0, 6.2832); ctx.fill();
    if (lock) {                            // a thin ring shows the point is locked
      ctx.lineWidth = 1; ctx.strokeStyle = rgba(col.a, 0.55);
      ctx.beginPath(); ctx.arc(focus.x, focus.y, 11, 0, 6.2832); ctx.stroke();
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
    var live = aim && now - lastMove < 4000;
    var target = lock || (live ? aim : idleFocus(now));
    var e = 1 - Math.exp(-dt * (lock ? 9 : live ? 7 : 1.5));
    focus.x += (target.x - focus.x) * e; focus.y += (target.y - focus.y) * e;
    beams.forEach(function (b) { b.u += b.v * dt; });
    optics.forEach(function (o) { o.a += o.spin * dt; });
    draw(now);
    wake();
  }
  function wake() { if (!raf && !reduce && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  // ── Input ─────────────────────────────────────────────────────────
  addEventListener("pointermove", function (ev) {
    aim = { x: ev.clientX, y: ev.clientY }; lastMove = performance.now();
    if (reduce && !lock) { focus.x = aim.x; focus.y = aim.y; draw(); }
  }, { passive: true });
  // Click or tap on empty page to lock; links, buttons and selected text are left alone.
  var down = null;
  addEventListener("pointerdown", function (ev) { down = { x: ev.clientX, y: ev.clientY }; }, { passive: true });
  addEventListener("click", function (ev) {
    if (ev.target.closest("a, button, input, textarea, select, label, summary")) return;
    if (down && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 6) return;   // a drag, not a click
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

  seedBeams(); resize(); theme(); wake();
})();
