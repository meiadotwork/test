import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";

type Phase = "idle" | "red" | "yellow" | "green";

/**
 * Drag-race staging lights. When `active` turns true it runs red → yellow → green,
 * then calls `onGreen` with the exact green-light timestamp (the race start).
 */
export function StartLights({
  active,
  onGreen,
}: {
  active: boolean;
  onGreen: (greenT: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }
    setPhase("red");
    timers.current.push(setTimeout(() => setPhase("yellow"), 1000));
    timers.current.push(
      setTimeout(() => {
        setPhase("green");
        onGreen(Date.now());
      }, 2000)
    );
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [active, onGreen]);

  const lit = {
    red: phase === "red",
    yellow: phase === "yellow",
    green: phase === "green",
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.tree}>
        <Light on={lit.red} color={colors.red} />
        <Light on={lit.yellow} color={colors.yellow} />
        <Light on={lit.green} color={colors.green} />
      </View>
      <Text style={styles.caption}>
        {phase === "idle"
          ? "Get to the start line"
          : phase === "green"
            ? "GO!"
            : "Stage…"}
      </Text>
    </View>
  );
}

function Light({ on, color }: { on: boolean; color: string }) {
  return (
    <View
      style={[
        styles.light,
        { backgroundColor: on ? color : colors.surfaceAlt, opacity: on ? 1 : 0.3 },
        on && { shadowColor: color, shadowOpacity: 0.9, shadowRadius: 16 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 12 },
  tree: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  light: { width: 56, height: 56, borderRadius: 28 },
  caption: { color: colors.text, fontSize: 18, fontWeight: "800", letterSpacing: 1 },
});
