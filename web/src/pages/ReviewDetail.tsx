import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import type { ReviewDetail as ReviewDetailType, Finding } from "../api/client";
import { fetchReview, updateFindingStatus } from "../api/client";
import { NavBar } from "../components/NavBar";
import { SummaryBar } from "../components/SummaryBar";
import { SeverityFilter, type FilterValue } from "../components/SeverityFilter";
import { FindingCard } from "../components/FindingCard";
import { generateFixPrompt } from "../utils/fixPrompt";

export function ReviewDetail() {
  const { projectName, version } = useParams<{ projectName: string; version: string }>();
  const [review, setReview] = useState<ReviewDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    if (!projectName || !version) return;
    fetchReview(projectName, version)
      .then(setReview)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectName, version]);

  const filteredFindings = useMemo(() => {
    if (!review) return [];
    if (filter === "all") return review.findings;
    return review.findings.filter((f) => f.severity === filter);
  }, [review, filter]);

  const openFindings = useMemo(() => {
    if (!review) return [];
    return review.findings.filter((f) => f.status === "open");
  }, [review]);

  const acceptedFindings = useMemo(() => {
    if (!review) return [];
    return review.findings.filter((f) => f.status === "accepted");
  }, [review]);

  const [acceptingAll, setAcceptingAll] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyFixPrompt = useCallback(async () => {
    if (acceptedFindings.length === 0) return;
    const prompt = generateFixPrompt(acceptedFindings);
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [acceptedFindings]);

  const handleAcceptAll = useCallback(async () => {
    if (!review || openFindings.length === 0) return;
    setAcceptingAll(true);
    try {
      const results = await Promise.all(
        openFindings.map((f) => updateFindingStatus(f.id, "accepted")),
      );
      const updatedMap = new Map(results.map((r) => [r.id, r.status]));
      setReview({
        ...review,
        findings: review.findings.map((f) =>
          updatedMap.has(f.id) ? { ...f, status: updatedMap.get(f.id)! } : f,
        ),
      });
    } catch {
      // silently fail for now
    } finally {
      setAcceptingAll(false);
    }
  }, [review, openFindings]);

  const handleStatusUpdate = useCallback(
    async (findingId: string, status: "accepted" | "dismissed") => {
      if (!review) return;
      try {
        const updated = await updateFindingStatus(findingId, status);
        setReview({
          ...review,
          findings: review.findings.map((f: Finding) => (f.id === findingId ? { ...f, status: updated.status } : f)),
        });
      } catch {
        // silently fail for now
      }
    },
    [review],
  );

  const showActionBar = openFindings.length > 0 || acceptedFindings.length > 0;

  return (
    <div>
      <NavBar
        breadcrumbs={[
          { label: "Projects", to: "/projects" },
          { label: projectName ?? "", to: `/projects/${projectName}/reviews` },
          { label: version ? `v${version}` : "" },
        ]}
      />
      <div style={{ padding: "24px", maxWidth: "960px", margin: "0 auto" }}>
        {loading && <p data-testid="loading">Loading...</p>}
        {error && <p data-testid="error" style={{ color: "#D44A3A" }}>{error}</p>}

        {review && (
          <>
            {/* Summary + Filter */}
            <div style={{ marginBottom: "14px" }}>
              <SummaryBar summary={review.summary}>
                <SeverityFilter value={filter} onChange={setFilter} />
              </SummaryBar>
            </div>

            {/* Action bar: Accept All + Copy Fix Prompt */}
            {showActionBar && (
              <div
                data-testid="action-bar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                {openFindings.length > 0 && (
                  <button
                    data-testid="accept-all-btn"
                    onClick={handleAcceptAll}
                    disabled={acceptingAll}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 18px",
                      borderRadius: "20px",
                      border: "none",
                      backgroundColor: "#6ED2B7",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: acceptingAll ? "default" : "pointer",
                      fontFamily: "inherit",
                      opacity: acceptingAll ? 0.7 : 1,
                      whiteSpace: "nowrap",
                      transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    }}
                  >
                    <span>&#10003;</span>
                    {acceptingAll ? "Accepting..." : `Accept All (${openFindings.length})`}
                  </button>
                )}
                {acceptedFindings.length > 0 && (
                  <button
                    data-testid="copy-fix-prompt"
                    onClick={handleCopyFixPrompt}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 18px",
                      borderRadius: "20px",
                      border: "none",
                      backgroundColor: copied ? "#6ED2B7" : "#fff",
                      color: copied ? "#fff" : "#0D9488",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                      transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    }}
                  >
                    <span>&#8599;</span>
                    {copied ? "Copied!" : `Copy Fix Prompt (${acceptedFindings.length})`}
                  </button>
                )}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {filteredFindings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  onAccept={(id) => handleStatusUpdate(id, "accepted")}
                  onDismiss={(id) => handleStatusUpdate(id, "dismissed")}
                />
              ))}
              {filteredFindings.length === 0 && (
                <p data-testid="no-findings" style={{ textAlign: "center", color: "#999", padding: "40px" }}>
                  No findings match the current filter.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
