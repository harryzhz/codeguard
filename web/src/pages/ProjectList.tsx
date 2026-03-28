import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Project } from "../api/client";
import { fetchProjects } from "../api/client";
import { NavBar } from "../components/NavBar";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <NavBar />
      <div style={{ padding: "24px", maxWidth: "960px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "20px" }}>Projects</h1>
        {loading && <p data-testid="loading">Loading...</p>}
        {error && <p data-testid="error" style={{ color: "#D1453B" }}>{error}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.name}/reviews`}
              data-testid="project-card"
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
                  <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#1A1A1A" }}>
                    {project.name}
                  </h2>
                </div>
                <span style={{ fontSize: "12px", color: "#7A7570" }}>
                  {project.created_at && relativeTime(project.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
