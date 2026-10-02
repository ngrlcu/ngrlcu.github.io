// CV page: a Gaussian wave packet in a harmonic trap (ħ = m = ω = 1).
// The evolution is exact: a Gaussian stays Gaussian, its centre follows the
// classical orbit, and its complex width obeys
//   a(t) = ½ (α cos t + i sin t) / (cos t + i α sin t),   α = 2a(0),
// so a squeezed packet (α ≠ 1) breathes at twice the trap frequency.
// Clicking measures the position: x is drawn from |ψ|² (Born rule), the
// state collapses to a narrow packet there, and evolution starts again.
(function () {
  var root = document.querySelector("[data-wave]");
  if (!root) return;
  var canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var XMAX = 5.2, N = 300, SPEED = 1.05, COLLAPSE = 7, AUTO = 9000;
  var W = 0, H = 0, dpr = 1, colors = {};
  var st = { x0: -2.2, p0: 0, alpha: 3 }, t = 0.0, lastClick = performance.now(), mark = null;
  var re = new Float32Array(N), im = new Float32Array(N), pr = new Float32Array(N);

  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function theme() {
    colors = { prob: css("--accent") || "#b5542d", re: css("--accent-2") || "#3a6f8c",
               im: css("--faint") || "#a19e96", axis: css("--rule") || "#e6e3dc" };
    draw();
  }
  function layout() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    draw();
  }
  function xAt(i) { return -XMAX + 2 * XMAX * i / (N - 1); }

  // ψ(x, t) on the grid, normalised numerically.
  function evolve() {
    var c = Math.cos(t), s = Math.sin(t), A = st.alpha;
    var xc = st.x0 * c + st.p0 * s, pc = st.p0 * c - st.x0 * s;
    // D = c + iαs;  a = ½ (αc + is) / D
    var dr = c, di = A * s, dd = dr * dr + di * di;
    var nr = A * c, ni = s;
    var ar = 0.5 * (nr * dr + ni * di) / dd, ai = 0.5 * (ni * dr - nr * di) / dd;
    // prefactor D^(-1/2)
    var mod = Math.pow(dd, -0.25), arg = -0.5 * Math.atan2(di, dr);
    var S = 0.5 * (pc * xc - st.p0 * st.x0), sum = 0, dx = 2 * XMAX / (N - 1);
    for (var i = 0; i < N; i++) {
      var u = xAt(i) - xc;
      var mag = mod * Math.exp(-ar * u * u), ph = arg - ai * u * u + pc * u + S;
      re[i] = mag * Math.cos(ph); im[i] = mag * Math.sin(ph);
      pr[i] = re[i] * re[i] + im[i] * im[i]; sum += pr[i] * dx;
    }
    var k = 1 / Math.sqrt(sum || 1);
    for (i = 0; i < N; i++) { re[i] *= k; im[i] *= k; pr[i] *= k * k; }
  }
  function measure() {
    var dx = 2 * XMAX / (N - 1), r = Math.random(), acc = 0, i = 0;
    for (; i < N - 1; i++) { acc += pr[i] * dx; if (acc >= r) break; }
    var x = Math.max(-XMAX * 0.85, Math.min(XMAX * 0.85, xAt(i)));
    st = { x0: x, p0: 0, alpha: COLLAPSE }; t = 0;
    mark = { x: x, at: performance.now() };
    lastClick = performance.now();
    evolve(); draw(); wake();
  }

  function draw() {
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var base = H * 0.66, px = function (i) { return W * i / (N - 1); };
    var kp = H * 0.6 / 1.3, ka = H * 0.3 / 1.25;
    // trap potential and axis
    ctx.lineWidth = 1; ctx.strokeStyle = colors.axis;
    ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(W, base); ctx.stroke();
    ctx.setLineDash([2, 4]); ctx.beginPath();
    for (var i = 0; i < N; i += 3) { var x = xAt(i), y = base - (x * x) / (XMAX * XMAX) * base * 0.92; i ? ctx.lineTo(px(i), y) : ctx.moveTo(px(i), y); }
    ctx.stroke(); ctx.setLineDash([]);
    // Im ψ, Re ψ, then |ψ|²
    line(im, ka, colors.im, 0.9, base);
    line(re, ka, colors.re, 1.1, base);
    ctx.beginPath(); ctx.moveTo(0, base);
    for (i = 0; i < N; i++) ctx.lineTo(px(i), base - pr[i] * kp);
    ctx.lineTo(W, base); ctx.closePath();
    ctx.globalAlpha = 0.12; ctx.fillStyle = colors.prob; ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath();
    for (i = 0; i < N; i++) { var yy = base - pr[i] * kp; i ? ctx.lineTo(px(i), yy) : ctx.moveTo(px(i), yy); }
    ctx.lineWidth = 1.5; ctx.strokeStyle = colors.prob; ctx.stroke();
    // where the last measurement found the particle
    if (mark) {
      var age = (performance.now() - mark.at) / 1600;
      if (age < 1) {
        var mx = (mark.x + XMAX) / (2 * XMAX) * W;
        ctx.globalAlpha = 1 - age; ctx.fillStyle = colors.prob;
        ctx.beginPath(); ctx.arc(mx, base, 3.2, 0, 6.2832); ctx.fill();
        ctx.lineWidth = 0.8; ctx.strokeStyle = colors.prob;
        ctx.beginPath(); ctx.arc(mx, base, 3.2 + 14 * age, 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = 1;
      } else mark = null;
    }
  }
  function line(arr, k, c, w, base) {
    ctx.beginPath();
    for (var i = 0; i < N; i++) { var y = base - arr[i] * k, x = W * i / (N - 1); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.lineWidth = w; ctx.strokeStyle = c; ctx.stroke();
  }

  var raf = 0, visible = true, last = performance.now();
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += dt * SPEED;
    if (now - lastClick > AUTO) measure();
    evolve(); draw(); wake();
  }
  function wake() { if (!raf && visible && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  canvas.addEventListener("click", measure);
  canvas.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); measure(); } });
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);
  new ResizeObserver(layout).observe(canvas);
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting && !document.hidden; wake(); }).observe(canvas);
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; wake(); });
  if (reduce) t = 0.7;
  evolve(); theme(); layout(); wake();
})();
