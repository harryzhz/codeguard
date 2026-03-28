import { useEffect, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";

interface CodeBlockProps {
  code: string;
  file?: string;
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

export function CodeBlock({ code, file, observation }: CodeBlockProps) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lang = detectLang(file);
    if (lang === "text") {
      setHtml("");
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    getHighlighter().then((h) => {
      if (cancelled) return;
      setHtml(h.codeToHtml(code, { lang, theme: "github-light" }));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [code, file]);

  return (
    <div style={{ borderRadius: "14px", overflow: "hidden", marginTop: "6px" }}>
      {html ? (
        <div
          className="shiki-wrapper"
          data-testid="highlighted-code"
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ fontSize: "12.5px", overflow: "auto" }}
        />
      ) : (
        <pre
          data-testid="code-block"
          style={{
            backgroundColor: "#F7F2F2",
            color: "#1A1A1A",
            padding: "10px 14px",
            fontFamily: "monospace",
            fontSize: "12.5px",
            margin: 0,
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
          }}
        >
          {code}
        </pre>
      )}
      {observation && (
        <div style={{
          backgroundColor: "#FEF9E7",
          borderTop: "1px solid #F0E6B8",
          padding: "8px 12px",
          fontSize: "13px",
          color: "#5D4E0B",
        }}>
          {observation}
        </div>
      )}
    </div>
  );
}
