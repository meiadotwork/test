import { Stack, router } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

import { decodeTrack, deepLinkToPayload } from "@/lib/share";
import { newId } from "@/lib/id";
import { useAppStore } from "@/state/store";
import { colors } from "@/theme";
import type { Track } from "@/models/track";

export default function RootLayout() {
  const loadTracks = useAppStore((s) => s.loadTracks);
  const upsertTrack = useAppStore((s) => s.upsertTrack);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  // Import a track when the app is opened via a raceline://track?d=... link.
  useEffect(() => {
    async function importFromUrl(url: string | null) {
      if (!url) return;
      const payload = deepLinkToPayload(url);
      if (!payload) return;
      try {
        const { track } = decodeTrack(payload);
        // Re-id on import so a shared copy never clobbers a local track.
        const imported: Track = { ...track, id: newId("trk_") };
        await upsertTrack(imported);
        router.push(`/track/${imported.id}`);
      } catch {
        /* ignore malformed links */
      }
    }
    Linking.getInitialURL().then(importFromUrl);
    const sub = Linking.addEventListener("url", (e) => importFromUrl(e.url));
    return () => sub.remove();
  }, [upsertTrack]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "RaceLine" }} />
        <Stack.Screen name="create" options={{ title: "New track" }} />
        <Stack.Screen name="track/[id]" options={{ title: "Track" }} />
        <Stack.Screen
          name="race/[id]"
          options={{ title: "Race", presentation: "fullScreenModal" }}
        />
      </Stack>
    </>
  );
}
