import type { Severity } from "../api/client";

const colorMap: Record<Severity, { color: string; bg: string }> = {
  critical: { color: "#D1453B", bg: "#FDECEB" },
  warning: { color: "#C68B00", bg: "#FFF5DC" },
  style: { color: "#7A7570", bg: "#F0EEEB" },
};

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const { color, bg } = colorMap[severity];
  return (
    <span
      data-testid="severity-badge"
      style={{
        color,
        backgroundColor: bg,
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 600,
        padding: "2px 8px",
        textTransform: "capitalize",
        display: "inline-block",
      }}
    >
      {severity}
    </span>
  );
}
