/* ===========================================================================
   Star counts, fetched rather than typed.

   A number written into the markup is wrong the day after it ships, and the
   brand's own rule is evidence before adjective, so these are read from the
   GitHub API. Nothing is claimed when the fetch fails: the badges simply stay
   hidden and every card still reads exactly as it does now.

   One request covers the whole page, cached in localStorage for an hour.
   Unauthenticated api.github.com allows sixty requests an hour per IP, so the
   cache is what keeps a visitor who reloads from spending that budget.
   =========================================================================== */
(function () {
  "use strict";

  var badges = document.querySelectorAll(".stars[data-repo]");
  if (!badges.length) return;

  var KEY = "lavx:stars:1";
  var TTL = 60 * 60 * 1000;

  function read() {
    try {
      var c = JSON.parse(window.localStorage.getItem(KEY) || "null");
      return c && typeof c === "object" && c.d ? c : null;
    } catch (e) { return null; }
  }

  function write(d) {
    try { window.localStorage.setItem(KEY, JSON.stringify({ checked: Date.now(), d: d })); }
    catch (e) { /* private window, blocked storage: the page is unaffected */ }
  }

  function paint(d) {
    if (!d) return;
    var total = 0;
    badges.forEach(function (el) {
      var n = d[el.dataset.repo];
      if (typeof n !== "number") return;
      total += n;
      /* One star is not worth a badge, and zero certainly is not. */
      if (n < 2) return;
      el.textContent = n + "★";
      el.hidden = false;
    });
    var eyebrow = document.getElementById("repo-count");
    if (eyebrow && total > 0) {
      eyebrow.textContent = badges.length + " projects · " + total + " stars on GitHub";
    }
  }

  var cached = read();
  if (cached) paint(cached.d);
  if (cached && Date.now() - cached.checked < TTL && Date.now() >= cached.checked) return;

  /* One call for every repository the page lists, rather than one per card. */
  fetch("https://api.github.com/users/LavX/repos?per_page=100&type=owner", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (list) {
      if (!Array.isArray(list)) return;
      var d = {};
      list.forEach(function (r) { d[r.name] = r.stargazers_count; });
      paint(d);
      write(d);
    })
    .catch(function () {
      /* rate limited or offline: whatever the cache painted stays, and the
         badges that never resolved stay hidden */
    });
})();
