// Visitor counter (https://abacus.jasoncameron.dev, free, no account, CORS).
// Loaded on every page: each browser is counted once, the first time it
// opens any page of the site. On the About page the number is shown in
// #visits and refreshed every 30 s while the page is open.
(function () {
  var API = "https://abacus.jasoncameron.dev";
  var KEY = "ngrlcu.github.io/visitors";
  var FLAG = "visit-counted";

  var counted = false;
  try { counted = localStorage.getItem(FLAG) === "1"; } catch (e) {}

  function call(action) {
    return fetch(API + "/" + action + "/" + KEY, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw r.status; return r.json(); })
      .then(function (d) { return d.value; });
  }

  function show(n) {
    var el = document.getElementById("visits");
    if (!el || typeof n !== "number") return;
    el.querySelector("[data-n]").textContent = n.toLocaleString("en-GB");
    el.hidden = false;
  }

  var first = counted ? call("get") : call("hit").then(function (n) {
    try { localStorage.setItem(FLAG, "1"); } catch (e) {}
    return n;
  });

  function start() {
    if (!document.getElementById("visits")) return;
    first.then(show, function () {});
    setInterval(function () {
      if (!document.hidden) call("get").then(show, function () {});
    }, 30000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  first.catch(function () {});
})();
