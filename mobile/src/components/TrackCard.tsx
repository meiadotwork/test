import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { formatDuration } from "@/lib/geo";
import { staticMapUrl } from "@/lib/mapbox";
import { colors, modeColor, modeLabel } from "@/theme";
import type { BestTime, Track } from "@/models/track";

function thumb(track: Track): string {
  if (track.thumbnailUrl) return track.thumbnailUrl;
  try {
    return staticMapUrl(track.coordinates, { width: 320, height: 180 });
  } catch {
    return "";
  }
}

export function TrackCard({
  track,
  best,
  onPress,
}: {
  track: Track;
  best?: BestTime | null;
  onPress: () => void;
}) {
  const uri = thumb(track);
  const km = (track.distanceMeters / 1000).toFixed(2);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {uri ? (
        <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={styles.fallbackText}>No map preview</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {track.name}
        </Text>
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
        <Text style={styles.pb}>
          {best ? `PB ${formatDuration(best.durationMs)}` : "No time yet"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: "100%", height: 150, backgroundColor: colors.surfaceAlt },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  fallbackText: { color: colors.textMuted, fontSize: 12 },
  body: { padding: 12, gap: 4 },
  name: { color: colors.text, fontSize: 17, fontWeight: "700" },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: { fontWeight: "700", fontSize: 13 },
  metaText: { color: colors.textMuted, fontSize: 13 },
  dot: { color: colors.textMuted },
  pb: { color: colors.primary, fontWeight: "700", marginTop: 2 },
});
