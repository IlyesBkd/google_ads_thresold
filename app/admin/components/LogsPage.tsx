"use client";

import { COLORS, LogEntry, LogType, logTypeColor } from "./types";

interface LogsPageProps {
  logs: LogEntry[];
  logFilter: string;
  onFilterChange: (filter: string) => void;
  showToast: (msg: string) => void;
}

export default function LogsPage({ logs, logFilter, onFilterChange, showToast }: LogsPageProps) {
  const filteredLogs = logs.filter((l) => logFilter === "all" || l.type === logFilter);

  const filterChips = [
    { label: "All", value: "all" },
    { label: "Import", value: "import" },
    { label: "Sale", value: "sale" },
    { label: "Delivery", value: "delivery" },
    { label: "Refund", value: "refund" },
    { label: "Login", value: "login" },
    { label: "Error", value: "error" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {filterChips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => onFilterChange(chip.value)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: `1px solid ${logFilter === chip.value ? COLORS.primary : COLORS.border}`,
                background: logFilter === chip.value ? "rgba(66,133,244,0.1)" : "transparent",
                color: logFilter === chip.value ? COLORS.primary : COLORS.textSecondary,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-inter)",
              }}
            >{chip.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => showToast("Sales CSV exported")} style={{ padding: "7px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-inter)" }}>Export sales CSV</button>
          <button onClick={() => showToast("Logs CSV exported")} style={{ padding: "7px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-inter)" }}>Export logs CSV</button>
        </div>
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "16px 0" }}>
        {filteredLogs.map((log, i) => (
          <div
            key={log.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 22px",
              borderBottom: i < filteredLogs.length - 1 ? `1px solid ${COLORS.border}` : "none",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: logTypeColor[log.type], flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 13, color: COLORS.text }}>{log.message}</div>
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              color: logTypeColor[log.type],
              background: `${logTypeColor[log.type]}15`,
              padding: "2px 10px",
              borderRadius: 999,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              flexShrink: 0,
            }}>{log.type}</span>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "var(--font-mono)", whiteSpace: "nowrap", flexShrink: 0 }}>{log.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
