/* Artisearch configuration.
 *
 * proxyBase: the URL of your deployed Artsy proxy (see proxy/ and the README
 * section "Live data via Artsy"). When set, searching for an artist who is NOT
 * in data/artists.json falls back to live results from Artsy.
 *
 * Leave it as "" to disable live search (the site then uses only the curated
 * dataset). Example once deployed:
 *   proxyBase: "https://artisearch-artsy.YOURNAME.workers.dev"
 */
window.ARTISEARCH = {
  proxyBase: ""
};
