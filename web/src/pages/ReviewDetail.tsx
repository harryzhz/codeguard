import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import type { Review, Finding } from "../api/client";
import { fetchReview, updateFindingStatus } from "../api/client";
import { NavBar } from "../components/NavBar";
import { SummaryBar } from "../components/SummaryBar";
import { SeverityFilter, type FilterValue } from "../components/SeverityFilter";
import { FindingCard } from "../components/FindingCard";

export function ReviewDetail() {
  const { projectId, reviewId } = useParams<{ projectId: string; reviewId: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    if (!projectId || !reviewId) return;
    fetchReview(projectId, reviewId)
      .then(setReview)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, reviewId]);

  const filteredFindings = useMemo(() => {
    if (!review) return [];
    if (filter === "all") return review.findings;
    return review.findings.filter((f) => f.severity === filter);
  }, [review, filter]);

  const handleStatusUpdate = useCallback(
    async (findingId: string, status: "accepted" | "dismissed") => {
      if (!projectId || !reviewId || !review) return;
      try {
        const updated = await updateFindingStatus(projectId, reviewId, findingId, status);
        setReview({
          ...review,
          findings: review.findings.map((f: Finding) => (f.id === findingId ? { ...f, status: updated.status } : f)),
        });
      } catch {
        // silently fail for now
      }
    },
    [projectId, reviewId, review],
  );

  return (
    <div>
      <NavBar
        breadcrumbs={[
          { label: "Projects", to: "/projects" },
          { label: projectId ?? "", to: `/projects/${projectId}/reviews` },
          { label: reviewId ?? "" },
        ]}
      />
      <div style={{ padding: "24px", maxWidth: "960px", margin: "0 auto" }}>
        {loading && <p data-testid="loading">Loading...</p>}
        {error && <p data-testid="error" style={{ color: "#D1453B" }}>{error}</p>}

        {review && (
          <>
            <div style={{ marginBottom: "20px" }}>
              <SummaryBar summary={review.summary}>
                <SeverityFilter value={filter} onChange={setFilter} />
              </SummaryBar>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredFindings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  onAccept={(id) => handleStatusUpdate(id, "accepted")}
                  onDismiss={(id) => handleStatusUpdate(id, "dismissed")}
                />
              ))}
              {filteredFindings.length === 0 && (
                <p data-testid="no-findings" style={{ textAlign: "center", color: "#7A7570", padding: "40px" }}>
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
