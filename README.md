# Artisearch — Artist Discovery Engine

A clean, modern, **static** search engine for discovering artists. Search by
name, movement, medium, or place, then open a full profile covering biography,
art statement, galleries, C.V., press, interviews, books, public collections,
upcoming shows, and all work organized by body of work & series — plus suggested
related artists.

No build step, no backend, no dependencies. Pure HTML / CSS / vanilla JS.

## Run it

Because the app loads `data/artists.json` with `fetch`, browsers block that over
`file://`. Serve the folder over HTTP:

```bash
python3 -m http.server
# then open http://localhost:8000
```

Any static host works too (GitHub Pages, Netlify, etc.) — just publish the repo
root.

## Project structure

```
index.html        # page shell: header, search bar, view container, lightbox
css/styles.css    # all styling (Inter + Fraunces fonts, responsive)
js/app.js         # data load, search/filter, profiles, related artists, routing
data/artists.json # the dataset — edit this to add/update artists
```

## Adding or editing an artist

Open `data/artists.json` and add an object to the array. Every field is optional
except `id` and `name`; empty sections are simply hidden.

```jsonc
{
  "id": "unique-slug",                // used in the URL (#artist/unique-slug)
  "name": "Artist Name",
  "pronunciation": "AR-tist naym",     // optional phonetic guide
  "pronouns": "she/her",               // optional
  "nationality": "Nationality",
  "bornDate": "March 22, 1929",        // when born
  "bornPlace": "City, Country",        // where born
  "livesIn": "City, Country",          // where they live & work
  "artStatement": "A paragraph…",
  "movements": ["Pop Art", "Minimalism"],
  "mediums": ["Painting", "Installation"],
  "website": "https://…",
  "instagram": "https://instagram.com/…",
  "email": "studio@example.com",
  "salesContact": "sales@example.com", // shown above the Work section
  "studio": { "location": "City", "visits": "Visit policy / note" },
  "headshots": [{ "src": "img/portrait.jpg", "credit": "Photo © …" }],
  "cv": { "url": "files/cv.pdf" },
  "education": ["Degree, School (year)"],
  "awards": ["Award (year)"],
  "galleries": [{ "name": "Gallery", "location": "City", "url": "https://…" }],
  "interviews": [{ "title": "…", "type": "video", "source": "…", "url": "https://youtu.be/…" }],
  "press": [{ "title": "…", "source": "…", "url": "https://…" }],
  "books": [{ "title": "…", "year": 2020, "publisher": "…", "url": "https://…" }],
  "publicCollections": ["Museum, City"],
  "pastExhibitions": [
    { "title": "Show", "venue": "Venue", "location": "City",
      "year": 2019, "type": "Solo", "url": "https://…" }
  ],
  "artFairs": [
    { "name": "Art Basel", "presentedBy": "Gallery", "location": "City",
      "year": 2025, "url": "https://…" }
  ],
  "upcomingShows": [
    { "title": "Show", "venue": "Venue", "location": "City",
      "startDate": "2026-09-10", "endDate": "2026-10-31", "url": "https://…" }
  ],
  "series": [
    { "name": "Series Name", "year": "2010–present", "description": "…",
      "works": [
        { "title": "Work", "year": 2014, "medium": "Oil on canvas",
          "dimensions": "100 × 120 cm", "image": "img/work.jpg",
          "price": "Price on request", "status": "Available" }
      ]
    }
  ],
  "relatedArtists": ["other-artist-id"]  // optional; omit to auto-suggest
}
```

### Notes

- **`type`** on an interview must be `"video"` or `"written"` (controls the badge).
  Video interviews with a **YouTube or Vimeo** URL are embedded and play inline;
  anything else falls back to a link.
- **Work `status`** containing "available" renders a green badge, "sold" a red one;
  any other value (e.g. "Museum collection") gets a neutral badge. `price` is shown
  beneath the work and in the lightbox caption.
- **`pastExhibitions[].type`** is a free label (e.g. "Solo", "Group").
- **Dates** for shows should be ISO `YYYY-MM-DD` so they format nicely.
- **Images** — leave any `src`/`image` empty (`""`) and the app draws a tasteful
  generated placeholder, so everything renders even before you add real photos.
  Drop real files into an `img/` folder and reference them by relative path, or use
  a remote URL.
  - The seeded data uses **real, freely-licensed portraits** from Wikimedia Commons
    (CC BY) for Yayoi Kusama and Julie Mehretu, with attribution in each headshot's
    `credit`. El Anatsui keeps a placeholder — no freely-licensed portrait was
    available.
  - **Artworks are intentionally left as placeholders.** These artists' works are
    under copyright, so they can't be embedded from a free source. Add your own
    licensed images (or images you have rights to) via each work's `image` field.
- **Related artists** — if `relatedArtists` is omitted, suggestions are computed
  automatically from shared movements and mediums.

The dataset ships with three fully populated sample artists so you can see every
section in action.
