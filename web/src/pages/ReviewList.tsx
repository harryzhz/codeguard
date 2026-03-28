import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Review } from "../api/client";
import { fetchReviews } from "../api/client";
import { NavBar } from "../components/NavBar";
import { SeverityBadge } from "../components/SeverityBadge";

export function ReviewList() {
  const { projectName } = useParams<{ projectName: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectName) return;
    fetchReviews(projectName)
      .then(setReviews)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectName]);

  return (
    <div>
      <NavBar
        breadcrumbs={[
          { label: "Projects", to: "/projects" },
          { label: projectName ?? "" },
        ]}
      />
      <div style={{ padding: "24px", maxWidth: "960px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "20px", letterSpacing: "-0.5px" }}>Reviews</h1>
        {loading && <p data-testid="loading">Loading...</p>}
        {error && <p data-testid="error" style={{ color: "#D44A3A" }}>{error}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {reviews.map((review) => (
            <Link
              key={review.id}
              to={`/projects/${projectName}/reviews/${review.version}`}
              data-testid="review-card"
              style={{
                display: "block",
                backgroundColor: "#FFFFFF",
                borderRadius: "28px",
                border: "none",
                boxShadow: "inset 0 0 0 2px transparent",
                padding: "20px 24px",
                textDecoration: "none",
                color: "inherit",
                transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "inset 0 0 0 2px #6ED2B7";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "inset 0 0 0 2px transparent";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#1A1A1A" }}>
                    {review.title || `Review #${review.version}`}
                  </h2>
                  <p style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                    v{review.version} · {review.files_changed.length} files changed · {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#999" }}>
                    {review.summary.total_findings} findings
                  </span>
                  {review.summary.critical > 0 && <SeverityBadge severity="critical" />}
                  {review.summary.warning > 0 && <SeverityBadge severity="warning" />}
                  <span style={{ fontSize: "12px", color: "#999" }}>
                    Tests: {review.summary.tests_run ? `${review.summary.tests_passed}/${review.summary.tests_passed + review.summary.tests_failed}` : "—"}
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
