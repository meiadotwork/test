/* Artisearch — vanilla artist discovery engine */
(function () {
  "use strict";

  var ARTISTS = [];
  var state = { query: "", filter: null }; // filter = {type, value} or null

  var view = document.getElementById("view");
  var searchInput = document.getElementById("searchInput");
  var chipsEl = document.getElementById("filterChips");
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxCaption = document.getElementById("lightboxCaption");

  /* ---------- utilities ---------- */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Deterministic placeholder image as an SVG data URI (works fully offline).
  function placeholder(seed, label, ratioTall) {
    var palettes = [
      ["#f4d35e", "#ee964b"], ["#cbd5e1", "#94a3b8"], ["#d8e2dc", "#83c5be"],
      ["#e0c3fc", "#8ec5fc"], ["#ffd6a5", "#fdffb6"], ["#bde0fe", "#a2d2ff"],
      ["#caffbf", "#9bf6ff"], ["#ffc6ff", "#ffadad"]
    ];
    var h = 0, str = String(seed || label || "x");
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    var p = palettes[h % palettes.length];
    var w = 800, ht = ratioTall ? 1000 : 600;
    var initials = (label || "").split(/\s+/).map(function (x) { return x[0]; })
      .filter(Boolean).slice(0, 2).join("").toUpperCase();
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + ht + '" viewBox="0 0 ' + w + ' ' + ht + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + p[0] + '"/><stop offset="1" stop-color="' + p[1] + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="100%" height="100%" fill="url(#g)"/>' +
      '<text x="50%" y="50%" font-family="Inter,sans-serif" font-size="' + (ratioTall ? 150 : 130) +
      '" font-weight="700" fill="rgba(0,0,0,.28)" text-anchor="middle" dominant-baseline="central">' +
      esc(initials) + "</text></svg>";
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function img(src, seed, label, tall) {
    return src && src.trim() ? src : placeholder(seed, label, tall);
  }

  function fmtDate(d) {
    if (!d) return "";
    var dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function uniq(arr) {
    var seen = {}, out = [];
    arr.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }

  /* ---------- search / filter ---------- */

  function matchesSearch(a, q) {
    if (!q) return true;
    var hay = [a.name, a.nationality, a.bornPlace, a.livesIn]
      .concat(a.movements || [], a.mediums || []).join(" ").toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (t) { return hay.indexOf(t) !== -1; });
  }

  function matchesFilter(a) {
    if (!state.filter) return true;
    var list = a[state.filter.type] || [];
    return list.indexOf(state.filter.value) !== -1;
  }

  function filtered() {
    return ARTISTS.filter(function (a) {
      return matchesSearch(a, state.query) && matchesFilter(a);
    });
  }

  /* ---------- related artists ---------- */

  function relatedTo(artist) {
    if (artist.relatedArtists && artist.relatedArtists.length) {
      return artist.relatedArtists
        .map(function (id) { return ARTISTS.find(function (a) { return a.id === id; }); })
        .filter(Boolean);
    }
    var scored = ARTISTS.filter(function (a) { return a.id !== artist.id; }).map(function (a) {
      var score = 0;
      (artist.movements || []).forEach(function (m) { if ((a.movements || []).indexOf(m) !== -1) score += 2; });
      (artist.mediums || []).forEach(function (m) { if ((a.mediums || []).indexOf(m) !== -1) score += 1; });
      return { a: a, score: score };
    });
    scored.sort(function (x, y) { return y.score - x.score; });
    return scored.filter(function (s) { return s.score > 0; }).slice(0, 4).map(function (s) { return s.a; });
  }

  /* ---------- rendering: list ---------- */

  function cardHTML(a) {
    var head = a.headshots && a.headshots[0] ? a.headshots[0].src : "";
    var tags = (a.movements || []).slice(0, 3).map(function (m) {
      return '<span class="tag">' + esc(m) + "</span>";
    }).join("");
    return '<button class="card" data-id="' + esc(a.id) + '">' +
      '<div class="card-thumb" style="background-image:url(\'' + img(head, a.id, a.name) + '\')"></div>' +
      '<div class="card-body">' +
        '<h3 class="card-name">' + esc(a.name) + "</h3>" +
        '<p class="card-sub">' + esc(a.nationality || "") + (a.livesIn ? " · lives in " + esc(a.livesIn) : "") + "</p>" +
        '<div class="tag-row">' + tags + "</div>" +
      "</div></button>";
  }

  function renderList() {
    var results = filtered();
    var html = "";

    var label = "";
    if (state.filter) label = " in " + esc(state.filter.value);
    html += '<p class="results-meta">' + results.length + " artist" +
      (results.length === 1 ? "" : "s") +
      (state.query ? " matching “" + esc(state.query) + "”" : "") + label + "</p>";

    if (!results.length) {
      html += '<div class="empty"><h2>No artists found</h2><p>Try a different name, movement, medium, or place.</p></div>';
    } else {
      html += '<div class="grid">' + results.map(cardHTML).join("") + "</div>";
    }
    view.innerHTML = html;
  }

  /* ---------- rendering: profile ---------- */

  function fact(label, value) {
    if (!value) return "";
    return '<div><p class="fact-label">' + esc(label) + '</p><p class="fact-value">' + value + "</p></div>";
  }

  function section(title, inner) {
    if (!inner) return "";
    return '<section class="section"><h2 class="section-title">' + esc(title) + "</h2>" + inner + "</section>";
  }

  function listItems(items) {
    if (!items || !items.length) return "";
    return '<ul class="def-list">' + items.map(function (x) {
      return "<li>" + esc(x) + "</li>";
    }).join("") + "</ul>";
  }

  function renderProfile(a) {
    var head = a.headshots && a.headshots[0] ? a.headshots[0] : { src: "", credit: "" };

    /* hero links */
    var links = "";
    if (a.website) links += '<a class="link-btn primary" target="_blank" rel="noopener" href="' + esc(a.website) + '">Website ↗</a>';
    if (a.instagram) links += '<a class="link-btn" target="_blank" rel="noopener" href="' + esc(a.instagram) + '">Instagram</a>';
    if (a.email) links += '<a class="link-btn" href="mailto:' + esc(a.email) + '">Email</a>';
    if (a.cv && a.cv.url) links += '<a class="link-btn" target="_blank" rel="noopener" href="' + esc(a.cv.url) + '">Download C.V.</a>';

    var hero =
      '<div class="hero">' +
        '<div><div class="hero-portrait" style="background-image:url(\'' + img(head.src, a.id, a.name, true) + '\')"></div>' +
          (head.credit ? '<p class="portrait-credit">' + esc(head.credit) + "</p>" : "") +
        "</div>" +
        "<div>" +
          '<h1 class="hero-name">' + esc(a.name) + "</h1>" +
          '<p class="hero-nat">' + esc(a.nationality || "") + "</p>" +
          '<div class="facts">' +
            fact("Born", esc(a.bornDate)) +
            fact("Birthplace", esc(a.bornPlace)) +
            fact("Lives & works", esc(a.livesIn)) +
            fact("Movement", (a.movements || []).map(esc).join(", ")) +
            fact("Mediums", (a.mediums || []).map(esc).join(", ")) +
          "</div>" +
          '<div class="hero-links">' + links + "</div>" +
        "</div>" +
      "</div>";

    /* statement */
    var statement = a.artStatement
      ? section("Artist Statement", '<p class="statement">' + esc(a.artStatement) + "</p>") : "";

    /* galleries */
    var galleries = (a.galleries && a.galleries.length) ? section("Represented By",
      '<ul class="link-list">' + a.galleries.map(function (g) {
        var name = g.url && g.url !== "#"
          ? '<a target="_blank" rel="noopener" href="' + esc(g.url) + '">' + esc(g.name) + " ↗</a>"
          : esc(g.name);
        return "<li><span>" + name + '</span><span class="li-source">' + esc(g.location || "") + "</span></li>";
      }).join("") + "</ul>") : "";

    /* CV: education + awards */
    var cvInner = "";
    if (a.education && a.education.length) cvInner += "<div><p class=\"fact-label\">Education</p>" + listItems(a.education) + "</div>";
    if (a.awards && a.awards.length) cvInner += "<div><p class=\"fact-label\">Awards & Honors</p>" + listItems(a.awards) + "</div>";
    var cv = cvInner ? section("Curriculum Vitae", '<div class="cols-2">' + cvInner + "</div>") : "";

    /* press */
    var press = (a.press && a.press.length) ? section("Press & Reviews",
      '<ul class="link-list">' + a.press.map(function (p) {
        return "<li><a target=\"_blank\" rel=\"noopener\" href=\"" + esc(p.url) + "\">" + esc(p.title) +
          "</a><span class=\"li-source\">" + esc(p.source || "") + "</span></li>";
      }).join("") + "</ul>") : "";

    /* interviews */
    var interviews = (a.interviews && a.interviews.length) ? section("Interviews & Talks",
      '<ul class="link-list">' + a.interviews.map(function (it) {
        return "<li><span><span class=\"badge " + (it.type === "video" ? "video" : "written") + "\">" +
          esc(it.type === "video" ? "Video" : "Written") + "</span>" +
          "<a target=\"_blank\" rel=\"noopener\" href=\"" + esc(it.url) + "\">" + esc(it.title) + "</a></span>" +
          "<span class=\"li-source\">" + esc(it.source || "") + "</span></li>";
      }).join("") + "</ul>") : "";

    /* books */
    var books = (a.books && a.books.length) ? section("Books & Publications",
      '<ul class="link-list">' + a.books.map(function (b) {
        var title = b.url && b.url !== "#"
          ? "<a target=\"_blank\" rel=\"noopener\" href=\"" + esc(b.url) + "\">" + esc(b.title) + "</a>"
          : esc(b.title);
        return "<li><span>" + title + "</span><span class=\"li-source\">" +
          esc([b.publisher, b.year].filter(Boolean).join(", ")) + "</span></li>";
      }).join("") + "</ul>") : "";

    /* public collections */
    var collections = (a.publicCollections && a.publicCollections.length) ? section("Public Collections",
      '<ul class="collections">' + a.publicCollections.map(function (c) {
        return "<li>" + esc(c) + "</li>";
      }).join("") + "</ul>") : "";

    /* upcoming shows */
    var shows = (a.upcomingShows && a.upcomingShows.length) ? section("Upcoming Shows",
      a.upcomingShows.map(function (s) {
        var when = [fmtDate(s.startDate), fmtDate(s.endDate)].filter(Boolean).join(" – ");
        var title = s.url && s.url !== "#"
          ? "<a target=\"_blank\" rel=\"noopener\" href=\"" + esc(s.url) + "\" style=\"text-decoration:none\">" + esc(s.title) + " ↗</a>"
          : esc(s.title);
        return '<div class="show-card"><div><div class="def-title">' + title + "</div>" +
          '<div class="def-meta">' + esc([s.venue, s.location].filter(Boolean).join(" · ")) + "</div></div>" +
          '<div class="show-when">' + esc(when) + "</div></div>";
      }).join("")) : "";

    /* work by series */
    var workInner = "";
    (a.series || []).forEach(function (s) {
      var works = (s.works || []).map(function (w, i) {
        var src = img(w.image, a.id + "-" + s.name + "-" + i, w.title);
        var caption = esc([w.title, w.year].filter(Boolean).join(", "));
        var meta = esc([w.medium, w.dimensions].filter(Boolean).join(", "));
        return '<button class="work" data-img="' + esc(src) + '" data-caption="' +
          esc(s.name + " — " + (w.title || "") + (w.year ? " (" + w.year + ")" : "") + (meta ? " · " + (w.medium || "") + " " + (w.dimensions || "") : "")) + '">' +
          '<div class="work-img" style="background-image:url(\'' + src + '\')"></div>' +
          '<div class="work-cap"><div class="work-title">' + caption + '</div>' +
          (meta ? '<div class="work-meta">' + meta + "</div>" : "") + "</div></button>";
      }).join("");
      workInner += '<div class="series-block"><div class="series-head">' +
        '<p class="series-name">' + esc(s.name) +
        (s.year ? '<span class="series-year">' + esc(s.year) + "</span>" : "") + "</p>" +
        (s.description ? '<p class="series-desc">' + esc(s.description) + "</p>" : "") + "</div>" +
        '<div class="work-grid">' + works + "</div></div>";
    });
    var work = workInner ? section("Work — by Body of Work & Series", workInner) : "";

    /* related */
    var rel = relatedTo(a);
    var related = rel.length ? section("Related Artists",
      '<div class="related-grid">' + rel.map(cardHTML).join("") + "</div>") : "";

    view.innerHTML =
      '<button class="back-btn" id="backBtn">← Back to results</button>' +
      hero + statement + section("Movement", (a.movements || []).length
        ? '<div class="tag-row">' + a.movements.map(function (m) { return '<span class="tag">' + esc(m) + "</span>"; }).join("") + "</div>"
        : "") +
      galleries + cv + press + interviews + books + collections + shows + work + related;

    window.scrollTo(0, 0);
  }

  /* ---------- chips ---------- */

  function buildChips() {
    var movements = uniq([].concat.apply([], ARTISTS.map(function (a) { return a.movements || []; }))).sort();
    var html = '<button class="chip" data-clear>All</button>';
    movements.forEach(function (m) {
      html += '<button class="chip" data-type="movements" data-value="' + esc(m) + '">' + esc(m) + "</button>";
    });
    chipsEl.innerHTML = html;
    syncChips();
  }

  function syncChips() {
    Array.prototype.forEach.call(chipsEl.querySelectorAll(".chip"), function (c) {
      var active = (c.hasAttribute("data-clear") && !state.filter) ||
        (state.filter && c.getAttribute("data-value") === state.filter.value);
      c.classList.toggle("active", !!active);
    });
  }

  /* ---------- routing ---------- */

  function route() {
    var hash = location.hash.replace(/^#/, "");
    if (hash.indexOf("artist/") === 0) {
      var id = hash.slice("artist/".length);
      var a = ARTISTS.find(function (x) { return x.id === id; });
      if (a) { renderProfile(a); return; }
    }
    renderList();
    syncChips();
  }

  /* ---------- events ---------- */

  function bindEvents() {
    searchInput.addEventListener("input", function () {
      state.query = searchInput.value.trim();
      if (location.hash) { location.hash = ""; } else { renderList(); }
    });

    chipsEl.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      if (chip.hasAttribute("data-clear")) state.filter = null;
      else state.filter = { type: chip.getAttribute("data-type"), value: chip.getAttribute("data-value") };
      syncChips();
      if (location.hash) location.hash = ""; else renderList();
    });

    view.addEventListener("click", function (e) {
      var card = e.target.closest(".card");
      if (card) { location.hash = "artist/" + card.getAttribute("data-id"); return; }
      if (e.target.closest("#backBtn")) { location.hash = ""; return; }
      var work = e.target.closest(".work");
      if (work) openLightbox(work.getAttribute("data-img"), work.getAttribute("data-caption"));
    });

    document.getElementById("brandLink").addEventListener("click", function (e) {
      e.preventDefault();
      state.query = ""; state.filter = null; searchInput.value = "";
      syncChips();
      if (location.hash) location.hash = ""; else renderList();
    });

    document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });

    window.addEventListener("hashchange", route);
  }

  function openLightbox(src, caption) {
    lightboxImg.style.backgroundImage = "url('" + src + "')";
    lightboxCaption.textContent = caption || "";
    lightbox.hidden = false;
  }
  function closeLightbox() { lightbox.hidden = true; }

  /* ---------- init ---------- */

  function start(data) {
    ARTISTS = data;
    buildChips();
    bindEvents();
    route();
  }

  function fail(msg) {
    view.innerHTML = '<div class="empty"><h2>Could not load artist data</h2><p>' + esc(msg) +
      '</p><p>Run a local server in the project folder, e.g. <code>python3 -m http.server</code>, ' +
      'then open <code>http://localhost:8000</code>.</p></div>';
  }

  fetch("data/artists.json")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(start)
    .catch(function (err) { fail(err.message || String(err)); });
})();
