import { useState } from "react";
import type { Finding } from "../api/client";
import { generateFixPrompt } from "../utils/fixPrompt";

interface FixActionBarProps {
  findings: Finding[];
}

export function FixActionBar({ findings }: FixActionBarProps) {
  const [copied, setCopied] = useState(false);
  const accepted = findings.filter((f) => f.status === "accepted");

  if (accepted.length === 0) return null;

  const handleCopy = async () => {
    const prompt = generateFixPrompt(accepted);
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="fix-action-bar"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E1DB",
        borderRadius: "12px",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
      }}
    >
      <span style={{ fontSize: "14px", color: "#1A1A1A" }}>
        {accepted.length} finding(s) accepted
      </span>
      <button
        data-testid="copy-fix-prompt"
        onClick={handleCopy}
        style={{
          padding: "8px 20px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: copied ? "#4AA89C" : "#2D7A6F",
          color: "#FFFFFF",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "background-color 0.2s",
        }}
      >
        {copied ? "Copied!" : "Copy Fix Prompt"}
      </button>
    </div>
  );
}
