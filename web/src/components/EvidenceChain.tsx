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
                borderRadius: "50%",
                backgroundColor: "#FFF0EE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                color: "#FA8072",
                transition: "transform 0.3s ease",
              }}
            >
              {step.step}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#1a1a1a", fontWeight: 500, marginBottom: "4px" }}>
                {step.observation}
              </p>
              {step.file && (
                <span
                  data-testid="file-ref"
                  style={{
                    color: "#aaa",
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
                background: "linear-gradient(to bottom, #FDD, #F7F2F2)",
                borderRadius: "2px",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
