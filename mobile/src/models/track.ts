/** A single GPS coordinate as [longitude, latitude] (GeoJSON order). */
export type Coordinate = [number, number];

/** A timestamped position captured while recording or racing. */
export interface TrackPoint {
  lng: number;
  lat: number;
  /** epoch milliseconds */
  t: number;
}

/** Travel mode — determines how a route is snapped to the map. */
export type Mode = "run" | "bike" | "drive";

/** Track shape. */
export type TrackType = "circuit" | "linear";

/** How the clock starts when racing a track. */
export type StartMode = "staged" | "flying";

/**
 * A short line segment used to detect when the athlete passes the start (and,
 * for a circuit, the finish, which is the same place). Stored as two endpoints.
 */
export type Gate = [Coordinate, Coordinate];

export interface BestTime {
  id: string;
  trackId: string;
  durationMs: number;
  /** ISO date string */
  date: string;
  /** Per-lap splits in ms (circuits); a single entry for linear tracks. */
  splits?: number[];
}

export interface Track {
  id: string;
  name: string;
  mode: Mode;
  type: TrackType;
  /** ISO date string */
  createdAt: string;
  /** Ordered route line — snapped for bike/drive, raw trace for run. */
  coordinates: Coordinate[];
  /** Start/finish gate (circuit) or start gate (linear). */
  startGate: Gate;
  /** Finish gate for linear tracks; omitted for circuits (start == finish). */
  finishGate?: Gate;
  distanceMeters: number;
  /** Cached Mapbox Static Images URL for the list/detail thumbnail. */
  thumbnailUrl?: string;
}

/** Wire format for sharing a track via link/file (version-tagged). */
export interface SharedTrack {
  v: 1;
  track: Omit<Track, "thumbnailUrl">;
}
