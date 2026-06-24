import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { MapCanvas } from "@/components/MapCanvas";
import { ModeSelector } from "@/components/ModeSelector";
import { TrackTypeSelector } from "@/components/TrackTypeSelector";
import { buildGate, routeDistanceMeters } from "@/lib/geo";
import { newId } from "@/lib/id";
import { watchPosition, requestLocationPermission } from "@/lib/location";
import { snapToRoads, routeThroughWaypoints, staticMapUrl } from "@/lib/mapbox";
import { useAppStore } from "@/state/store";
import { colors } from "@/theme";
import type { Coordinate, Mode, Track, TrackPoint, TrackType } from "@/models/track";

type Method = "record" | "draw";

export default function CreateScreen() {
  const lastMode = useAppStore((s) => s.lastMode);
  const setLastMode = useAppStore((s) => s.setLastMode);
  const upsertTrack = useAppStore((s) => s.upsertTrack);

  const [mode, setMode] = useState<Mode>(lastMode);
  const [type, setType] = useState<TrackType>("circuit");
  const [method, setMethod] = useState<Method>("record");
  const [name, setName] = useState("");

  const [recording, setRecording] = useState(false);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [waypoints, setWaypoints] = useState<Coordinate[]>([]);
  const [drawnRoute, setDrawnRoute] = useState<Coordinate[]>([]);
  const [saving, setSaving] = useState(false);
  const stopFn = useRef<(() => void) | null>(null);

  useEffect(() => () => stopFn.current?.(), []);

  const recordedRoute: Coordinate[] = points.map((p) => [p.lng, p.lat]);
  const previewRoute = method === "record" ? recordedRoute : drawnRoute;

  async function toggleRecording() {
    if (recording) {
      stopFn.current?.();
      stopFn.current = null;
      setRecording(false);
      return;
    }
    const ok = await requestLocationPermission();
    if (!ok) {
      Alert.alert("Location needed", "Enable location to record a track.");
      return;
    }
    setPoints([]);
    setRecording(true);
    stopFn.current = await watchPosition((p) => setPoints((prev) => [...prev, p]));
  }

  async function addWaypoint(coord: Coordinate) {
    if (method !== "draw" || recording) return;
    const next = [...waypoints, coord];
    setWaypoints(next);
    if (next.length >= 2) {
      // Run = free path (walk anywhere); bike/drive follow streets.
      const route =
        mode === "run" ? next : await routeThroughWaypoints(next, mode);
      setDrawnRoute(route);
    }
  }

  function undoWaypoint() {
    const next = waypoints.slice(0, -1);
    setWaypoints(next);
    setDrawnRoute(next.length >= 2 ? next : []);
  }

  async function save() {
    let coords = previewRoute;
    // Snap a recorded bike/drive trace to the road network on save.
    if (method === "record" && mode !== "run" && coords.length >= 2) {
      coords = await snapToRoads(coords, mode);
    }
    if (coords.length < 2) {
      Alert.alert("Not enough points", "Record or draw at least two points.");
      return;
    }
    if (type === "circuit") {
      // Close the loop so start and finish line up.
      const [first] = coords;
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) coords = [...coords, first];
    }

    setSaving(true);
    try {
      const track: Track = {
        id: newId("trk_"),
        name: name.trim() || defaultName(mode, type),
        mode,
        type,
        createdAt: new Date().toISOString(),
        coordinates: coords,
        startGate: buildGate(coords, "start"),
        finishGate: type === "linear" ? buildGate(coords, "finish") : undefined,
        distanceMeters: routeDistanceMeters(coords),
        thumbnailUrl: safeThumb(coords),
      };
      setLastMode(mode);
      await upsertTrack(track);
      router.replace(`/track/${track.id}`);
    } finally {
      setSaving(false);
    }
  }

  const canSave = previewRoute.length >= 2 && !recording && !saving;

  return (
    <View style={styles.fill}>
      <View style={styles.mapWrap}>
        <MapCanvas
          mode={mode}
          route={previewRoute}
          waypoints={method === "draw" ? waypoints : []}
          followUser={method === "record"}
          onMapPress={addWaypoint}
        />
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <Text style={styles.label}>Mode</Text>
        <ModeSelector value={mode} onChange={setMode} />

        <Text style={styles.label}>Track shape</Text>
        <TrackTypeSelector value={type} onChange={setType} />

        <Text style={styles.label}>How to build it</Text>
        <View style={styles.row}>
          <SegBtn
            active={method === "record"}
            label="Record by moving"
            onPress={() => setMethod("record")}
          />
          <SegBtn
            active={method === "draw"}
            label="Tap on map"
            onPress={() => setMethod("draw")}
          />
        </View>

        {method === "record" ? (
          <Pressable
            style={[styles.action, recording ? styles.stop : styles.record]}
            onPress={toggleRecording}
          >
            <Text style={styles.actionText}>
              {recording
                ? `Stop · ${points.length} pts`
                : points.length
                  ? "Resume recording"
                  : "Start recording"}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.row}>
            <Text style={styles.hint}>
              Tap the map to drop points ({waypoints.length}).
            </Text>
            {waypoints.length > 0 && (
              <Pressable onPress={undoWaypoint}>
                <Text style={styles.undo}>Undo</Text>
              </Pressable>
            )}
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder={defaultName(mode, type)}
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Pressable
          style={[styles.save, !canSave && styles.disabled]}
          disabled={!canSave}
          onPress={save}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save track</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SegBtn({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.seg, active && { backgroundColor: colors.surfaceAlt, borderColor: colors.primary }]}
    >
      <Text style={[styles.segText, active && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function defaultName(mode: Mode, type: TrackType): string {
  const m = mode[0].toUpperCase() + mode.slice(1);
  return `${m} ${type === "circuit" ? "circuit" : "route"}`;
}

function safeThumb(coords: Coordinate[]): string | undefined {
  try {
    return staticMapUrl(coords);
  } catch {
    return undefined;
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  mapWrap: { height: "42%" },
  panel: { flex: 1 },
  panelContent: { padding: 16, gap: 10 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "700", marginTop: 6 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  seg: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  segText: { color: colors.textMuted, fontWeight: "700" },
  action: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  record: { backgroundColor: colors.primary },
  stop: { backgroundColor: colors.red },
  actionText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  hint: { color: colors.textMuted, flex: 1 },
  undo: { color: colors.primary, fontWeight: "700" },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  save: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  disabled: { opacity: 0.4 },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
