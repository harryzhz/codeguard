import type { ReactNode } from "react";
import type { ReviewSummary } from "../api/client";

interface SummaryBarProps {
  summary: ReviewSummary;
  children?: ReactNode;
}

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: color,
        display: "inline-block",
      }}
    />
  );
}

export function SummaryBar({ summary, children }: SummaryBarProps) {
  return (
    <div
      data-testid="summary-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        padding: "16px 24px",
        borderRadius: "12px",
        border: "1px solid #E5E1DB",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <span data-testid="total-count" style={{ fontSize: "14px", fontWeight: 600 }}>
          {summary.total_findings} findings
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Dot color="#D1453B" />
          <span data-testid="critical-count" style={{ fontSize: "13px" }}>
            {summary.critical} critical
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Dot color="#C68B00" />
          <span data-testid="warning-count" style={{ fontSize: "13px" }}>
            {summary.warning} warning
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Dot color="#7A7570" />
          <span data-testid="style-count" style={{ fontSize: "13px" }}>
            {summary.style} style
          </span>
        </div>
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}
