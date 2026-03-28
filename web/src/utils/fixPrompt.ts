import type { Finding } from "../api/client";

export function generateFixPrompt(findings: Finding[]): string {
  const lines = ["Please fix the following code review findings:", ""];

  findings.forEach((f, i) => {
    const fileRef = f.evidence_chain.length > 0
      ? `${f.evidence_chain[0].file ?? "unknown"}${f.evidence_chain[0].line != null ? `:${f.evidence_chain[0].line}` : ""}`
      : "unknown location";

    lines.push(`## Finding ${i + 1} [${f.severity}] - ${f.title}`);
    lines.push(`- File: ${fileRef}`);
    lines.push(`- Issue: ${f.description}`);
    lines.push(`- Fix: ${f.suggestion}`);
    lines.push("");
  });

  return lines.join("\n");
}
