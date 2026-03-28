import type { Severity } from "../api/client";

const colorMap: Record<Severity, { color: string; dot: string; bg: string }> = {
  critical: { color: "#D44A3A", dot: "#FA8072", bg: "#FFF0EE" },
  warning: { color: "#B8860B", dot: "#F5C563", bg: "#FFF8E7" },
  style: { color: "#5B8FB9", dot: "#98D0FF", bg: "#EEF6FF" },
};

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const { color, dot, bg } = colorMap[severity];
  return (
    <span
      data-testid="severity-badge"
      style={{
        color,
        backgroundColor: bg,
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 600,
        padding: "4px 12px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
      }}
    >
      <span style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        backgroundColor: dot,
        display: "inline-block",
      }} />
      {severity}
    </span>
  );
}
