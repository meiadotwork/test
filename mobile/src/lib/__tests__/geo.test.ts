import {
  buildGate,
  findCrossings,
  formatDuration,
  isWithin,
  lapsFromCrossings,
  linearDurationMs,
  routeDistanceMeters,
  stagedLapsFromCrossings,
} from "@/lib/geo";
import type { Coordinate, TrackPoint } from "@/models/track";

// A short straight east–west route near the equator. ~0.001 deg lon ≈ 111 m.
const ROUTE: Coordinate[] = [
  [0, 0],
  [0.001, 0],
  [0.002, 0],
];

describe("routeDistanceMeters", () => {
  it("returns 0 for a degenerate route", () => {
    expect(routeDistanceMeters([[0, 0]])).toBe(0);
  });

  it("measures a ~222 m straight route", () => {
    const d = routeDistanceMeters(ROUTE);
    expect(d).toBeGreaterThan(200);
    expect(d).toBeLessThan(240);
  });
});

describe("buildGate", () => {
  it("builds a perpendicular gate that straddles the start point", () => {
    const gate = buildGate(ROUTE, "start", 12);
    // Route runs east–west, so a perpendicular gate runs north–south:
    // both endpoints share ~the same longitude (the start) with opposite lat.
    expect(gate[0][0]).toBeCloseTo(0, 4);
    expect(gate[1][0]).toBeCloseTo(0, 4);
    expect(Math.sign(gate[0][1])).toBe(-Math.sign(gate[1][1]));
  });

  it("throws when there are too few points", () => {
    expect(() => buildGate([[0, 0]], "start")).toThrow();
  });
});

/** Build a path that drives east, crossing x=0.001 once per "lap". */
function pathThrough(xs: number[], startT = 0, stepMs = 10_000): TrackPoint[] {
  return xs.map((x, i) => ({ lng: x, lat: 0, t: startT + i * stepMs }));
}

describe("findCrossings", () => {
  it("detects a single crossing and interpolates the time", () => {
    const gate = buildGate(ROUTE, "start"); // gate at x=0
    const pts = pathThrough([-0.0005, 0.0005], 0, 10_000); // crosses x=0 mid-segment
    const crossings = findCrossings(pts, gate, { minGapMs: 0 });
    expect(crossings).toHaveLength(1);
    // Midpoint of the segment in time ≈ 5000 ms.
    expect(crossings[0].t).toBeGreaterThan(3000);
    expect(crossings[0].t).toBeLessThan(7000);
  });

  it("debounces crossings closer than minGapMs", () => {
    const gate = buildGate(ROUTE, "start");
    // Wobble back and forth across x=0 quickly.
    const pts = pathThrough([-0.0005, 0.0005, -0.0005, 0.0005], 0, 1000);
    const debounced = findCrossings(pts, gate, { minGapMs: 5000 });
    const raw = findCrossings(pts, gate, { minGapMs: 0 });
    expect(raw.length).toBeGreaterThan(debounced.length);
    expect(debounced).toHaveLength(1);
  });
});

describe("lap timing", () => {
  it("computes flying-start laps and best lap", () => {
    const crossings = [
      { index: 0, point: [0, 0] as Coordinate, t: 1000 },
      { index: 5, point: [0, 0] as Coordinate, t: 31_000 }, // 30s lap
      { index: 9, point: [0, 0] as Coordinate, t: 56_000 }, // 25s lap (best)
    ];
    const { laps, bestLapMs } = lapsFromCrossings(crossings);
    expect(laps).toEqual([30_000, 25_000]);
    expect(bestLapMs).toBe(25_000);
  });

  it("returns no best lap when fewer than two crossings", () => {
    expect(lapsFromCrossings([]).bestLapMs).toBeNull();
  });

  it("computes staged-start laps from a green-light time", () => {
    const crossings = [{ index: 3, point: [0, 0] as Coordinate, t: 20_000 }];
    const { laps, bestLapMs } = stagedLapsFromCrossings(crossings, 5000);
    expect(laps).toEqual([15_000]); // 20s crossing - 5s green
    expect(bestLapMs).toBe(15_000);
  });
});

describe("linearDurationMs", () => {
  const startGate = buildGate(ROUTE, "start"); // x=0
  const finishGate = buildGate(ROUTE, "finish"); // x=0.002

  it("times a flying start from start gate to finish gate", () => {
    const pts = pathThrough([-0.0005, 0.0005, 0.001, 0.0015, 0.0025], 0, 10_000);
    const ms = linearDurationMs(pts, startGate, finishGate, { minGapMs: 0 });
    expect(ms).not.toBeNull();
    expect(ms!).toBeGreaterThan(0);
  });

  it("times a staged start from the green light", () => {
    const pts = pathThrough([0.0015, 0.0025], 50_000, 10_000); // crosses finish
    const ms = linearDurationMs(pts, startGate, finishGate, {
      minGapMs: 0,
      greenT: 50_000,
    });
    expect(ms).not.toBeNull();
    expect(ms!).toBeGreaterThan(0);
  });

  it("returns null when the run never reaches the finish", () => {
    const pts = pathThrough([-0.0005, 0.0005], 0, 10_000);
    expect(linearDurationMs(pts, startGate, finishGate, { minGapMs: 0 })).toBeNull();
  });
});

describe("isWithin", () => {
  it("is true at the point and false far away", () => {
    expect(isWithin([0, 0], [0, 0], 10)).toBe(true);
    expect(isWithin([0, 0], [1, 0], 10)).toBe(false);
  });
});

describe("formatDuration", () => {
  it("formats minutes, seconds and millis", () => {
    expect(formatDuration(0)).toBe("0:00.000");
    expect(formatDuration(65_432)).toBe("1:05.432");
    expect(formatDuration(-5)).toBe("0:00.000");
  });
});
