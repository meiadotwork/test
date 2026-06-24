import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import type { TrackPoint } from "@/models/track";

export const BG_LOCATION_TASK = "raceline-bg-location";

/** Convert an expo-location reading into our TrackPoint shape. */
export function toTrackPoint(loc: Location.LocationObject): TrackPoint {
  return {
    lng: loc.coords.longitude,
    lat: loc.coords.latitude,
    t: loc.timestamp,
  };
}

/** Ask for foreground (and, when possible, background) location permission. */
export async function requestLocationPermission(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return false;
  // Background is best-effort; recording still works in the foreground without it.
  try {
    await Location.requestBackgroundPermissionsAsync();
  } catch {
    /* ignore — foreground is sufficient for an MVP race session */
  }
  return true;
}

export type PositionCallback = (point: TrackPoint) => void;

/**
 * Stream high-accuracy positions to `onPoint` while recording or racing.
 * Returns a function that stops the stream.
 */
export async function watchPosition(
  onPoint: PositionCallback
): Promise<() => void> {
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 2,
    },
    (loc) => onPoint(toTrackPoint(loc))
  );
  return () => sub.remove();
}

// --- Background tracking (keeps recording when the screen locks) -------------

let bgBuffer: TrackPoint[] = [];

TaskManager.defineTask(BG_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = (data as { locations?: Location.LocationObject[] }) ?? {};
  if (locations) bgBuffer.push(...locations.map(toTrackPoint));
});

export async function startBackgroundTracking(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK).catch(
    () => false
  );
  if (started) return;
  await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 2,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "RaceLine is recording",
      notificationBody: "Tracking your route while you race.",
    },
  });
}

/** Stop background updates and drain the points captured while in the background. */
export async function stopBackgroundTracking(): Promise<TrackPoint[]> {
  const started = await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK).catch(
    () => false
  );
  if (started) await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
  const points = bgBuffer;
  bgBuffer = [];
  return points;
}
