import type { CSSProperties } from "react";

type Variant = "nav" | "badge" | "card" | "footer";

// Each preset reproduces the exact bar dimensions used in the prototype at
// that location. The third bar is always the amber (#FBBC04) accent.
const PRESETS: Record<
  Variant,
  {
    box?: CSSProperties;
    inner: CSSProperties;
    barW: number;
    barRadius: number;
    heights: [number, number, number];
  }
> = {
  nav: {
    box: {
      display: "inline-flex",
      alignItems: "flex-end",
      gap: "3px",
      height: "30px",
      padding: "6px",
      background: "#101010",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "8px",
      boxSizing: "border-box",
    },
    inner: {},
    barW: 4,
    barRadius: 2,
    heights: [7, 12, 17],
  },
  badge: {
    inner: {
      display: "inline-flex",
      alignItems: "flex-end",
      gap: "2.5px",
      height: "13px",
    },
    barW: 3,
    barRadius: 1.5,
    heights: [6, 10, 13],
  },
  card: {
    box: {
      display: "inline-flex",
      alignItems: "flex-end",
      gap: "3px",
      height: "34px",
      padding: "7px",
      background: "#101010",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "9px",
      boxSizing: "border-box",
    },
    inner: {},
    barW: 4,
    barRadius: 2,
    heights: [8, 14, 20],
  },
  footer: {
    inner: {
      display: "inline-flex",
      alignItems: "flex-end",
      gap: "2.5px",
      height: "14px",
    },
    barW: 3,
    barRadius: 1.5,
    heights: [6, 10, 14],
  },
};

export default function BarsMark({ variant }: { variant: Variant }) {
  const p = PRESETS[variant];
  const colors = ["#4285F4", "#4285F4", "#FBBC04"];

  const bars = p.heights.map((h, i) => (
    <span
      key={i}
      style={{
        width: `${p.barW}px`,
        height: `${h}px`,
        borderRadius: `${p.barRadius}px`,
        background: colors[i],
      }}
    />
  ));

  if (p.box) {
    return <span style={p.box}>{bars}</span>;
  }
  return <span style={p.inner}>{bars}</span>;
}
