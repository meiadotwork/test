/**
 * Artisearch → Artsy proxy (Cloudflare Worker)
 *
 * Why this exists: the Artsy API authenticates with a client_id + client_secret
 * that must NEVER be shipped in a static site, and Artsy's API is not CORS-enabled
 * for direct browser use. This Worker holds the secret, fetches & caches the weekly
 * XAPP token, calls Artsy server-side, and returns clean, CORS-friendly JSON shaped
 * exactly the way the Artisearch frontend expects.
 *
 * Endpoints:
 *   GET /api/search?q=NAME      -> [{ id, name, nationality, thumb }]
 *   GET /api/artist?id=SLUG     -> full normalized artist profile
 *
 * Setup (see README "Live data via Artsy"):
 *   wrangler secret put ARTSY_CLIENT_ID
 *   wrangler secret put ARTSY_CLIENT_SECRET
 *   (optional) set ALLOWED_ORIGIN to your Pages origin, e.g.
 *       https://meiadotwork.github.io
 */

const ARTSY = "https://api.artsy.net/api";

// XAPP token cached in the isolate's memory between requests.
let tokenCache = { token: null, expires: 0 };

async function getToken(env) {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expires - 60_000 > now) return tokenCache.token;
  const url = `${ARTSY}/tokens/xapp_token?client_id=${encodeURIComponent(env.ARTSY_CLIENT_ID)}&client_secret=${encodeURIComponent(env.ARTSY_CLIENT_SECRET)}`;
  const r = await fetch(url, { method: "POST" });
  if (!r.ok) throw new Error(`xapp_token failed: ${r.status}`);
  const data = await r.json();
  tokenCache = { token: data.token, expires: new Date(data.expires_at).getTime() };
  return tokenCache.token;
}

async function artsy(path, env) {
  const token = await getToken(env);
  const r = await fetch(`${ARTSY}${path}`, { headers: { "X-Xapp-Token": token, Accept: "application/json" } });
  if (!r.ok) throw new Error(`Artsy ${path} -> ${r.status}`);
  return r.json();
}

const idFromHref = (href) => (href || "").split("/").filter(Boolean).pop() || "";

// Artsy image links are templated with {image_version}; pick a concrete size.
function imageUrl(links, version) {
  const tmpl = links && links.image && links.image.href;
  if (tmpl) return tmpl.replace("{image_version}", version || "large");
  return (links && links.thumbnail && links.thumbnail.href) || "";
}

async function search(q, env) {
  const data = await artsy(`/search?q=${encodeURIComponent(q)}&size=12`, env);
  const results = (data._embedded && data._embedded.results) || [];
  return results
    .filter((r) => (r.type || r.og_type) === "artist")
    .map((r) => ({
      id: idFromHref(r._links && r._links.self && r._links.self.href),
      name: r.title,
      nationality: r.description || "",
      thumb: (r._links && r._links.thumbnail && r._links.thumbnail.href) || "",
    }))
    .filter((a) => a.id);
}

async function artist(id, env) {
  const a = await artsy(`/artists/${encodeURIComponent(id)}`, env);
  const links = a._links || {};

  // Parallel sub-resources; tolerate any individual failure.
  const safe = (p) => artsy(p, env).catch(() => null);
  const [artworksRes, genesRes, similarRes, showsRes] = await Promise.all([
    safe(`/artworks?artist_id=${id}&size=15`),
    safe(`/genes?artist_id=${id}&size=12`),
    safe(`/artists?similar_to_artist_id=${id}&size=6`),
    safe(`/shows?artist_id=${id}&status=upcoming&size=8`),
  ]);

  const works = (((artworksRes || {})._embedded || {}).artworks || []).map((w) => ({
    title: w.title || "Untitled",
    year: w.date || "",
    medium: w.medium || "",
    dimensions: (w.dimensions && ((w.dimensions.cm && w.dimensions.cm.text) || (w.dimensions.in && w.dimensions.in.text))) || "",
    image: imageUrl(w._links, "large"),
  }));

  const movements = (((genesRes || {})._embedded || {}).genes || []).map((g) => g.name).filter(Boolean);

  const relatedArtists = (((similarRes || {})._embedded || {}).artists || []).map((s) => ({
    id: idFromHref(s._links && s._links.self && s._links.self.href),
    name: s.name,
    nationality: s.nationality || "",
    thumb: imageUrl(s._links, "square"),
  })).filter((s) => s.id);

  const upcomingShows = (((showsRes || {})._embedded || {}).shows || []).map((s) => ({
    title: s.name || "Untitled show",
    venue: "",
    location: (s.location && (s.location.city || s.location.address)) || "",
    startDate: s.start_at || "",
    endDate: s.end_at || "",
    url: (s._links && s._links.permalink && s._links.permalink.href) || "",
  }));

  return {
    id: a.id || id,
    name: a.name,
    nationality: a.nationality || "",
    bornDate: a.birthday || "",
    bornPlace: a.hometown || "",
    livesIn: a.location || "",
    artStatement: a.blurb || a.biography || "",
    movements,
    mediums: [],
    website: (links.permalink && links.permalink.href) || "",
    headshots: [{ src: imageUrl(links, "large"), credit: "Image via Artsy" }],
    series: works.length ? [{ name: "Selected Works", year: "", description: "Works from the Artsy catalogue.", works }] : [],
    upcomingShows,
    relatedArtists,
    _source: "artsy",
  };
}

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=86400",
  };
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });

    const url = new URL(request.url);
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });

    try {
      if (url.pathname === "/api/search") {
        const q = (url.searchParams.get("q") || "").trim();
        if (q.length < 2) return json([]);
        return json(await search(q, env));
      }
      if (url.pathname === "/api/artist") {
        const id = (url.searchParams.get("id") || "").trim();
        if (!id) return json({ error: "missing id" }, 400);
        return json(await artist(id, env));
      }
      return json({ error: "not found", endpoints: ["/api/search?q=", "/api/artist?id="] }, 404);
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err) }, 502);
    }
  },
};
