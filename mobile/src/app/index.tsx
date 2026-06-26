import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TrackCard } from "@/components/TrackCard";
import { getPersonalBest } from "@/lib/db";
import { useAppStore } from "@/state/store";
import { colors } from "@/theme";
import type { BestTime } from "@/models/track";

export default function HomeScreen() {
  const tracks = useAppStore((s) => s.tracks);
  const loadTracks = useAppStore((s) => s.loadTracks);
  const [pbs, setPbs] = useState<Record<string, BestTime | null>>({});

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        await loadTracks();
        const current = useAppStore.getState().tracks;
        const entries = await Promise.all(
          current.map(async (t) => [t.id, await getPersonalBest(t.id)] as const)
        );
        if (alive) setPbs(Object.fromEntries(entries));
      })();
      return () => {
        alive = false;
      };
    }, [loadTracks])
  );

  return (
    <SafeAreaView style={styles.fill} edges={["bottom"]}>
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <TrackCard
            track={item}
            best={pbs[item.id]}
            onPress={() => router.push(`/track/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tracks yet</Text>
            <Text style={styles.emptyText}>
              Create a circuit or a point-to-point track, then race it for a best time.
            </Text>
          </View>
        }
      />
      <Pressable style={styles.fab} onPress={() => router.push("/create")}>
        <Text style={styles.fabText}>+ New track</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 96 },
  empty: { paddingTop: 80, alignItems: "center", gap: 8, paddingHorizontal: 24 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  emptyText: { color: colors.textMuted, textAlign: "center", lineHeight: 20 },
  fab: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
