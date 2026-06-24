import { StyleSheet, Text } from "react-native";

import { formatDuration } from "@/lib/geo";
import { colors } from "@/theme";

/** Large monospace race clock. `ms` is the elapsed time to display. */
export function Timer({ ms, accent }: { ms: number; accent?: string }) {
  return (
    <Text style={[styles.clock, accent ? { color: accent } : null]}>
      {formatDuration(ms)}
    </Text>
  );
}

const styles = StyleSheet.create({
  clock: {
    color: colors.text,
    fontSize: 56,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    letterSpacing: 1,
  },
});
