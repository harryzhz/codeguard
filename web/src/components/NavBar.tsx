import { Link } from "react-router-dom";

interface Breadcrumb {
  label: string;
  to?: string;
}

interface NavBarProps {
  breadcrumbs?: Breadcrumb[];
}

export function NavBar({ breadcrumbs }: NavBarProps) {
  return (
    <nav
      data-testid="navbar"
      style={{
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <Link to="/projects" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
        <span style={{ color: "#6ED2B7", fontSize: "20px" }}>&#9679;</span>
        <span style={{ fontSize: "20px", fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.5px" }}>
          CodeGuard
        </span>
      </Link>

      {breadcrumbs && breadcrumbs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#ccc" }}>/</span>
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  style={{ color: "#6ED2B7", textDecoration: "none", fontWeight: 500 }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: "#999", fontWeight: 500 }}>{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </nav>
  );
}
