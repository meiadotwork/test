import {
  bearing,
  destination,
  distance,
  length,
  lineIntersect,
  lineString,
  point,
} from "@turf/turf";

import type { Coordinate, Gate, TrackPoint } from "@/models/track";

/** Total length of a route in meters. */
export function routeDistanceMeters(coords: Coordinate[]): number {
  if (coords.length < 2) return 0;
  return length(lineString(coords), { units: "meters" });
}

/**
 * Build a gate (a short line perpendicular to the route) at the start or finish.
 * The gate is centered on the endpoint and extends `halfWidthMeters` to each side,
 * so it reliably catches a GPS segment that passes through, even with some drift.
 */
export function buildGate(
  coords: Coordinate[],
  at: "start" | "finish",
  halfWidthMeters = 12
): Gate {
  if (coords.length < 2) {
    throw new Error("Need at least two coordinates to build a gate");
  }
  const [anchor, neighbor] =
    at === "start"
      ? [coords[0], coords[1]]
      : [coords[coords.length - 1], coords[coords.length - 2]];

  const routeBearing = bearing(point(anchor), point(neighbor));
  const left = routeBearing + 90;
  const right = routeBearing - 90;
  const km = halfWidthMeters / 1000;

  const a = destination(point(anchor), km, left, { units: "kilometers" })
    .geometry.coordinates as Coordinate;
  const b = destination(point(anchor), km, right, { units: "kilometers" })
    .geometry.coordinates as Coordinate;
  return [a, b];
}

export interface Crossing {
  /** Index of the first point of the segment that crossed the gate. */
  index: number;
  point: Coordinate;
  /** Interpolated epoch ms at which the gate was crossed. */
  t: number;
}

export interface CrossingOptions {
  /** Ignore a crossing that happens within this many ms of the previous one. */
  minGapMs?: number;
}

/**
 * Walk a recorded path and return every time it crosses the gate, with the
 * crossing time interpolated along the crossing segment. Consecutive crossings
 * closer than `minGapMs` are debounced (GPS jitter near the line).
 */
export function findCrossings(
  points: TrackPoint[],
  gate: Gate,
  { minGapMs = 5000 }: CrossingOptions = {}
): Crossing[] {
  const gateLine = lineString([gate[0], gate[1]]);
  const crossings: Crossing[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const seg = lineString([
      [p0.lng, p0.lat],
      [p1.lng, p1.lat],
    ]);
    const hits = lineIntersect(seg, gateLine);
    if (hits.features.length === 0) continue;

    const hit = hits.features[0].geometry.coordinates as Coordinate;
    const segLen = distance(point([p0.lng, p0.lat]), point([p1.lng, p1.lat]), {
      units: "meters",
    });
    const toHit = distance(point([p0.lng, p0.lat]), point(hit), {
      units: "meters",
    });
    const frac = segLen === 0 ? 0 : Math.min(1, toHit / segLen);
    const t = Math.round(p0.t + frac * (p1.t - p0.t));

    const last = crossings[crossings.length - 1];
    if (last && t - last.t < minGapMs) continue;
    crossings.push({ index: i, point: hit, t });
  }
  return crossings;
}

export interface LapResult {
  /** Lap durations in ms, in order. */
  laps: number[];
  /** Fastest lap in ms, or null if no full lap was completed. */
  bestLapMs: number | null;
}

/**
 * Flying-start circuit timing: the clock starts on the first gate crossing and
 * each subsequent crossing completes a lap. Returns every lap plus the best.
 */
export function lapsFromCrossings(crossings: Crossing[]): LapResult {
  const laps: number[] = [];
  for (let i = 1; i < crossings.length; i++) {
    laps.push(crossings[i].t - crossings[i - 1].t);
  }
  return {
    laps,
    bestLapMs: laps.length ? Math.min(...laps) : null,
  };
}

/**
 * Staged-start circuit timing: the clock starts at `greenT` (lights go green),
 * the first crossing closes lap 1, and later crossings close further laps.
 */
export function stagedLapsFromCrossings(
  crossings: Crossing[],
  greenT: number
): LapResult {
  if (crossings.length === 0) return { laps: [], bestLapMs: null };
  const laps: number[] = [crossings[0].t - greenT];
  for (let i = 1; i < crossings.length; i++) {
    laps.push(crossings[i].t - crossings[i - 1].t);
  }
  return { laps, bestLapMs: Math.min(...laps) };
}

/**
 * Linear timing. For a flying start, time runs from the first start-gate crossing
 * to the next finish-gate crossing. For a staged start, pass `greenT` and time
 * runs from green to the first finish-gate crossing. Returns ms, or null if the
 * run never finished.
 */
export function linearDurationMs(
  points: TrackPoint[],
  startGate: Gate,
  finishGate: Gate,
  opts: { minGapMs?: number; greenT?: number } = {}
): number | null {
  const finishes = findCrossings(points, finishGate, opts);
  if (finishes.length === 0) return null;

  if (opts.greenT != null) {
    return finishes[0].t - opts.greenT;
  }

  const starts = findCrossings(points, startGate, opts);
  if (starts.length === 0) return null;
  const startT = starts[0].t;
  const finish = finishes.find((f) => f.t > startT);
  return finish ? finish.t - startT : null;
}

/** Whether a position is within `radiusMeters` of a target coordinate. */
export function isWithin(
  pos: Coordinate,
  target: Coordinate,
  radiusMeters: number
): boolean {
  return distance(point(pos), point(target), { units: "meters" }) <= radiusMeters;
}

/** Format a duration in ms as m:ss.mmm — handy for the timer and PB display. */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(ms % 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}
