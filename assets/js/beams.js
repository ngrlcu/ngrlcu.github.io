// About page background: a few laser beams enter from random points on the
// edges of the window and cross where the pointer is, like the beams of a
// magneto-optical trap closing on a cloud of atoms. Plain canvas, no
// dependencies; pauses when the tab is hidden and holds still for
// "reduce motion".
(function () {
  var canvas = document.querySelector("canvas.beams");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var BEAMS = 5;
  var W = 0, H = 0, dpr = 1, color = "#b5542d", dark = false;
  var focus = { x: 0, y: 0 }, aim = null, lastMove = -1e9, t0 = performance.now();
  var beams = [];

  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function theme() {
    color = css("--accent") || color;
    dark = getComputedStyle(document.documentElement).colorScheme === "dark";
    draw();
  }
  // A point on the window's edge, from a parameter running once round it.
  function edge(u) {
    u = ((u % 1) + 1) % 1;
    var p = 2 * (W + H), s = u * p;
    if (s < W) return { x: s, y: -2 };
    s -= W; if (s < H) return { x: W + 2, y: s };
    s -= H; if (s < W) return { x: W - s, y: H + 2 };
    s -= W; return { x: -2, y: H - s };
  }
  function seed() {
    beams = [];
    for (var i = 0; i < BEAMS; i++) {
      beams.push({
        u: (i + Math.random() * 0.6) / BEAMS,          // spread round the edge
        v: (Math.random() < 0.5 ? -1 : 1) * (0.004 + Math.random() * 0.006), // slow drift
        w: 0.6 + Math.random() * 0.7                   // relative strength
      });
    }
  }
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    if (!aim) { focus.x = W * 0.62; focus.y = H * 0.34; }
    draw();
  }
  function idleFocus(now) {
    var t = (now - t0) / 1000;
    return { x: W * (0.6 + 0.16 * Math.sin(t * 0.17)), y: H * (0.36 + 0.12 * Math.sin(t * 0.23 + 0.8)) };
  }
  function rgba(a) {
    // colour with alpha, from the #rrggbb accent token
    var c = color.replace("#", "");
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var n = parseInt(c, 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }
  function draw(now) {
    now = now || performance.now();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var k = dark ? 1.35 : 1;
    ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
    beams.forEach(function (b) {
      var o = edge(b.u), dx = focus.x - o.x, dy = focus.y - o.y, L = Math.hypot(dx, dy) || 1;
      // the beam carries on past the focus and fades out
      var ex = focus.x + dx / L * Math.max(W, H) * 0.35, ey = focus.y + dy / L * Math.max(W, H) * 0.35;
      var g = ctx.createLinearGradient(o.x, o.y, ex, ey), f = L / (L + Math.max(W, H) * 0.35);
      g.addColorStop(0, rgba(0.05 * b.w * k));
      g.addColorStop(f * 0.85, rgba(0.22 * b.w * k));
      g.addColorStop(f, rgba(0.4 * b.w * k));
      g.addColorStop(Math.min(1, f + 0.08), rgba(0.08 * b.w * k));
      g.addColorStop(1, rgba(0));
      ctx.strokeStyle = g;
      ctx.lineCap = "round";
      ctx.lineWidth = 7; ctx.globalAlpha = 0.18; line(o.x, o.y, ex, ey);   // soft glow
      ctx.lineWidth = 1.1; ctx.globalAlpha = 1; line(o.x, o.y, ex, ey);    // core
    });
    // the trapped cloud where the beams cross
    var pulse = reduce ? 1 : 1 + 0.12 * Math.sin(now / 420);
    var r = 26 * pulse, cg = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, r);
    cg.addColorStop(0, rgba(0.55 * k)); cg.addColorStop(0.18, rgba(0.28 * k)); cg.addColorStop(1, rgba(0));
    ctx.globalAlpha = 1; ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(focus.x, focus.y, r, 0, 6.2832); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

  var raf = 0, last = performance.now();
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var target = aim && now - lastMove < 4000 ? aim : idleFocus(now);
    var e = 1 - Math.exp(-dt * (aim && now - lastMove < 4000 ? 7 : 1.5));
    focus.x += (target.x - focus.x) * e; focus.y += (target.y - focus.y) * e;
    beams.forEach(function (b) { b.u += b.v * dt; });
    draw(now);
    wake();
  }
  function wake() { if (!raf && !reduce && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  addEventListener("pointermove", function (ev) {
    aim = { x: ev.clientX, y: ev.clientY }; lastMove = performance.now();
    if (reduce) { focus.x = aim.x; focus.y = aim.y; draw(); }
  }, { passive: true });
  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", wake);
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);

  seed(); resize(); theme(); wake();
})();
