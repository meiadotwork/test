import {
  decodeTrack,
  deepLinkToPayload,
  encodeTrack,
  toSharedTrack,
  trackToDeepLink,
  trackToGpx,
} from "@/lib/share";
import type { Track } from "@/models/track";

const TRACK: Track = {
  id: "t1",
  name: "Riverside <Loop> & Sprint",
  mode: "bike",
  type: "circuit",
  createdAt: "2026-06-24T10:00:00.000Z",
  coordinates: [
    [-122.4, 37.7],
    [-122.39, 37.71],
    [-122.4, 37.7],
  ],
  startGate: [
    [-122.401, 37.7],
    [-122.399, 37.7],
  ],
  distanceMeters: 1234.5,
  thumbnailUrl: "https://example.com/thumb.png",
};

describe("toSharedTrack", () => {
  it("strips the cached thumbnail and tags the version", () => {
    const shared = toSharedTrack(TRACK);
    expect(shared.v).toBe(1);
    expect("thumbnailUrl" in shared.track).toBe(false);
  });
});

describe("encode/decode round trip", () => {
  it("preserves the track through encode → decode", () => {
    const payload = encodeTrack(TRACK);
    const decoded = decodeTrack(payload);
    expect(decoded.track.id).toBe(TRACK.id);
    expect(decoded.track.name).toBe(TRACK.name);
    expect(decoded.track.coordinates).toEqual(TRACK.coordinates);
  });

  it("produces a URL-safe payload (no +, /, =)", () => {
    const payload = encodeTrack(TRACK);
    expect(payload).not.toMatch(/[+/=]/);
  });

  it("throws on a malformed payload", () => {
    expect(() => decodeTrack("not-base64-!!!")).toThrow();
  });
});

describe("deep links", () => {
  it("builds a link and recovers the payload", () => {
    const link = trackToDeepLink(TRACK);
    expect(link.startsWith("raceline://track?d=")).toBe(true);
    const payload = deepLinkToPayload(link);
    expect(payload).not.toBeNull();
    expect(decodeTrack(payload!).track.id).toBe(TRACK.id);
  });

  it("returns null for a link without a payload", () => {
    expect(deepLinkToPayload("raceline://track")).toBeNull();
  });
});

describe("trackToGpx", () => {
  it("emits valid-looking GPX with escaped names and all points", () => {
    const gpx = trackToGpx(TRACK);
    expect(gpx).toContain('<gpx version="1.1"');
    expect(gpx).toContain("Riverside &lt;Loop&gt; &amp; Sprint");
    expect((gpx.match(/<trkpt /g) ?? []).length).toBe(TRACK.coordinates.length);
  });
});
