import { useState } from "react";
import type { Finding } from "../api/client";
import { SeverityBadge } from "./SeverityBadge";
import { EvidenceChain } from "./EvidenceChain";

function renderSuggestionText(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} style={{
          backgroundColor: "#E6FAF5",
          color: "#0D9488",
          padding: "2px 8px",
          borderRadius: "8px",
          fontSize: "12px",
          fontFamily: "monospace",
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const hoverColorMap = {
  critical: "#FA8072",
  warning: "#F5C563",
  style: "#98D0FF",
} as const;

interface FindingCardProps {
  finding: Finding;
  onAccept?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function FindingCard({ finding, onAccept, onDismiss }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-testid="finding-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "28px",
        border: "none",
        boxShadow: hovered
          ? `inset 0 0 0 2px ${hoverColorMap[finding.severity]}`
          : "inset 0 0 0 2px transparent",
        overflow: "hidden",
        transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        transform: hovered ? "translateY(-3px)" : "none",
      }}
    >
      <div
        data-testid="finding-header"
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "18px 24px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
          <SeverityBadge severity={finding.severity} />
          <span style={{ fontSize: "15px", fontWeight: 600 }}>{finding.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {finding.status === "accepted" && (
            <span
              data-testid="status-badge"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#0D9488",
                backgroundColor: "#E6FAF5",
                padding: "4px 12px",
                borderRadius: "20px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#6ED2B7", display: "inline-block" }} />
              Accepted
            </span>
          )}
          {finding.status === "dismissed" && (
            <span
              data-testid="status-badge"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#999",
                backgroundColor: "#F0EEEB",
                padding: "4px 12px",
                borderRadius: "20px",
              }}
            >
              Dismissed
            </span>
          )}
          <span
            data-testid="confidence"
            style={{ fontSize: "12px", color: "#aaa", fontWeight: 500 }}
          >
            {Math.round(finding.confidence * 100)}%
          </span>
          <span
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "#F7F2F2",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              color: "#1a1a1a",
            }}
          >
            {expanded ? "\u25B2" : "\u25BC"}
          </span>
        </div>
      </div>

      {expanded && (
        <div data-testid="finding-body" style={{ padding: "0 24px 24px" }}>
          <p style={{ fontSize: "14px", color: "#444", marginBottom: "20px", lineHeight: 1.7 }}>
            {finding.description}
          </p>

          {finding.evidence_chain.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "11px", color: "#aaa", marginBottom: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                Evidence Chain
              </h4>
              <EvidenceChain steps={finding.evidence_chain} />
            </div>
          )}

          {finding.test_verification && (
            <div data-testid="test-verification" style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "11px", color: "#aaa", marginBottom: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                Test Verification
              </h4>
              <div style={{
                padding: "12px 16px",
                borderRadius: "16px",
                backgroundColor: finding.test_verification.status === "passed" ? "#E6FAF5" : finding.test_verification.status === "failed" ? "#FFF0EE" : "#F7F2F2",
                fontSize: "13px",
              }}>
                <strong>{finding.test_verification.status.toUpperCase()}</strong>
                {finding.test_verification.test_name && <>: {finding.test_verification.test_name}</>}
                {finding.test_verification.output && (
                  <p style={{ marginTop: "4px", fontSize: "12px", color: "#999" }}>{finding.test_verification.output}</p>
                )}
              </div>
            </div>
          )}

          {finding.suggestion && (
            <div data-testid="suggestion" style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "11px", color: "#aaa", marginBottom: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                Suggestion
              </h4>
              <div style={{
                backgroundColor: "#F7F2F2",
                padding: "14px 18px",
                borderRadius: "16px",
                fontSize: "13px",
                lineHeight: 1.7,
                color: "#444",
              }}>
                {renderSuggestionText(finding.suggestion)}
              </div>
            </div>
          )}

          {finding.status === "open" && (
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                data-testid="dismiss-btn"
                onClick={() => onDismiss?.(finding.id)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "20px",
                  border: "none",
                  backgroundColor: "#F7F2F2",
                  color: "#666",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Dismiss
              </button>
              <button
                data-testid="accept-btn"
                onClick={() => onAccept?.(finding.id)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "20px",
                  border: "none",
                  backgroundColor: "#1a1a1a",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                &#10003; Accept
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
