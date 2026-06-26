import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";
import type { TrackType } from "@/models/track";

const OPTIONS: { value: TrackType; label: string; hint: string }[] = [
  { value: "circuit", label: "Circuit", hint: "Round lap — start = finish" },
  { value: "linear", label: "Linear", hint: "Point A to point B" },
];

export function TrackTypeSelector({
  value,
  onChange,
}: {
  value: TrackType;
  onChange: (type: TrackType) => void;
}) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, active && styles.active]}
          >
            <Text style={[styles.label, active && { color: colors.primary }]}>
              {opt.label}
            </Text>
            <Text style={styles.hint}>{opt.hint}</Text>
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
  active: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  label: { color: colors.text, fontWeight: "700", fontSize: 15 },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
