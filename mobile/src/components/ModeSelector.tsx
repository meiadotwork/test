import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, modeColor, modeLabel } from "@/theme";
import type { Mode } from "@/models/track";

const MODES: Mode[] = ["run", "bike", "drive"];

const HINT: Record<Mode, string> = {
  run: "Go anywhere walkable",
  bike: "Snaps to roads & paths",
  drive: "Follows street directions",
};

export function ModeSelector({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <View style={styles.row}>
      {MODES.map((mode) => {
        const active = mode === value;
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            style={[
              styles.chip,
              active && { borderColor: modeColor[mode], backgroundColor: colors.surfaceAlt },
            ]}
          >
            <Text style={[styles.label, active && { color: modeColor[mode] }]}>
              {modeLabel[mode]}
            </Text>
            <Text style={styles.hint}>{HINT[mode]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
  },
  label: { color: colors.text, fontWeight: "700", fontSize: 15 },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
