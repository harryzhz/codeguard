import { useEffect, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";

interface CodeBlockProps {
  code: string;
  file?: string;
  line?: number;
  observation?: string;
}

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light"],
      langs: ["python", "typescript", "javascript", "json", "bash", "html", "css", "sql", "yaml", "go", "rust"],
    });
  }
  return highlighterPromise;
}

function detectLang(file?: string): string {
  if (!file) return "text";
  const ext = file.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    py: "python", ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", sh: "bash", bash: "bash", html: "html", css: "css",
    sql: "sql", yml: "yaml", yaml: "yaml", go: "go", rs: "rust",
  };
  return map[ext ?? ""] ?? "text";
}

export function CodeBlock({ code, file, line, observation }: CodeBlockProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    const lang = detectLang(file);
    if (lang === "text") {
      setHtml("");
      return;
    }
    let cancelled = false;
    getHighlighter().then((h) => {
      if (cancelled) return;
      setHtml(h.codeToHtml(code, { lang, theme: "github-light" }));
    });
    return () => { cancelled = true; };
  }, [code, file]);

  return (
    <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #E5E1DB", marginTop: "6px" }}>
      {file && (
        <div style={{
          backgroundColor: "#1E1E2E",
          color: "#CDD6F4",
          padding: "6px 12px",
          fontSize: "12px",
          fontFamily: "monospace",
        }}>
          {file}{line != null && `:${line}`}
        </div>
      )}
      <div style={{ position: "relative" }}>
        {html ? (
          <div
            data-testid="highlighted-code"
            dangerouslySetInnerHTML={{ __html: html }}
            style={{ fontSize: "12px", overflow: "auto" }}
          />
        ) : (
          <pre
            data-testid="code-block"
            style={{
              backgroundColor: "#FAFAF8",
              padding: "8px 12px",
              fontFamily: "monospace",
              fontSize: "12px",
              margin: 0,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {code}
          </pre>
        )}
        {line != null && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "100%",
            pointerEvents: "none",
            background: "rgba(209,69,59,0.06)",
            borderLeft: "3px solid #D1453B",
          }} />
        )}
      </div>
      {observation && (
        <div style={{
          backgroundColor: "#FEF9E7",
          borderTop: "1px solid #F0E6B8",
          padding: "8px 12px",
          fontSize: "12px",
          color: "#5D4E0B",
        }}>
          💬 {observation}
        </div>
      )}
    </div>
  );
}
