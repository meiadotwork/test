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
  var readBtn = document.getElementById("readAloud");
  var speechOK = "speechSynthesis" in window;
  var galleryItems = [], lightIndex = 0;

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

  /* ---------- runtime image resolution (free sources) ---------- */
  // Empty src/image values are upgraded to real photos at render time using
  // CORS-enabled free APIs (Wikipedia lead images + Wikimedia Commons search).
  // Placeholders stay as the fallback, so the site still works fully offline.
  var imageCache = {};
  try { imageCache = JSON.parse(localStorage.getItem("artisearch_imgcache") || "{}"); } catch (e) {}

  function cachePut(key, url) {
    imageCache[key] = url || "";
    if (url) { try { localStorage.setItem("artisearch_imgcache", JSON.stringify(imageCache)); } catch (e) {} }
  }

  function fetchJSON(url) {
    return fetch(url, { mode: "cors" }).then(function (r) { return r.ok ? r.json() : null; });
  }

  function resolvePortrait(name) {
    return fetchJSON("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(name))
      .then(function (d) {
        if (!d) return "";
        return (d.originalimage && d.originalimage.source) || (d.thumbnail && d.thumbnail.source) || "";
      });
  }

  function resolveWork(q) {
    var api = "https://commons.wikimedia.org/w/api.php?action=query&generator=search" +
      "&gsrnamespace=6&gsrsearch=" + encodeURIComponent(q) + "&gsrlimit=1" +
      "&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json&origin=*";
    return fetchJSON(api).then(function (d) {
      if (!d || !d.query || !d.query.pages) return "";
      var pages = d.query.pages, k = Object.keys(pages)[0];
      var ii = pages[k] && pages[k].imageinfo && pages[k].imageinfo[0];
      return ii ? (ii.thumburl || ii.url) : "";
    });
  }

  // Once a real URL loads, swap it in and keep the lightbox gallery in sync.
  function applyImage(el, url) {
    if (!url) return;
    var pre = new Image();
    pre.onload = function () {
      el.style.backgroundImage = "url('" + url + "')";
      el.classList.add("img-loaded");
      var workBtn = el.closest(".work");
      if (workBtn) {
        workBtn.setAttribute("data-img", url);
        var idx = workBtn.getAttribute("data-index");
        if (idx != null && galleryItems[idx]) galleryItems[idx].img = url;
      }
    };
    pre.src = url;
  }

  function hydrateImages(root) {
    if (!("fetch" in window)) return;
    var els = root.querySelectorAll("[data-resolve]");
    Array.prototype.forEach.call(els, function (el) {
      var type = el.getAttribute("data-resolve");
      var q = el.getAttribute("data-q") || "";
      var q2 = el.getAttribute("data-q2") || "";
      var key = type + ":" + q;
      if (Object.prototype.hasOwnProperty.call(imageCache, key)) { applyImage(el, imageCache[key]); return; }
      var p = type === "portrait" ? resolvePortrait(q) : resolveWork(q);
      p.then(function (url) { return (!url && q2) ? resolveWork(q2) : url; })
        .then(function (url) { cachePut(key, url || ""); applyImage(el, url); })
        .catch(function () { imageCache[key] = ""; });
    });
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

  // Convert a YouTube/Vimeo watch URL into an embeddable URL, or null.
  function toEmbed(url) {
    if (!url) return null;
    var yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) return "https://www.youtube.com/embed/" + yt[1];
    var vi = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vi) return "https://player.vimeo.com/video/" + vi[1];
    return null;
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
    var headResolve = head ? "" : ' data-resolve="portrait" data-q="' + esc(a.name) + '"';
    return '<button class="card" data-id="' + esc(a.id) + '">' +
      '<div class="card-thumb"' + headResolve + ' style="background-image:url(\'' + img(head, a.id, a.name) + '\')"></div>' +
      '<div class="card-body">' +
        '<h3 class="card-name">' + esc(a.name) + "</h3>" +
        '<p class="card-sub">' + esc(a.nationality || "") + (a.livesIn ? " · lives in " + esc(a.livesIn) : "") + "</p>" +
        '<div class="tag-row">' + tags + "</div>" +
      "</div></button>";
  }

  // Compact, clickable A–Z directory of every artist (for when you can't
  // recall a name). Grouped by first letter, names sorted alphabetically.
  function renderIndex(list) {
    var groups = {};
    list.forEach(function (a) {
      var letter = (a.name || "#").charAt(0).toUpperCase();
      (groups[letter] = groups[letter] || []).push(a);
    });
    var letters = Object.keys(groups).sort();
    var cols = letters.map(function (L) {
      var names = groups[L].map(function (a) {
        return '<button class="index-name" data-id="' + esc(a.id) + '">' + esc(a.name) + "</button>";
      }).join("");
      return '<div class="index-group"><h3 class="index-letter">' + esc(L) + "</h3>" + names + "</div>";
    }).join("");
    return '<details class="artist-index"><summary>Browse all artists A–Z <span class="index-count">(' +
      list.length + ')</span></summary>' +
      '<div class="index-cols">' + cols + "</div></details>";
  }

  function renderList() {
    stopRead();
    var results = filtered().slice().sort(function (a, b) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    var html = "";

    var label = "";
    if (state.filter) label = " in " + esc(state.filter.value);
    html += '<p class="results-meta">' + results.length + " artist" +
      (results.length === 1 ? "" : "s") +
      (state.query ? " matching “" + esc(state.query) + "”" : "") + label + "</p>";

    if (!results.length) {
      html += '<div class="empty"><h2>No artists found</h2><p>Try a different name, movement, medium, or place.</p></div>';
    } else {
      // On the "browse all" home view, show the scannable name index first.
      if (!state.query && !state.filter) html += renderIndex(results);
      html += '<div class="grid">' + results.map(cardHTML).join("") + "</div>";
    }
    view.innerHTML = html;
    hydrateImages(view);
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

    var portraitResolve = head.src ? "" : ' data-resolve="portrait" data-q="' + esc(a.name) + '"';
    var hero =
      '<div class="hero">' +
        '<div><div class="hero-portrait"' + portraitResolve + ' style="background-image:url(\'' + img(head.src, a.id, a.name, true) + '\')"></div>' +
          (head.credit ? '<p class="portrait-credit">' + esc(head.credit) + "</p>" : "") +
        "</div>" +
        "<div>" +
          '<h1 class="hero-name">' + esc(a.name) + "</h1>" +
          (a.pronunciation ? '<p class="hero-pron">/ ' + esc(a.pronunciation) + " /</p>" : "") +
          '<p class="hero-nat">' + esc(a.nationality || "") +
            (a.pronouns ? ' <span class="hero-pronouns">· ' + esc(a.pronouns) + "</span>" : "") + "</p>" +
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

    /* long-form biography — a deep, ~10-minute read */
    var biography = "";
    if (a.biography && a.biography.length) {
      var bodyHtml = a.biography.map(function (b) {
        var paras = String(b.text || "").split(/\n\n+/).map(function (p) {
          return p.trim() ? "<p>" + esc(p.trim()) + "</p>" : "";
        }).join("");
        return (b.heading ? '<h3 class="bio-head">' + esc(b.heading) + "</h3>" : "") + paras;
      }).join("");
      biography = section("Biography", '<div class="bio">' + bodyHtml + "</div>");
    }

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

    /* interviews — embed playable videos, list the rest */
    var interviews = "";
    if (a.interviews && a.interviews.length) {
      var embeds = "", others = "";
      a.interviews.forEach(function (it) {
        var embed = it.type === "video" ? toEmbed(it.url) : null;
        if (embed) {
          embeds += '<figure class="video-embed">' +
            '<div class="video-frame"><iframe src="' + esc(embed) +
            '" title="' + esc(it.title) + '" loading="lazy" allowfullscreen ' +
            'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>' +
            '<figcaption class="video-cap"><span class="video-title">' + esc(it.title) + "</span>" +
            (it.source ? '<span class="li-source">' + esc(it.source) + "</span>" : "") + "</figcaption></figure>";
        } else {
          others += "<li><span><span class=\"badge " + (it.type === "video" ? "video" : "written") + "\">" +
            esc(it.type === "video" ? "Video" : "Written") + "</span>" +
            "<a target=\"_blank\" rel=\"noopener\" href=\"" + esc(it.url) + "\">" + esc(it.title) + "</a></span>" +
            "<span class=\"li-source\">" + esc(it.source || "") + "</span></li>";
        }
      });
      var inner = "";
      if (embeds) inner += '<div class="video-grid">' + embeds + "</div>";
      if (others) inner += '<ul class="link-list"' + (embeds ? ' style="margin-top:22px"' : "") + ">" + others + "</ul>";
      interviews = section("Interviews & Talks", inner);
    }

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
    galleryItems = [];
    (a.series || []).forEach(function (s) {
      var works = (s.works || []).map(function (w, i) {
        var src = img(w.image, a.id + "-" + s.name + "-" + i, w.title);
        var caption = esc([w.title, w.year].filter(Boolean).join(", "));
        var meta = esc([w.medium, w.dimensions].filter(Boolean).join(", "));
        var availLine = [w.price, w.status].filter(Boolean).map(esc).join(" · ");
        var statusClass = (w.status || "").toLowerCase().indexOf("avail") !== -1 ? "avail"
          : (w.status || "").toLowerCase().indexOf("sold") !== -1 ? "sold" : "other";
        var statusBadge = w.status ? '<span class="work-status ' + statusClass + '">' + esc(w.status) + "</span>" : "";
        var capDetail = s.name + " — " + (w.title || "") + (w.year ? " (" + w.year + ")" : "") +
          (meta ? " · " + (w.medium || "") + " " + (w.dimensions || "") : "") +
          (availLine ? " · " + (w.price || "") + (w.price && w.status ? " — " : "") + (w.status || "") : "");
        var gi = galleryItems.length;
        galleryItems.push({ img: src, caption: capDetail });
        var workResolve = w.image ? "" : ' data-resolve="work" data-q="' +
          esc(a.name + " " + (w.title || "")) + '" data-q2="' + esc(a.name + " " + s.name) + '"';
        return '<button class="work" data-index="' + gi + '" data-img="' + esc(src) + '" data-caption="' + esc(capDetail) + '">' +
          '<div class="work-img"' + workResolve + ' style="background-image:url(\'' + src + '\')">' + statusBadge + "</div>" +
          '<div class="work-cap"><div class="work-title">' + caption + '</div>' +
          (meta ? '<div class="work-meta">' + meta + "</div>" : "") +
          (availLine ? '<div class="work-avail">' + availLine + "</div>" : "") + "</div></button>";
      }).join("");
      workInner += '<div class="series-block"><div class="series-head">' +
        '<p class="series-name">' + esc(s.name) +
        (s.year ? '<span class="series-year">' + esc(s.year) + "</span>" : "") + "</p>" +
        (s.description ? '<p class="series-desc">' + esc(s.description) + "</p>" : "") + "</div>" +
        '<div class="work-grid">' + works + "</div></div>";
    });
    if (workInner && a.salesContact) {
      workInner = '<p class="sales-note">For pricing &amp; availability, contact ' +
        '<a href="mailto:' + esc(a.salesContact) + '">' + esc(a.salesContact) + "</a>.</p>" + workInner;
    }
    var work = workInner ? section("Work — by Body of Work & Series", workInner) : "";

    /* selected (past) exhibitions */
    var pastEx = (a.pastExhibitions && a.pastExhibitions.length) ? section("Selected Exhibitions",
      '<ul class="link-list">' + a.pastExhibitions.map(function (e) {
        var title = e.url && e.url !== "#"
          ? "<a target=\"_blank\" rel=\"noopener\" href=\"" + esc(e.url) + "\">" + esc(e.title) + "</a>"
          : esc(e.title);
        var left = (e.type ? '<span class="badge other">' + esc(e.type) + "</span>" : "") + title +
          (e.venue || e.location ? ' <span class="def-meta">— ' + esc([e.venue, e.location].filter(Boolean).join(", ")) + "</span>" : "");
        return "<li><span>" + left + '</span><span class="li-source">' + esc(e.year || "") + "</span></li>";
      }).join("") + "</ul>") : "";

    /* art fairs */
    var fairs = (a.artFairs && a.artFairs.length) ? section("Art Fairs",
      '<ul class="link-list">' + a.artFairs.map(function (f) {
        var name = f.url && f.url !== "#"
          ? "<a target=\"_blank\" rel=\"noopener\" href=\"" + esc(f.url) + "\">" + esc(f.name) + "</a>"
          : esc(f.name);
        var detail = [f.presentedBy ? "presented by " + f.presentedBy : "", f.location].filter(Boolean).join(" · ");
        return "<li><span>" + name + (detail ? ' <span class="def-meta">— ' + esc(detail) + "</span>" : "") +
          '</span><span class="li-source">' + esc(f.year || "") + "</span></li>";
      }).join("") + "</ul>") : "";

    /* studio */
    var studioInner = "";
    if (a.studio && (a.studio.location || a.studio.visits)) {
      studioInner = '<div class="facts">' +
        fact("Location", esc(a.studio.location)) +
        fact("Visits", esc(a.studio.visits)) + "</div>";
    }
    var studio = studioInner ? section("Studio & Visits", studioInner) : "";

    /* related */
    var rel = relatedTo(a);
    var related = rel.length ? section("Related Artists",
      '<div class="related-grid">' + rel.map(cardHTML).join("") + "</div>") : "";

    /* works on video — embedded YouTube/Vimeo showing the artist's work */
    var videosSection = "";
    if (a.videos && a.videos.length) {
      var vembeds = a.videos.map(function (v) {
        var embed = toEmbed(v.url);
        if (!embed) return "";
        return '<figure class="video-embed">' +
          '<div class="video-frame"><iframe src="' + esc(embed) +
          '" title="' + esc(v.title) + '" loading="lazy" allowfullscreen ' +
          'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>' +
          '<figcaption class="video-cap"><span class="video-title">' + esc(v.title) + "</span>" +
          (v.source ? '<span class="li-source">' + esc(v.source) + "</span>" : "") + "</figcaption></figure>";
      }).join("");
      if (vembeds) videosSection = section("Works on Video", '<div class="video-grid">' + vembeds + "</div>");
    }

    view.innerHTML =
      '<button class="back-btn" id="backBtn">← Back to results</button>' +
      hero + statement + biography + section("Movement", (a.movements || []).length
        ? '<div class="tag-row">' + a.movements.map(function (m) { return '<span class="tag">' + esc(m) + "</span>"; }).join("") + "</div>"
        : "") +
      videosSection +
      galleries + cv + press + interviews + books + collections + shows + pastEx + fairs + work + studio + related;

    hydrateImages(view);
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

  /* ---------- read aloud ---------- */

  function currentArtist() {
    var h = location.hash.replace(/^#/, "");
    if (h.indexOf("artist/") === 0) {
      var id = h.slice("artist/".length);
      return ARTISTS.find(function (a) { return a.id === id; }) || null;
    }
    return null;
  }

  function joinList(arr) { return (arr || []).filter(Boolean).join(", "); }

  function buildNarration() {
    var a = currentArtist();
    if (a) {
      var p = [];
      p.push(a.name + ".");
      if (a.nationality) p.push(a.nationality + " artist.");
      var bio = [];
      if (a.bornDate) bio.push("Born " + a.bornDate + (a.bornPlace ? " in " + a.bornPlace : ""));
      if (a.livesIn) bio.push("lives and works in " + a.livesIn);
      if (bio.length) p.push(bio.join("; ") + ".");
      if (a.movements && a.movements.length) p.push("Associated with " + joinList(a.movements) + ".");
      if (a.mediums && a.mediums.length) p.push("Works in " + joinList(a.mediums) + ".");
      if (a.artStatement) p.push("Artist statement. " + a.artStatement);
      if (a.galleries && a.galleries.length) p.push("Represented by " + joinList(a.galleries.map(function (g) { return g.name; })) + ".");
      if (a.upcomingShows && a.upcomingShows.length) {
        p.push("Upcoming shows: " + joinList(a.upcomingShows.map(function (s) {
          return s.title + (s.venue ? " at " + s.venue : "");
        })) + ".");
      }
      if (a.series && a.series.length) p.push("Bodies of work include " + joinList(a.series.map(function (s) { return s.name; })) + ".");
      return p.join(" ");
    }
    var results = filtered();
    if (!results.length) return "No artists found. Try a different search.";
    var intro = "Showing " + results.length + " artist" + (results.length === 1 ? "" : "s") + ". ";
    return intro + results.map(function (r) {
      return r.name + (r.nationality ? ", " + r.nationality : "") +
        (r.movements && r.movements.length ? ", known for " + joinList(r.movements) : "") + ".";
    }).join(" ");
  }

  // Speak text in sentence-sized chunks (avoids the long-utterance cutoff bug).
  function chunkText(text) {
    var sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
    var chunks = [], buf = "";
    sentences.forEach(function (s) {
      if ((buf + s).length > 200 && buf) { chunks.push(buf); buf = s; }
      else { buf += s; }
    });
    if (buf.trim()) chunks.push(buf);
    return chunks;
  }

  function setReadState(speaking) {
    readBtn.classList.toggle("speaking", speaking);
    readBtn.setAttribute("aria-pressed", speaking ? "true" : "false");
    readBtn.querySelector(".ra-label").textContent = speaking ? "Stop" : "Read aloud";
  }

  function stopRead() {
    if (!speechOK) return;
    window.speechSynthesis.cancel();
    setReadState(false);
  }

  function toggleRead() {
    if (!speechOK) return;
    var synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) { stopRead(); return; }
    var text = buildNarration();
    if (!text) return;
    synth.cancel();
    var chunks = chunkText(text), done = 0;
    chunks.forEach(function (c) {
      var u = new SpeechSynthesisUtterance(c);
      u.rate = 1; u.pitch = 1;
      u.onend = function () { done++; if (done >= chunks.length) setReadState(false); };
      u.onerror = function () { setReadState(false); };
      synth.speak(u);
    });
    setReadState(true);
  }

  /* ---------- routing ---------- */

  function route() {
    stopRead();
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
      var idx = e.target.closest(".index-name");
      if (idx) { location.hash = "artist/" + idx.getAttribute("data-id"); return; }
      var card = e.target.closest(".card");
      if (card) { location.hash = "artist/" + card.getAttribute("data-id"); return; }
      if (e.target.closest("#backBtn")) { location.hash = ""; return; }
      var work = e.target.closest(".work");
      if (work) openLightbox(parseInt(work.getAttribute("data-index"), 10) || 0);
    });

    document.getElementById("brandLink").addEventListener("click", function (e) {
      e.preventDefault();
      state.query = ""; state.filter = null; searchInput.value = "";
      syncChips();
      if (location.hash) location.hash = ""; else renderList();
    });

    readBtn.addEventListener("click", toggleRead);
    window.addEventListener("beforeunload", stopRead);

    document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
    document.getElementById("lightboxPrev").addEventListener("click", function () { navLight(-1); });
    document.getElementById("lightboxNext").addEventListener("click", function () { navLight(1); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") navLight(-1);
      else if (e.key === "ArrowRight") navLight(1);
    });

    window.addEventListener("hashchange", route);
  }

  function showLight() {
    var item = galleryItems[lightIndex];
    if (!item) return;
    lightboxImg.style.backgroundImage = "url('" + item.img + "')";
    lightboxCaption.textContent = item.caption || "";
    var multi = galleryItems.length > 1;
    document.getElementById("lightboxPrev").hidden = !multi;
    document.getElementById("lightboxNext").hidden = !multi;
  }
  function navLight(delta) {
    if (!galleryItems.length) return;
    lightIndex = (lightIndex + delta + galleryItems.length) % galleryItems.length;
    showLight();
  }
  function openLightbox(index) {
    lightIndex = index || 0;
    showLight();
    lightbox.hidden = false;
  }
  function closeLightbox() { lightbox.hidden = true; }

  /* ---------- init ---------- */

  function start(data) {
    ARTISTS = data;
    if (speechOK) readBtn.hidden = false;
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
