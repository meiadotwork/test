/* Artisearch — vanilla artist discovery engine */
(function () {
  "use strict";

  var ARTISTS = [];
  var state = { query: "", filter: null }; // filter = {type, value} or null

  /* ---------- i18n (English / Brazilian Portuguese) ---------- */
  var LANG = (function () { try { return localStorage.getItem("ac_lang") || "en"; } catch (e) { return "en"; } })();
  function setLang(l) { LANG = l; try { localStorage.setItem("ac_lang", l); } catch (e) {} }

  var STR = {
    searchPlaceholder: { en: "Search artists, movements, mediums, places…", pt: "Buscar artistas, movimentos, meios, lugares…" },
    readAloud: { en: "Read aloud", pt: "Ouvir" },
    stop: { en: "Stop", pt: "Parar" },
    back: { en: "← Back to results", pt: "← Voltar aos resultados" },
    browseAll: { en: "Browse all artists A–Z", pt: "Ver todos os artistas de A a Z" },
    noArtists: { en: "No artists found", pt: "Nenhum artista encontrado" },
    noArtistsSub: { en: "Try a different name, movement, medium, or place.", pt: "Tente outro nome, movimento, meio ou lugar." },
    all: { en: "All", pt: "Todos" },
    artist1: { en: "artist", pt: "artista" },
    artistN: { en: "artists", pt: "artistas" },
    matching: { en: "matching", pt: "para" },
    inWord: { en: "in", pt: "em" },
    livesInShort: { en: "lives in", pt: "vive em" },
    fBorn: { en: "Born", pt: "Nascimento" },
    fBirthplace: { en: "Birthplace", pt: "Local de nascimento" },
    fLives: { en: "Lives & works", pt: "Vive e trabalha" },
    fMovement: { en: "Movement", pt: "Movimento" },
    fMediums: { en: "Mediums", pt: "Meios" },
    website: { en: "Website ↗", pt: "Site ↗" },
    instagram: { en: "Instagram", pt: "Instagram" },
    email: { en: "Email", pt: "E-mail" },
    downloadCV: { en: "Download C.V.", pt: "Baixar currículo" },
    sStatement: { en: "Artist Statement", pt: "Declaração do Artista" },
    sBiography: { en: "Biography", pt: "Biografia" },
    sRepresented: { en: "Represented By", pt: "Representado por" },
    sCV: { en: "Curriculum Vitae", pt: "Currículo" },
    sEducation: { en: "Education", pt: "Formação" },
    sAwards: { en: "Awards & Honors", pt: "Prêmios e Honrarias" },
    sPress: { en: "Press & Reviews", pt: "Imprensa e Críticas" },
    sInterviews: { en: "Interviews & Talks", pt: "Entrevistas e Palestras" },
    sBooks: { en: "Books & Publications", pt: "Livros e Publicações" },
    sCollections: { en: "Public Collections", pt: "Coleções Públicas" },
    sUpcoming: { en: "Upcoming Shows", pt: "Próximas Exposições" },
    sWork: { en: "Work — by Body of Work & Series", pt: "Obras — por Conjunto e Série" },
    sPastEx: { en: "Selected Exhibitions", pt: "Exposições Selecionadas" },
    sFairs: { en: "Art Fairs", pt: "Feiras de Arte" },
    sStudio: { en: "Studio & Visits", pt: "Ateliê e Visitas" },
    sRelated: { en: "Related Artists", pt: "Artistas Relacionados" },
    sVideos: { en: "Works on Video", pt: "Obras em Vídeo" },
    sBodies: { en: "Bodies of Work", pt: "Conjuntos de Obras" },
    sCuriosity: { en: "Did You Know?", pt: "Você Sabia?" },
    bVideo: { en: "Video", pt: "Vídeo" },
    bWritten: { en: "Written", pt: "Texto" },
    fLocation: { en: "Location", pt: "Local" },
    fVisits: { en: "Visits", pt: "Visitas" },
    presentedBy: { en: "presented by", pt: "apresentado por" },
    salesPre: { en: "For pricing & availability, contact ", pt: "Para preços e disponibilidade, contate " },
    browseCount: { en: "", pt: "" }
  };
  function t(key) { var e = STR[key]; return e ? (e[LANG] || e.en) : key; }
  // Content getter: prefer the pt-BR field (e.g. artStatement_pt) when in PT.
  function L(a, field) { return (LANG === "pt" && a[field + "_pt"]) ? a[field + "_pt"] : a[field]; }
  function bioOf(a) { return (LANG === "pt" && a.biography_pt && a.biography_pt.length) ? a.biography_pt : a.biography; }

  /* ---------- curated artist portraits (verified free-licensed) ---------- */
  var PORTRAITS = {
    "yayoi-kusama": "https://commons.wikimedia.org/wiki/Special:FilePath/Yayoi_Kusama_circa_2004.jpg?width=600",
    "tom-friedman": "https://commons.wikimedia.org/wiki/Special:FilePath/Tom_Friedman.JPG?width=600",
    "james-turrell": "https://commons.wikimedia.org/wiki/Special:FilePath/James-Turrell-medals-hi-res.jpg?width=600",
    "ai-weiwei": "https://commons.wikimedia.org/wiki/Special:FilePath/Aj_Wej-wej_I_%282017%29.jpg?width=600",
    "alicja-kwade": "https://commons.wikimedia.org/wiki/Special:FilePath/Oliver_Mark_-_Alicja_Kwade%2C_Berlin_2014.jpg?width=600",
    "amy-sherald": "https://commons.wikimedia.org/wiki/Special:FilePath/AmySherald-byPhilipRomano.jpg?width=600",
    "andreas-gursky": "https://commons.wikimedia.org/wiki/Special:FilePath/Gursky-andreas-010313-2.jpg?width=600",
    "anish-kapoor": "https://commons.wikimedia.org/wiki/Special:FilePath/Anish_Kapoor_2017.jpg?width=600",
    "anthony-mccall": "https://commons.wikimedia.org/wiki/Special:FilePath/Anthony_McCall.jpg?width=600",
    "antony-gormley": "https://commons.wikimedia.org/wiki/Special:FilePath/Sir_Antony_Mark_David_Gormley_%282024%29.jpg?width=600",
    "bharti-kher": "https://commons.wikimedia.org/wiki/Special:FilePath/Bharti_Kher.gif?width=600",
    "cai-guo-qiang": "https://commons.wikimedia.org/wiki/Special:FilePath/CaiGuoQiangSpeakingOct10.jpg?width=600",
    "carlos-cruz-diez": "https://commons.wikimedia.org/wiki/Special:FilePath/Retrato_Cruz-Diez_France_2013.jpg?width=600",
    "cecily-brown": "https://commons.wikimedia.org/wiki/Special:FilePath/Cecily_Brown_2012.jpg?width=600",
    "cildo-meireles": "https://commons.wikimedia.org/wiki/Special:FilePath/Cildo_Meireles_davant_de_la_seva_obra_%E2%80%98Entrevendo%E2%80%99.jpg?width=600",
    "cindy-sherman": "https://commons.wikimedia.org/wiki/Special:FilePath/Cindy_Sherman_%28cropped%29.jpg?width=600",
    "conrad-shawcross": "https://commons.wikimedia.org/wiki/Special:FilePath/Conrad_Shawcross%2C_2011_%28cropped%29.JPG?width=600",
    "damien-hirst": "https://commons.wikimedia.org/wiki/Special:FilePath/Damien_Hirst_2_-_West_London_studio%2C_Jul_16%2C_2021.jpg?width=600",
    "david-hockney": "https://commons.wikimedia.org/wiki/Special:FilePath/David_Hockney_in_Washington_Square_Park_%281977%29.jpg?width=600",
    "do-ho-suh": "https://commons.wikimedia.org/wiki/Special:FilePath/Do_Ho_Suh_and_Eitaro_Ogawa_%28cropped%29.jpg?width=600",
    "doris-salcedo": "https://commons.wikimedia.org/wiki/Special:FilePath/GUGG_Doris_Salcedo.jpg?width=600",
    "ernesto-neto": "https://commons.wikimedia.org/wiki/Special:FilePath/Ernsto_Neto_portrait_4.JPG?width=600",
    "gabriel-orozco": "https://commons.wikimedia.org/wiki/Special:FilePath/Gabriel_Orozco%2C_2024.jpg?width=600",
    "georg-baselitz": "https://commons.wikimedia.org/wiki/Special:FilePath/Georg_Baselitz_by_Erling_Mandelmann.jpg?width=600",
    "gerhard-richter": "https://commons.wikimedia.org/wiki/Special:FilePath/Gerhard_Richter%2C_Prague_%282017%29.jpg?width=600",
    "glenn-ligon": "https://commons.wikimedia.org/wiki/Special:FilePath/Glenn_Ligon_Interview_at_Camden_Arts_Centre_6m24s_%28cropped%29.jpg?width=600",
    "jeff-koons": "https://commons.wikimedia.org/wiki/Special:FilePath/Jeff_Koons_01_%283x4_cropped%29.JPG?width=600",
    "jesus-rafael-soto": "https://commons.wikimedia.org/wiki/Special:FilePath/Jesus_Rafael_Soto_by_Lothar_Wolleh.jpg?width=600",
    "julie-mehretu": "https://commons.wikimedia.org/wiki/Special:FilePath/Inside_the_Studio_with_Julie_Mehretu_00.01_%28cropped%29.jpg?width=600",
    "julio-le-parc": "https://commons.wikimedia.org/wiki/Special:FilePath/Leparc_julio.png?width=600",
    "kara-walker": "https://commons.wikimedia.org/wiki/Special:FilePath/Kara_Walker_Interview_Camden_Arts_Centre_01.47_%28cropped%29.jpg?width=600",
    "katharina-grosse": "https://commons.wikimedia.org/wiki/Special:FilePath/Oliver_Mark_-_Katharina_Grosse%2C_Berlin_2011.jpg?width=600",
    "kehinde-wiley": "https://commons.wikimedia.org/wiki/Special:FilePath/Kehinde_Wiley_%282015%29_%28cropped%29.jpg?width=600",
    "lee-ufan": "https://commons.wikimedia.org/wiki/Special:FilePath/Lee_Ufan.jpg?width=600",
    "lorna-simpson": "https://commons.wikimedia.org/wiki/Special:FilePath/LornaSimpsonApr09_cropped.jpg?width=600",
    "luc-tuymans": "https://commons.wikimedia.org/wiki/Special:FilePath/Luc_Tuymans_01.jpg?width=600",
    "mariko-mori": "https://commons.wikimedia.org/wiki/Special:FilePath/Mori_Mariko_at_the_Japan_Society_Panel_on_Art_%26_Nature_2010.jpg?width=600",
    "marina-abramovic": "https://commons.wikimedia.org/wiki/Special:FilePath/Glasto24_28_300624_%28130_of_545%29_%2853838092455%29_%28cropped%29.jpg?width=600",
    "mark-bradford": "https://commons.wikimedia.org/wiki/Special:FilePath/MarkBradfordPortrait4.jpg?width=600",
    "mark-grotjahn": "https://commons.wikimedia.org/wiki/Special:FilePath/Mark_Grotjahn.jpeg?width=600",
    "marlene-dumas": "https://commons.wikimedia.org/wiki/Special:FilePath/Marlene_Dumas.jpg?width=600",
    "mickalene-thomas": "https://commons.wikimedia.org/wiki/Special:FilePath/Mickalene_Thomas%2C_April_2017.png?width=600",
    "mona-hatoum": "https://commons.wikimedia.org/wiki/Special:FilePath/IVAM_-_Mona_Hatoum.jpg?width=600",
    "njideka-akunyili-crosby": "https://commons.wikimedia.org/wiki/Special:FilePath/Njideka_Akunyili_2014.jpg?width=600",
    "olafur-eliasson": "https://commons.wikimedia.org/wiki/Special:FilePath/%C3%93lafur_El%C3%ADasson_Internationale_Jury_Berlinale_2017_%28cropped%29.jpg?width=600",
    "olga-de-amaral": "https://commons.wikimedia.org/wiki/Special:FilePath/Olga_in_Ubat%C3%A9_%28cropped%29.jpg?width=600",
    "peter-doig": "https://commons.wikimedia.org/wiki/Special:FilePath/Peter_Doig_-_%27No_Foreign_Lands%27_Presser_-_2013-08-01.jpeg?width=600",
    "pipilotti-rist": "https://commons.wikimedia.org/wiki/Special:FilePath/Portraitfoto_Pipilotti_Rist.jpg?width=600",
    "rachel-whiteread": "https://commons.wikimedia.org/wiki/Special:FilePath/Rachel_Whiteread_2018.jpg?width=600",
    "rafael-lozano-hemmer": "https://commons.wikimedia.org/wiki/Special:FilePath/Rafael_Lozano-Hemmer_Portrait.jpg?width=600",
    "rashid-johnson": "https://commons.wikimedia.org/wiki/Special:FilePath/20081202_Rashid_Johnson_at_the_Rubell_Family_Collection.jpg?width=600",
    "refik-anadol": "https://commons.wikimedia.org/wiki/Special:FilePath/Dubai_Future_Forum_2024_-_Refik_Anadol.jpg?width=600",
    "shirin-neshat": "https://commons.wikimedia.org/wiki/Special:FilePath/Viennale_talk_%282%29%2C_Shirin_Neshat.jpg?width=600",
    "subodh-gupta": "https://commons.wikimedia.org/wiki/Special:FilePath/Subodh_Gupta%2C_2020.jpg?width=600",
    "takashi-murakami": "https://commons.wikimedia.org/wiki/Special:FilePath/Takashi_Murakami_at_Versailles_Sept._2010_%28crop%29.jpg?width=600",
    "teresita-fernandez": "https://commons.wikimedia.org/wiki/Special:FilePath/TF_portrait_2019_02_full_image%28by_Natalia_Mantini%29.jpg?width=600",
    "theaster-gates": "https://commons.wikimedia.org/wiki/Special:FilePath/Unleashing_Entrepreneurial_Innovation_with_Stanford_University_Theaster_Gates.jpg?width=600",
    "tomas-saraceno": "https://commons.wikimedia.org/wiki/Special:FilePath/Tom%C3%A1s_Saraceno_a_Firenze%2C_21_febbraio_2020%2C_04.jpg?width=600",
    "tracey-emin": "https://commons.wikimedia.org/wiki/Special:FilePath/Tracey_Emin_1-cropped.jpg?width=600",
    "vik-muniz": "https://commons.wikimedia.org/wiki/Special:FilePath/Visita_-_Artista_Pl%C3%A1stico_Vik_Muniz_%2853515588190%29_%28cropped%29.jpg?width=600",
    "william-kentridge": "https://commons.wikimedia.org/wiki/Special:FilePath/William_Kentridge_%282025%29.jpg?width=600",
    "wolfgang-tillmans": "https://commons.wikimedia.org/wiki/Special:FilePath/Tillmans_crop.jpg?width=600",
    "yinka-shonibare": "https://commons.wikimedia.org/wiki/Special:FilePath/Yinka_Shonibare_CBE_RA%2C_in_front_of_Hibiscus_Rising._LEEDS_2023_%28cropped%29.jpg?width=600",
    "yoshitomo-nara": "https://commons.wikimedia.org/wiki/Special:FilePath/Yoshitomo_Nara_Yokohama_2012.jpg?width=600"
  };

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
      '<text x="50%" y="50%" font-family="\'Courier Prime\',Courier,monospace" font-size="' + (ratioTall ? 150 : 130) +
      '" font-weight="700" fill="rgba(0,0,0,.28)" text-anchor="middle" dominant-baseline="central">' +
      esc(initials) + "</text></svg>";
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function img(src, seed, label, tall) {
    return src && src.trim() ? src : placeholder(seed, label, tall);
  }

  /* ---------- runtime image resolution (free sources) ---------- */
  // Work images with an empty value are upgraded to real photos at render time
  // using the CORS-enabled Wikimedia Commons search. Portraits are NOT guessed
  // this way (see the curated PORTRAITS map) to avoid showing the wrong person.
  var imageCache = {};
  try { imageCache = JSON.parse(localStorage.getItem("artisearch_imgcache") || "{}"); } catch (e) {}

  function cachePut(key, url) {
    imageCache[key] = url || "";
    if (url) { try { localStorage.setItem("artisearch_imgcache", JSON.stringify(imageCache)); } catch (e) {} }
  }

  function fetchJSON(url) {
    return fetch(url, { mode: "cors" }).then(function (r) { return r.ok ? r.json() : null; });
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
      var q = el.getAttribute("data-q") || "";
      var q2 = el.getAttribute("data-q2") || "";
      var key = "work:" + q;
      if (Object.prototype.hasOwnProperty.call(imageCache, key)) { applyImage(el, imageCache[key]); return; }
      resolveWork(q)
        .then(function (url) { return (!url && q2) ? resolveWork(q2) : url; })
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
    var head = PORTRAITS[a.id] || "";
    var tags = (a.movements || []).slice(0, 3).map(function (m) {
      return '<span class="tag">' + esc(m) + "</span>";
    }).join("");
    return '<button class="card" data-id="' + esc(a.id) + '">' +
      '<div class="card-thumb" style="background-image:url(\'' + img(head, a.id, a.name) + '\')"></div>' +
      '<div class="card-body">' +
        '<h3 class="card-name">' + esc(a.name) + "</h3>" +
        '<p class="card-sub">' + esc(a.nationality || "") + (a.livesIn ? " · " + t("livesInShort") + " " + esc(a.livesIn) : "") + "</p>" +
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
    return '<details class="artist-index"><summary>' + t("browseAll") + ' <span class="index-count">(' +
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
    if (state.filter) label = " " + t("inWord") + " " + esc(state.filter.value);
    html += '<p class="results-meta">' + results.length + " " +
      (results.length === 1 ? t("artist1") : t("artistN")) +
      (state.query ? " " + t("matching") + " “" + esc(state.query) + "”" : "") + label + "</p>";

    if (!results.length) {
      html += '<div class="empty"><h2>' + t("noArtists") + "</h2><p>" + t("noArtistsSub") + "</p></div>";
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
    var head = { src: PORTRAITS[a.id] || "", credit: "" };

    /* hero links */
    var links = "";
    if (a.website) links += '<a class="link-btn primary" target="_blank" rel="noopener" href="' + esc(a.website) + '">' + t("website") + "</a>";
    if (a.instagram) links += '<a class="link-btn" target="_blank" rel="noopener" href="' + esc(a.instagram) + '">' + t("instagram") + "</a>";
    if (a.email) links += '<a class="link-btn" href="mailto:' + esc(a.email) + '">' + t("email") + "</a>";
    if (a.cv && a.cv.url) links += '<a class="link-btn" target="_blank" rel="noopener" href="' + esc(a.cv.url) + '">' + t("downloadCV") + "</a>";

    var hero =
      '<div class="hero">' +
        '<div><div class="hero-portrait" style="background-image:url(\'' + img(head.src, a.id, a.name, true) + '\')"></div>' +
          (head.credit ? '<p class="portrait-credit">' + esc(head.credit) + "</p>" : "") +
        "</div>" +
        "<div>" +
          '<h1 class="hero-name">' + esc(a.name) + "</h1>" +
          (a.pronunciation ? '<p class="hero-pron">/ ' + esc(a.pronunciation) + " /</p>" : "") +
          '<p class="hero-nat">' + esc(a.nationality || "") +
            (a.pronouns ? ' <span class="hero-pronouns">· ' + esc(a.pronouns) + "</span>" : "") + "</p>" +
          '<div class="facts">' +
            fact(t("fBorn"), esc(a.bornDate)) +
            fact(t("fBirthplace"), esc(a.bornPlace)) +
            fact(t("fLives"), esc(a.livesIn)) +
            fact(t("fMovement"), (a.movements || []).map(esc).join(", ")) +
            fact(t("fMediums"), (a.mediums || []).map(esc).join(", ")) +
          "</div>" +
          '<div class="hero-links">' + links + "</div>" +
        "</div>" +
      "</div>";

    /* statement */
    var stmt = L(a, "artStatement");
    var statement = stmt
      ? section(t("sStatement"), '<p class="statement">' + esc(stmt) + "</p>") : "";

    /* long-form biography — a deep, ~10-minute read */
    var biography = "";
    var bioArr = bioOf(a);
    if (bioArr && bioArr.length) {
      var bodyHtml = bioArr.map(function (b) {
        var paras = String(b.text || "").split(/\n\n+/).map(function (p) {
          return p.trim() ? "<p>" + esc(p.trim()) + "</p>" : "";
        }).join("");
        return (b.heading ? '<h3 class="bio-head">' + esc(b.heading) + "</h3>" : "") + paras;
      }).join("");
      biography = section(t("sBiography"), '<div class="bio">' + bodyHtml + "</div>");
    }

    /* galleries */
    var galleries = (a.galleries && a.galleries.length) ? section(t("sRepresented"),
      '<ul class="link-list">' + a.galleries.map(function (g) {
        var name = g.url && g.url !== "#"
          ? '<a target="_blank" rel="noopener" href="' + esc(g.url) + '">' + esc(g.name) + " ↗</a>"
          : esc(g.name);
        return "<li><span>" + name + '</span><span class="li-source">' + esc(g.location || "") + "</span></li>";
      }).join("") + "</ul>") : "";

    /* CV: education + awards */
    var cvInner = "";
    if (a.education && a.education.length) cvInner += "<div><p class=\"fact-label\">" + t("sEducation") + "</p>" + listItems(a.education) + "</div>";
    if (a.awards && a.awards.length) cvInner += "<div><p class=\"fact-label\">" + t("sAwards") + "</p>" + listItems(a.awards) + "</div>";
    var cv = cvInner ? section(t("sCV"), '<div class="cols-2">' + cvInner + "</div>") : "";

    /* press */
    var press = (a.press && a.press.length) ? section(t("sPress"),
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
            (it.type === "video" ? t("bVideo") : t("bWritten")) + "</span>" +
            "<a target=\"_blank\" rel=\"noopener\" href=\"" + esc(it.url) + "\">" + esc(it.title) + "</a></span>" +
            "<span class=\"li-source\">" + esc(it.source || "") + "</span></li>";
        }
      });
      var inner = "";
      if (embeds) inner += '<div class="video-grid">' + embeds + "</div>";
      if (others) inner += '<ul class="link-list"' + (embeds ? ' style="margin-top:22px"' : "") + ">" + others + "</ul>";
      interviews = section(t("sInterviews"), inner);
    }

    /* books */
    var books = (a.books && a.books.length) ? section(t("sBooks"),
      '<ul class="link-list">' + a.books.map(function (b) {
        var title = b.url && b.url !== "#"
          ? "<a target=\"_blank\" rel=\"noopener\" href=\"" + esc(b.url) + "\">" + esc(b.title) + "</a>"
          : esc(b.title);
        return "<li><span>" + title + "</span><span class=\"li-source\">" +
          esc([b.publisher, b.year].filter(Boolean).join(", ")) + "</span></li>";
      }).join("") + "</ul>") : "";

    /* public collections */
    var collections = (a.publicCollections && a.publicCollections.length) ? section(t("sCollections"),
      '<ul class="collections">' + a.publicCollections.map(function (c) {
        return "<li>" + esc(c) + "</li>";
      }).join("") + "</ul>") : "";

    /* upcoming shows */
    var shows = (a.upcomingShows && a.upcomingShows.length) ? section(t("sUpcoming"),
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
      workInner = '<p class="sales-note">' + t("salesPre") +
        '<a href="mailto:' + esc(a.salesContact) + '">' + esc(a.salesContact) + "</a>.</p>" + workInner;
    }
    var work = workInner ? section(t("sWork"), workInner) : "";

    /* selected (past) exhibitions */
    var pastEx = (a.pastExhibitions && a.pastExhibitions.length) ? section(t("sPastEx"),
      '<ul class="link-list">' + a.pastExhibitions.map(function (e) {
        var title = e.url && e.url !== "#"
          ? "<a target=\"_blank\" rel=\"noopener\" href=\"" + esc(e.url) + "\">" + esc(e.title) + "</a>"
          : esc(e.title);
        var left = (e.type ? '<span class="badge other">' + esc(e.type) + "</span>" : "") + title +
          (e.venue || e.location ? ' <span class="def-meta">— ' + esc([e.venue, e.location].filter(Boolean).join(", ")) + "</span>" : "");
        return "<li><span>" + left + '</span><span class="li-source">' + esc(e.year || "") + "</span></li>";
      }).join("") + "</ul>") : "";

    /* art fairs */
    var fairs = (a.artFairs && a.artFairs.length) ? section(t("sFairs"),
      '<ul class="link-list">' + a.artFairs.map(function (f) {
        var name = f.url && f.url !== "#"
          ? "<a target=\"_blank\" rel=\"noopener\" href=\"" + esc(f.url) + "\">" + esc(f.name) + "</a>"
          : esc(f.name);
        var detail = [f.presentedBy ? t("presentedBy") + " " + f.presentedBy : "", f.location].filter(Boolean).join(" · ");
        return "<li><span>" + name + (detail ? ' <span class="def-meta">— ' + esc(detail) + "</span>" : "") +
          '</span><span class="li-source">' + esc(f.year || "") + "</span></li>";
      }).join("") + "</ul>") : "";

    /* studio */
    var studioInner = "";
    if (a.studio && (a.studio.location || a.studio.visits)) {
      studioInner = '<div class="facts">' +
        fact(t("fLocation"), esc(a.studio.location)) +
        fact(t("fVisits"), esc(a.studio.visits)) + "</div>";
    }
    var studio = studioInner ? section(t("sStudio"), studioInner) : "";

    /* related */
    var rel = relatedTo(a);
    var related = rel.length ? section(t("sRelated"),
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
      if (vembeds) videosSection = section(t("sVideos"), '<div class="video-grid">' + vembeds + "</div>");
    }

    /* individual curiosity */
    var curioTxt = L(a, "curiosity");
    var curiosity = curioTxt ? section(t("sCuriosity"), '<p class="statement">' + esc(curioTxt) + "</p>") : "";

    /* bodies of work — full list by name & year */
    var bodies = (a.bodiesOfWork && a.bodiesOfWork.length) ? section(t("sBodies"),
      '<ul class="link-list">' + a.bodiesOfWork.map(function (b) {
        return "<li><span>" + esc(b.name) + "</span><span class=\"li-source\">" + esc(b.year || "") + "</span></li>";
      }).join("") + "</ul>") : "";

    view.innerHTML =
      '<button class="back-btn" id="backBtn">' + t("back") + "</button>" +
      hero + statement + curiosity + biography + bodies + section(t("fMovement"), (a.movements || []).length
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
    var html = '<button class="chip" data-clear>' + t("all") + "</button>";
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
    var pt = LANG === "pt";
    var a = currentArtist();
    if (a) {
      var p = [];
      p.push(a.name + ".");
      if (a.nationality) p.push(a.nationality + (pt ? ", artista." : " artist."));
      var bio = [];
      if (a.bornDate) bio.push((pt ? "Nascido em " : "Born ") + a.bornDate + (a.bornPlace ? (pt ? " em " : " in ") + a.bornPlace : ""));
      if (a.livesIn) bio.push((pt ? "vive e trabalha em " : "lives and works in ") + a.livesIn);
      if (bio.length) p.push(bio.join("; ") + ".");
      if (a.movements && a.movements.length) p.push((pt ? "Associado a " : "Associated with ") + joinList(a.movements) + ".");
      if (a.mediums && a.mediums.length) p.push((pt ? "Trabalha com " : "Works in ") + joinList(a.mediums) + ".");
      var stmt = L(a, "artStatement");
      if (stmt) p.push((pt ? "Declaração do artista. " : "Artist statement. ") + stmt);
      var curio = L(a, "curiosity");
      if (curio) p.push((pt ? "Você sabia? " : "Did you know? ") + curio);
      var bioArr = bioOf(a);
      if (bioArr && bioArr.length) {
        p.push(pt ? "Biografia." : "Biography.");
        bioArr.forEach(function (b) {
          if (b.heading) p.push(b.heading + ".");
          if (b.text) p.push(String(b.text).replace(/\s+/g, " ").trim());
        });
      }
      if (a.bodiesOfWork && a.bodiesOfWork.length) {
        p.push((pt ? "Conjuntos de obras: " : "Bodies of work: ") +
          joinList(a.bodiesOfWork.map(function (b) { return b.name + (b.year ? " (" + b.year + ")" : ""); })) + ".");
      } else if (a.series && a.series.length) {
        p.push((pt ? "Conjuntos de obras incluem " : "Bodies of work include ") + joinList(a.series.map(function (s) { return s.name; })) + ".");
      }
      if (a.galleries && a.galleries.length) p.push((pt ? "Representado por " : "Represented by ") + joinList(a.galleries.map(function (g) { return g.name; })) + ".");
      return p.join(" ");
    }
    var results = filtered();
    if (!results.length) return pt ? "Nenhum artista encontrado. Tente outra busca." : "No artists found. Try a different search.";
    var intro = (pt ? "Mostrando " : "Showing ") + results.length + " " +
      (results.length === 1 ? t("artist1") : t("artistN")) + ". ";
    return intro + results.map(function (r) {
      return r.name + (r.nationality ? ", " + r.nationality : "") +
        (r.movements && r.movements.length ? (pt ? ", conhecido por " : ", known for ") + joinList(r.movements) : "") + ".";
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
    readBtn.querySelector(".ra-label").textContent = speaking ? t("stop") : t("readAloud");
  }

  // Chrome silently stops speaking after ~15s; a periodic pause/resume resets
  // its internal timer so long readings play to the end.
  var keepAlive = null;
  function stopKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }

  function stopRead() {
    if (!speechOK) return;
    stopKeepAlive();
    window.speechSynthesis.cancel();
    setReadState(false);
  }

  // Speak chunks one at a time: only one utterance is queued at a time, which
  // avoids the browser bug where a long queue is dropped part-way through.
  function speakChunks(chunks) {
    var synth = window.speechSynthesis, i = 0;
    function next() {
      if (i >= chunks.length) { stopKeepAlive(); setReadState(false); return; }
      var u = new SpeechSynthesisUtterance(chunks[i++]);
      u.lang = LANG === "pt" ? "pt-BR" : "en-US";
      u.rate = 1; u.pitch = 1;
      u.onend = next;
      u.onerror = function () { stopKeepAlive(); setReadState(false); };
      synth.speak(u);
    }
    next();
  }

  function toggleRead() {
    if (!speechOK) return;
    var synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) { stopRead(); return; }
    var text = buildNarration();
    if (!text) return;
    synth.cancel();
    setReadState(true);
    stopKeepAlive();
    keepAlive = setInterval(function () { if (synth.speaking) { synth.pause(); synth.resume(); } }, 10000);
    speakChunks(chunkText(text));
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
    var langToggle = document.getElementById("langToggle");
    if (langToggle) langToggle.addEventListener("click", switchLang);
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

  /* ---------- language toggle ---------- */

  function applyLang() {
    try { document.documentElement.lang = LANG === "pt" ? "pt-BR" : "en"; } catch (e) {}
    if (searchInput) searchInput.placeholder = t("searchPlaceholder");
    if (readBtn) { var lab = readBtn.querySelector(".ra-label"); if (lab) lab.textContent = t("readAloud"); }
    var lt = document.getElementById("langToggle");
    if (lt) {
      lt.textContent = LANG === "pt" ? "EN" : "PT";
      lt.setAttribute("aria-label", LANG === "pt" ? "Switch to English" : "Mudar para português");
    }
  }

  function switchLang() {
    stopRead();
    setLang(LANG === "pt" ? "en" : "pt");
    applyLang();
    buildChips();
    route();
  }

  /* ---------- init ---------- */

  function start(data) {
    ARTISTS = data;
    if (speechOK) readBtn.hidden = false;
    applyLang();
    buildChips();
    bindEvents();
    route();
  }

  function fail(msg) {
    view.innerHTML = '<div class="empty"><h2>' + (LANG === "pt" ? "Não foi possível carregar os dados" : "Could not load artist data") + "</h2><p>" + esc(msg) +
      '</p><p>Run a local server in the project folder, e.g. <code>python3 -m http.server</code>, ' +
      'then open <code>http://localhost:8000</code>.</p></div>';
  }

  fetch("data/artists.json")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(start)
    .catch(function (err) { fail(err.message || String(err)); });
})();
