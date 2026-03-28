import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Review } from "../api/client";
import { fetchReviews } from "../api/client";
import { NavBar } from "../components/NavBar";
import { SeverityBadge } from "../components/SeverityBadge";

export function ReviewList() {
  const { projectId } = useParams<{ projectId: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    fetchReviews(projectId)
      .then(setReviews)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div>
      <NavBar
        breadcrumbs={[
          { label: "Projects", to: "/projects" },
          { label: projectId ?? "" },
        ]}
      />
      <div style={{ padding: "24px", maxWidth: "960px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "20px" }}>Reviews</h1>
        {loading && <p data-testid="loading">Loading...</p>}
        {error && <p data-testid="error" style={{ color: "#D1453B" }}>{error}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {reviews.map((review) => (
            <Link
              key={review.id}
              to={`/projects/${projectId}/reviews/${review.id}`}
              data-testid="review-card"
              style={{
                display: "block",
                backgroundColor: "#FFFFFF",
                borderRadius: "12px",
                border: "1px solid #E5E1DB",
                padding: "20px",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#1A1A1A" }}>
                    {review.version}
                  </h2>
                  <p style={{ fontSize: "12px", color: "#7A7570", marginTop: "4px" }}>
                    {review.files_changed.length} files changed
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#7A7570" }}>
                    {review.summary.total_findings} findings
                  </span>
                  {review.summary.critical > 0 && <SeverityBadge severity="critical" />}
                  {review.summary.warning > 0 && <SeverityBadge severity="warning" />}
                  <span style={{ fontSize: "12px", color: "#7A7570" }}>
                    Tests: {review.summary.tests_passed}/{review.summary.tests_run}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
