import { useState } from "react";
import type { Finding } from "../api/client";
import { SeverityBadge } from "./SeverityBadge";
import { EvidenceChain } from "./EvidenceChain";

const borderColorMap = {
  critical: "#D1453B",
  warning: "#C68B00",
  style: "#C8C3BB",
} as const;

interface FindingCardProps {
  finding: Finding;
  onAccept?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function FindingCard({ finding, onAccept, onDismiss }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-testid="finding-card"
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #E5E1DB",
        borderLeft: `4px solid ${borderColorMap[finding.severity]}`,
        overflow: "hidden",
      }}
    >
      <div
        data-testid="finding-header"
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "16px 20px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
          <SeverityBadge severity={finding.severity} />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>{finding.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            data-testid="confidence"
            style={{ fontSize: "12px", color: "#7A7570" }}
          >
            {finding.confidence}% confidence
          </span>
          <span style={{ fontSize: "12px", color: "#7A7570" }}>
            {expanded ? "\u25B2" : "\u25BC"}
          </span>
        </div>
      </div>

      {expanded && (
        <div data-testid="finding-body" style={{ padding: "0 20px 20px" }}>
          <p style={{ fontSize: "14px", color: "#1A1A1A", marginBottom: "16px" }}>
            {finding.description}
          </p>

          {finding.evidence_chain.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", color: "#7A7570", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Evidence Chain
              </h4>
              <EvidenceChain steps={finding.evidence_chain} />
            </div>
          )}

          {finding.test_verification && (
            <div data-testid="test-verification" style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", color: "#7A7570", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Test Verification
              </h4>
              <div style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: finding.test_verification.status === "passed" ? "#EBF5F3" : finding.test_verification.status === "failed" ? "#FDECEB" : "#F0EEEB",
                fontSize: "13px",
              }}>
                <strong>{finding.test_verification.status.toUpperCase()}</strong>
                {finding.test_verification.test_name && <>: {finding.test_verification.test_name}</>}
                {finding.test_verification.output && (
                  <p style={{ marginTop: "4px", fontSize: "12px", color: "#7A7570" }}>{finding.test_verification.output}</p>
                )}
              </div>
            </div>
          )}

          {finding.suggestion && (
            <div data-testid="suggestion" style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", color: "#7A7570", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Suggestion
              </h4>
              <pre style={{
                backgroundColor: "#F5F3EF",
                padding: "12px",
                borderRadius: "8px",
                fontFamily: "monospace",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
              }}>
                {finding.suggestion}
              </pre>
            </div>
          )}

          {finding.status === "open" && (
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                data-testid="dismiss-btn"
                onClick={() => onDismiss?.(finding.id)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "1px solid #E5E1DB",
                  backgroundColor: "#F0EEEB",
                  color: "#1A1A1A",
                  fontSize: "13px",
                  fontWeight: 500,
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
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#2D7A6F",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Accept
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
