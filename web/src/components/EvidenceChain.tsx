import type { EvidenceStep } from "../api/client";
import { CodeBlock } from "./CodeBlock";

interface EvidenceChainProps {
  steps: EvidenceStep[];
}

export function EvidenceChain({ steps }: EvidenceChainProps) {
  if (steps.length === 0) return null;

  return (
    <div data-testid="evidence-chain" style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {steps.map((step, index) => (
        <div key={step.step} style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              data-testid="step-number"
              style={{
                width: "28px",
                height: "28px",
                minWidth: "28px",
                borderRadius: "6px",
                backgroundColor: "#EBF5F3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
                color: "#2D7A6F",
              }}
            >
              {step.step}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#1A1A1A" }}>
                {step.observation}
              </p>
              {step.file && (
                <span
                  data-testid="file-ref"
                  style={{
                    color: "#2D7A6F",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  {step.file}
                  {step.line != null && `:${step.line}`}
                </span>
              )}
              {step.snippet && (
                <CodeBlock
                  code={step.snippet}
                  file={step.file}
                  line={step.line}
                />
              )}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              data-testid="connector"
              style={{
                width: "2px",
                height: "16px",
                marginLeft: "13px",
                borderLeft: "2px dashed #D6E5E2",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
