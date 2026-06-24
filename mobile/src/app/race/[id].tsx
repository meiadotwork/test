import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { MapCanvas } from "@/components/MapCanvas";
import { StartLights } from "@/components/StartLights";
import { Timer } from "@/components/Timer";
import { addBestTime, getPersonalBest, getTrack } from "@/lib/db";
import {
  findCrossings,
  formatDuration,
  lapsFromCrossings,
  linearDurationMs,
  stagedLapsFromCrossings,
} from "@/lib/geo";
import { newId } from "@/lib/id";
import { requestLocationPermission, watchPosition } from "@/lib/location";
import { colors } from "@/theme";
import type { BestTime, Track, TrackPoint } from "@/models/track";

type StartMode = "staged" | "flying";
type Phase = "select" | "staging" | "running" | "done";

const MIN_GAP_MS = 4000; // debounce gate crossings against GPS jitter

export default function RaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [track, setTrack] = useState<Track | null>(null);
  const [pb, setPb] = useState<BestTime | null>(null);

  const [startMode, setStartMode] = useState<StartMode>("flying");
  const [phase, setPhase] = useState<Phase>("select");
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [now, setNow] = useState(Date.now());

  const [greenT, setGreenT] = useState<number | null>(null);
  const [lastLap, setLastLap] = useState<number | null>(null);
  const [bestLap, setBestLap] = useState<number | null>(null);
  const [finishMs, setFinishMs] = useState<number | null>(null);

  const stopFn = useRef<(() => void) | null>(null);
  const t0Ref = useRef<number | null>(null); // race clock origin
  const lapBaseRef = useRef<number | null>(null); // current lap origin
  const savedLapsRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    (async () => {
      setTrack(await getTrack(id));
      setPb(await getPersonalBest(id));
    })();
    return () => stopFn.current?.();
  }, [id]);

  // Drive the on-screen clock while racing.
  useEffect(() => {
    if (phase !== "running") return;
    const iv = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(iv);
  }, [phase]);

  // Re-evaluate laps / finish whenever a new position arrives.
  useEffect(() => {
    if (phase !== "running" || !track) return;
    const isCircuit = track.type === "circuit";

    if (startMode === "staged" && greenT != null) {
      t0Ref.current = greenT;
    } else if (startMode === "flying") {
      const starts = findCrossings(points, track.startGate, { minGapMs: MIN_GAP_MS });
      t0Ref.current = starts[0]?.t ?? null;
    }

    if (isCircuit) {
      const crossings = findCrossings(points, track.startGate, { minGapMs: MIN_GAP_MS });
      const { laps } =
        startMode === "staged" && greenT != null
          ? stagedLapsFromCrossings(crossings, greenT)
          : lapsFromCrossings(crossings);

      // Persist any newly-completed laps.
      for (let i = savedLapsRef.current; i < laps.length; i++) {
        void persistTime(laps[i]);
      }
      if (laps.length > savedLapsRef.current) {
        savedLapsRef.current = laps.length;
        setLastLap(laps[laps.length - 1]);
        setBestLap((b) => (b == null ? Math.min(...laps) : Math.min(b, ...laps)));
      }
      // Base for the in-progress lap clock.
      lapBaseRef.current =
        crossings[crossings.length - 1]?.t ??
        (startMode === "staged" ? greenT : t0Ref.current) ??
        null;
    } else if (track.finishGate && !finishedRef.current) {
      const dur = linearDurationMs(points, track.startGate, track.finishGate, {
        minGapMs: MIN_GAP_MS,
        greenT: startMode === "staged" && greenT != null ? greenT : undefined,
      });
      if (dur != null) {
        finishedRef.current = true;
        setFinishMs(dur);
        void persistTime(dur);
        finishRace();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  async function persistTime(durationMs: number) {
    const bt: BestTime = {
      id: newId("bt_"),
      trackId: id,
      durationMs,
      date: new Date().toISOString(),
    };
    await addBestTime(bt);
  }

  async function beginGps() {
    const ok = await requestLocationPermission();
    if (!ok) {
      Alert.alert("Location needed", "Enable location to race.");
      return false;
    }
    setPoints([]);
    stopFn.current = await watchPosition((p) => setPoints((prev) => [...prev, p]));
    return true;
  }

  async function arm() {
    finishedRef.current = false;
    savedLapsRef.current = 0;
    t0Ref.current = null;
    lapBaseRef.current = null;
    setLastLap(null);
    setBestLap(null);
    setFinishMs(null);
    setGreenT(null);

    if (!(await beginGps())) return;

    if (startMode === "staged") {
      setPhase("staging"); // StartLights runs, then onGreen → running
    } else {
      setPhase("running"); // clock starts when you cross the start line
    }
  }

  function onGreen(t: number) {
    setGreenT(t);
    t0Ref.current = t;
    lapBaseRef.current = t;
    setPhase("running");
  }

  function finishRace() {
    stopFn.current?.();
    stopFn.current = null;
    setPhase("done");
    getPersonalBest(id).then(setPb);
  }

  if (!track) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const isCircuit = track.type === "circuit";
  const clockBase = isCircuit ? lapBaseRef.current : t0Ref.current;
  const elapsed = clockBase != null ? now - clockBase : 0;
  const waitingForStart =
    phase === "running" && startMode === "flying" && t0Ref.current == null;

  const route = track.coordinates;
  const center = route[Math.floor(route.length / 2)];

  return (
    <View style={styles.fill}>
      <View style={styles.mapWrap}>
        <MapCanvas
          mode={track.mode}
          route={route}
          startGate={track.startGate}
          finishGate={track.finishGate}
          followUser={phase === "running"}
          center={center}
        />
      </View>

      <View style={styles.panel}>
        {phase === "select" && (
          <View style={styles.gap}>
            <Text style={styles.h}>Choose your start</Text>
            <StartOption
              active={startMode === "staged"}
              title="Staged start (lights)"
              hint="Stand at the line — red, yellow, green, GO."
              onPress={() => setStartMode("staged")}
            />
            <StartOption
              active={startMode === "flying"}
              title="Flying start"
              hint="Clock starts the moment you cross the line. Time-attack anywhere."
              onPress={() => setStartMode("flying")}
            />
            <Pressable style={styles.primary} onPress={arm}>
              <Text style={styles.primaryText}>Arm race</Text>
            </Pressable>
          </View>
        )}

        {phase === "staging" && (
          <StartLights active onGreen={onGreen} />
        )}

        {phase === "running" && (
          <View style={styles.gap}>
            <Text style={styles.label}>
              {isCircuit ? `Lap ${savedLapsRef.current + 1}` : track.name}
            </Text>
            {waitingForStart ? (
              <Text style={styles.waiting}>Cross the start line to begin…</Text>
            ) : (
              <Timer ms={elapsed} accent={colors.primary} />
            )}
            <View style={styles.statsRow}>
              <Stat label="Last lap" value={lastLap != null ? formatDuration(lastLap) : "—"} hide={!isCircuit} />
              <Stat label="Best lap" value={bestLap != null ? formatDuration(bestLap) : "—"} hide={!isCircuit} />
              <Stat label="PB" value={pb ? formatDuration(pb.durationMs) : "—"} />
            </View>
            <Pressable style={styles.stop} onPress={finishRace}>
              <Text style={styles.primaryText}>
                {isCircuit ? "Finish session" : "Abort"}
              </Text>
            </Pressable>
          </View>
        )}

        {phase === "done" && (
          <View style={styles.gap}>
            <Text style={styles.h}>
              {isCircuit ? "Session complete" : "Finished!"}
            </Text>
            <Timer
              ms={isCircuit ? bestLap ?? 0 : finishMs ?? 0}
              accent={colors.green}
            />
            <Text style={styles.muted}>
              {isCircuit
                ? bestLap != null
                  ? "Best lap this session"
                  : "No full lap completed"
                : finishMs != null
                  ? "Your time"
                  : "Did not finish"}
            </Text>
            <Pressable style={styles.primary} onPress={() => router.back()}>
              <Text style={styles.primaryText}>Done</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function StartOption({
  active,
  title,
  hint,
  onPress,
}: {
  active: boolean;
  title: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, active && { borderColor: colors.primary, backgroundColor: colors.surfaceAlt }]}
    >
      <Text style={[styles.optionTitle, active && { color: colors.primary }]}>{title}</Text>
      <Text style={styles.optionHint}>{hint}</Text>
    </Pressable>
  );
}

function Stat({ label, value, hide }: { label: string; value: string; hide?: boolean }) {
  if (hide) return null;
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  mapWrap: { flex: 1 },
  panel: { backgroundColor: colors.bg, padding: 20, paddingBottom: 36 },
  gap: { gap: 14, alignItems: "center" },
  h: { color: colors.text, fontSize: 22, fontWeight: "800" },
  label: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },
  waiting: { color: colors.text, fontSize: 22, fontWeight: "700", textAlign: "center" },
  option: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.surface,
  },
  optionTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  optionHint: { color: colors.textMuted, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 20, justifyContent: "center" },
  stat: { alignItems: "center" },
  statLabel: { color: colors.textMuted, fontSize: 12 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  primary: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  stop: {
    width: "100%",
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  muted: { color: colors.textMuted },
});
