import Constants from "expo-constants";

import type { Coordinate, Mode } from "@/models/track";

export const MAPBOX_TOKEN: string =
  (Constants.expoConfig?.extra?.mapboxAccessToken as string) ?? "";

/** Mapbox routing profile for each travel mode. */
const PROFILE: Record<Mode, string> = {
  run: "walking",
  bike: "cycling",
  drive: "driving",
};

function ensureToken(): string {
  if (!MAPBOX_TOKEN) {
    throw new Error(
      "Missing Mapbox token. Set MAPBOX_ACCESS_TOKEN in .env (see .env.example)."
    );
  }
  return MAPBOX_TOKEN;
}

/**
 * Snap a raw GPS trace to the road/path network for the given mode using the
 * Map Matching API. Used for bike/drive so the saved route follows streets
 * (and one-way orientation for driving). Falls back to the input on failure.
 */
export async function snapToRoads(
  trace: Coordinate[],
  mode: Mode
): Promise<Coordinate[]> {
  if (mode === "run" || trace.length < 2) return trace;
  // Map Matching accepts at most 100 coordinates per request.
  const coords = trace.slice(0, 100);
  const path = coords.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url =
    `https://api.mapbox.com/matching/v5/mapbox/${PROFILE[mode]}/${path}` +
    `?geometries=geojson&overview=full&access_token=${ensureToken()}`;

  const res = await fetch(url);
  const json = await res.json();
  const matched = json?.matchings?.[0]?.geometry?.coordinates as
    | Coordinate[]
    | undefined;
  return matched && matched.length >= 2 ? matched : trace;
}

/**
 * Build a street-following route through ordered waypoints (used when the user
 * taps points on the map for bike/drive). Returns the detailed geometry.
 */
export async function routeThroughWaypoints(
  waypoints: Coordinate[],
  mode: Mode
): Promise<Coordinate[]> {
  if (waypoints.length < 2) return waypoints;
  const path = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/${PROFILE[mode]}/${path}` +
    `?geometries=geojson&overview=full&access_token=${ensureToken()}`;

  const res = await fetch(url);
  const json = await res.json();
  const geom = json?.routes?.[0]?.geometry?.coordinates as
    | Coordinate[]
    | undefined;
  return geom && geom.length >= 2 ? geom : waypoints;
}

export interface StaticMapOptions {
  width?: number;
  height?: number;
  retina?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
}

/**
 * A Mapbox Static Images URL that renders the route as an overlaid line, auto-fit
 * to the track bounds. Used for list/detail thumbnails — "map images of where you are".
 */
export function staticMapUrl(
  coordinates: Coordinate[],
  {
    width = 600,
    height = 400,
    retina = true,
    strokeColor = "f43f5e",
    strokeWidth = 4,
  }: StaticMapOptions = {}
): string {
  if (coordinates.length === 0) return "";
  const geojson = {
    type: "Feature",
    properties: { stroke: `#${strokeColor}`, "stroke-width": strokeWidth },
    geometry: { type: "LineString", coordinates },
  };
  const overlay = `geojson(${encodeURIComponent(JSON.stringify(geojson))})`;
  const size = `${width}x${height}${retina ? "@2x" : ""}`;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/` +
    `${overlay}/auto/${size}?padding=40&access_token=${ensureToken()}`
  );
}
