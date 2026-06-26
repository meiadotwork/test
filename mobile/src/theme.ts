/** App-wide colors and a couple of spacing tokens. */
export const colors = {
  bg: "#0b0f17",
  surface: "#151b26",
  surfaceAlt: "#1d2533",
  border: "#2a3343",
  text: "#f4f6fb",
  textMuted: "#9aa6b8",
  primary: "#f43f5e",
  run: "#34d399",
  bike: "#38bdf8",
  drive: "#f59e0b",
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
} as const;

export const modeColor = {
  run: colors.run,
  bike: colors.bike,
  drive: colors.drive,
} as const;

export const modeLabel = {
  run: "Running",
  bike: "Bike",
  drive: "Driving",
} as const;
