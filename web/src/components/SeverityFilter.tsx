import type { Severity } from "../api/client";

export type FilterValue = "all" | Severity;

interface SeverityFilterProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

const options: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "Warning", value: "warning" },
  { label: "Style", value: "style" },
];

export function SeverityFilter({ value, onChange }: SeverityFilterProps) {
  return (
    <div data-testid="severity-filter" style={{ display: "flex", gap: "4px" }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            data-testid={`filter-${opt.value}`}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: active ? "none" : "1px solid #E5E1DB",
              backgroundColor: active ? "#2D7A6F" : "transparent",
              color: active ? "#FFFFFF" : "#7A7570",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
