"use client";

import { CSSProperties } from "react";
import { COLORS } from "./types";

export default function Toast({ message, visible }: { message: string; visible: boolean }) {
  const style: CSSProperties = {
    position: "fixed",
    bottom: visible ? 32 : -60,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1A1A1A",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "12px 24px",
    color: COLORS.text,
    fontFamily: "var(--font-inter)",
    fontSize: 14,
    zIndex: 9999,
    transition: "bottom 0.3s ease",
    whiteSpace: "nowrap",
  };
  return <div style={style}>{message}</div>;
}
