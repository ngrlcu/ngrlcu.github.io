// Rydberg array for the Papers page. Plain canvas, no dependencies.
// A laser spot (your pointer, or a slow drifting spot when idle) drives atoms
// towards the Rydberg state. An excited atom blocks every neighbour within the
// blockade radius, and each excitation decays, so the array only remembers its
// recent input: the fading memory a quantum reservoir computes with.
(function () {
  var root = document.querySelector("[data-lattice]");
  if (!root) return;
  var canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var SP = 22, RB = 1.75, TAU = 1.7, RISE = 6, SPOT = 1.25;
  var atoms = [], cols = 0, rows = 0, W = 0, H = 0, dpr = 1, ox = 0, oy = 0;
  var colors = {};
  var ptr = null, lastMove = 0, raf = 0, visible = true, t0 = performance.now();

  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function theme() {
    colors = { dot: css("--faint") || "#a19e96", hot: css("--accent") || "#b5542d" };
    draw();
  }
  function layout() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    cols = Math.max(4, Math.floor((W - 8) / SP) + 1);
    rows = Math.max(3, Math.floor((H - 8) / SP) + 1);
    ox = (W - (cols - 1) * SP) / 2; oy = (H - (rows - 1) * SP) / 2;
    var old = atoms; atoms = [];
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++)
      atoms.push({ x: ox + i * SP, y: oy + j * SP, e: (old[j * cols + i] || {}).e || 0 });
    if (reduce) seed();
    draw();
  }
  // A frozen blockade pattern for people who prefer no motion.
  function seed() {
    var cx = W * 0.55, cy = H * 0.5;
    atoms.forEach(function (a) {
      var d = Math.hypot(a.x - cx, a.y - cy) / SP;
      if (d < 4.2 && !blocked(a, 0.02)) a.e = 1 - d / 5;
    });
  }
  // Blockaded if any neighbour inside the radius is at least as excited.
  function blocked(a, th) {
    for (var k = 0; k < atoms.length; k++) {
      var b = atoms[k];
      if (b === a || b.e < th || b.e < a.e) continue;
      var dx = b.x - a.x, dy = b.y - a.y;
      if (dx * dx + dy * dy < RB * RB * SP * SP) return true;
    }
    return false;
  }
  function spot(now) {
    if (ptr && now - lastMove < 2500) return ptr;
    var t = (now - t0) / 1000;
    return { x: W * (0.5 + 0.42 * Math.sin(t * 0.31)), y: H * (0.5 + 0.38 * Math.sin(t * 0.53 + 1.1)) };
  }
  function step(dt, now) {
    var s = spot(now), r2 = SPOT * SPOT * SP * SP;
    // decay first, then drive the atoms inside the spot that are not blockaded
    for (var k = 0; k < atoms.length; k++) atoms[k].e *= Math.exp(-dt / TAU);
    var order = atoms.filter(function (a) {
      var dx = a.x - s.x, dy = a.y - s.y; return dx * dx + dy * dy < r2;
    }).sort(function (a, b) { return b.e - a.e; });
    order.forEach(function (a) { if (!blocked(a, 0.02)) a.e += (1 - a.e) * (1 - Math.exp(-dt * RISE)); });
    return s;
  }
  function draw(s) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // blockade halos
    atoms.forEach(function (a) {
      if (a.e < 0.04) return;
      ctx.beginPath(); ctx.arc(a.x, a.y, RB * SP, 0, 6.2832);
      ctx.globalAlpha = 0.09 * a.e; ctx.fillStyle = colors.hot; ctx.fill();
      ctx.globalAlpha = 0.28 * a.e; ctx.lineWidth = 0.75; ctx.strokeStyle = colors.hot; ctx.stroke();
    });
    // atoms
    atoms.forEach(function (a) {
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(a.x, a.y, 1.6 + 1.9 * a.e, 0, 6.2832);
      ctx.fillStyle = a.e > 0.04 ? colors.hot : colors.dot;
      ctx.globalAlpha = a.e > 0.04 ? 0.35 + 0.65 * a.e : 0.9;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  var last = performance.now();
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt, now); draw();
    wake();
  }
  function wake() { if (!raf && visible && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  canvas.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; lastMove = performance.now();
  });
  canvas.addEventListener("pointerleave", function () { ptr = null; });

  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);
  new ResizeObserver(layout).observe(canvas);
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting && !document.hidden; wake(); }).observe(canvas);
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; wake(); });
  theme(); layout(); wake();
})();
