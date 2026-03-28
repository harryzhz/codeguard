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
        padding: "18px 24px",
        borderRadius: "28px",
        boxShadow: "inset 0 0 0 1.5px rgba(0,0,0,0.04)",
        flexWrap: "wrap",
        gap: "14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <span data-testid="total-count" style={{ fontSize: "15px", fontWeight: 700 }}>
          {summary.total_findings} findings
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Dot color="#FA8072" />
          <span data-testid="critical-count" style={{ fontSize: "13px", color: "#999" }}>
            {summary.critical} critical
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Dot color="#F5C563" />
          <span data-testid="warning-count" style={{ fontSize: "13px", color: "#999" }}>
            {summary.warning} warning
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Dot color="#98D0FF" />
          <span data-testid="style-count" style={{ fontSize: "13px", color: "#999" }}>
            {summary.style} style
          </span>
        </div>
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}
