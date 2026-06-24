import { decode, encode } from "js-base64";

import type { SharedTrack, Track } from "@/models/track";

const SCHEME = "raceline";

/** Pack a track into the versioned wire object (drops the cached thumbnail). */
export function toSharedTrack(track: Track): SharedTrack {
  const { thumbnailUrl: _thumbnailUrl, ...rest } = track;
  return { v: 1, track: rest };
}

/** URL-safe base64 of the UTF-8 JSON, usable in a deep link or QR code. */
export function encodeTrack(track: Track): string {
  const json = JSON.stringify(toSharedTrack(track));
  return encode(json, /* urlsafe */ true);
}

/** Inverse of {@link encodeTrack}. Throws if the payload is malformed. */
export function decodeTrack(payload: string): SharedTrack {
  const json = decode(payload);
  const parsed = JSON.parse(json) as SharedTrack;
  if (parsed.v !== 1 || !parsed.track || !Array.isArray(parsed.track.coordinates)) {
    throw new Error("Unrecognized track payload");
  }
  return parsed;
}

/** A deep link other devices can open to import the track. */
export function trackToDeepLink(track: Track): string {
  return `${SCHEME}://track?d=${encodeTrack(track)}`;
}

/** Extract the encoded payload from a deep link, or null if it isn't one. */
export function deepLinkToPayload(url: string): string | null {
  const match = url.match(/[?&]d=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Export a track as GPX 1.1 for interop with other apps (Strava, Garmin, …). */
export function trackToGpx(track: Track): string {
  const pts = track.coordinates
    .map(([lng, lat]) => `      <trkpt lat="${lat}" lon="${lng}"></trkpt>`)
    .join("\n");
  const name = escapeXml(track.name);
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RaceLine" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${name}</name>
    <time>${track.createdAt}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <type>${track.mode}</type>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
