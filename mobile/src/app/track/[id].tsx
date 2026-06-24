import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { MapCanvas } from "@/components/MapCanvas";
import { deleteTrack, getBestTimes, getTrack } from "@/lib/db";
import { formatDuration } from "@/lib/geo";
import { trackToDeepLink, trackToGpx } from "@/lib/share";
import { useAppStore } from "@/state/store";
import { colors, modeColor, modeLabel } from "@/theme";
import type { BestTime, Track } from "@/models/track";

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const removeTrack = useAppStore((s) => s.removeTrack);
  const [track, setTrack] = useState<Track | null>(null);
  const [times, setTimes] = useState<BestTime[]>([]);
  const [showQr, setShowQr] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const t = await getTrack(id);
        const bt = await getBestTimes(id);
        if (alive) {
          setTrack(t);
          setTimes(bt);
        }
      })();
      return () => {
        alive = false;
      };
    }, [id])
  );

  if (!track) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const center = track.coordinates[Math.floor(track.coordinates.length / 2)];
  const km = (track.distanceMeters / 1000).toFixed(2);
  const link = trackToDeepLink(track);

  async function shareLink() {
    if (!track) return;
    await Share.share({
      title: track.name,
      message: `Race my "${track.name}" track on RaceLine:\n${link}`,
    });
  }

  async function shareGpx() {
    if (!track) return;
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Sharing unavailable", "GPX export isn't available on this device.");
      return;
    }
    const safe = track.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const uri = `${FileSystem.cacheDirectory}${safe || "track"}.gpx`;
    await FileSystem.writeAsStringAsync(uri, trackToGpx(track));
    await Sharing.shareAsync(uri, {
      mimeType: "application/gpx+xml",
      dialogTitle: `Share ${track.name}`,
    });
  }

  function confirmDelete() {
    Alert.alert("Delete track", `Delete "${track?.name}" and its times?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await removeTrack(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
      <View style={styles.mapWrap}>
        <MapCanvas
          mode={track.mode}
          route={track.coordinates}
          startGate={track.startGate}
          finishGate={track.finishGate}
          followUser={false}
          center={center}
        />
      </View>

      <View style={styles.meta}>
        <Text style={[styles.badge, { color: modeColor[track.mode] }]}>
          {modeLabel[track.mode]}
        </Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.metaText}>
          {track.type === "circuit" ? "Circuit" : "Linear"}
        </Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.metaText}>{km} km</Text>
      </View>

      <Pressable style={styles.race} onPress={() => router.push(`/race/${id}`)}>
        <Text style={styles.raceText}>Race this track</Text>
      </Pressable>

      <Text style={styles.section}>Best times</Text>
      {times.length === 0 ? (
        <Text style={styles.muted}>No times yet — race it to set a record.</Text>
      ) : (
        times.map((t, i) => (
          <View key={t.id} style={styles.timeRow}>
            <Text style={[styles.rank, i === 0 && { color: colors.primary }]}>
              {i + 1}
            </Text>
            <Text style={[styles.time, i === 0 && { color: colors.primary }]}>
              {formatDuration(t.durationMs)}
            </Text>
            <Text style={styles.date}>
              {new Date(t.date).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.section}>Share</Text>
      <View style={styles.row}>
        <Pressable style={styles.shareBtn} onPress={shareLink}>
          <Text style={styles.shareText}>Send link</Text>
        </Pressable>
        <Pressable style={styles.shareBtn} onPress={shareGpx}>
          <Text style={styles.shareText}>Export GPX</Text>
        </Pressable>
        <Pressable style={styles.shareBtn} onPress={() => setShowQr((v) => !v)}>
          <Text style={styles.shareText}>{showQr ? "Hide QR" : "QR code"}</Text>
        </Pressable>
      </View>
      {showQr && (
        <View style={styles.qr}>
          <QRCode value={link} size={200} backgroundColor="white" />
          <Text style={styles.muted}>Scan to import this track</Text>
        </View>
      )}

      <Pressable style={styles.delete} onPress={confirmDelete}>
        <Text style={styles.deleteText}>Delete track</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  mapWrap: { height: 280 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, padding: 16, paddingBottom: 4 },
  badge: { fontWeight: "800", fontSize: 15 },
  dot: { color: colors.textMuted },
  metaText: { color: colors.textMuted, fontSize: 15 },
  race: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  raceText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  muted: { color: colors.textMuted, marginHorizontal: 16 },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rank: { color: colors.textMuted, width: 20, fontWeight: "800", fontSize: 16 },
  time: { color: colors.text, fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"], flex: 1 },
  date: { color: colors.textMuted },
  row: { flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  shareBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  shareText: { color: colors.text, fontWeight: "700" },
  qr: { alignItems: "center", gap: 10, marginTop: 16, padding: 16 },
  delete: { marginTop: 32, alignItems: "center" },
  deleteText: { color: colors.red, fontWeight: "700" },
});
