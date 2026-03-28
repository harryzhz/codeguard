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
    <div
      data-testid="severity-filter"
      style={{
        display: "inline-flex",
        gap: "4px",
        background: "#fff",
        borderRadius: "20px",
        padding: "4px",
        boxShadow: "inset 0 0 0 1.5px rgba(0,0,0,0.06)",
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            data-testid={`filter-${opt.value}`}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "8px 18px",
              borderRadius: "16px",
              border: "none",
              backgroundColor: active ? "#1a1a1a" : "transparent",
              color: active ? "#fff" : "#666",
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
