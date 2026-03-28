import { Link } from "react-router-dom";

interface Breadcrumb {
  label: string;
  to?: string;
}

interface NavBarProps {
  breadcrumbs?: Breadcrumb[];
}

function ShieldLogo() {
  return (
    <svg width="28" height="32" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3AA899" />
          <stop offset="100%" stopColor="#2D7A6F" />
        </linearGradient>
      </defs>
      <path
        d="M14 0L28 6V14C28 22.8 22.4 30.4 14 32C5.6 30.4 0 22.8 0 14V6L14 0Z"
        fill="url(#tealGrad)"
      />
      <path
        d="M12 18L9 15L7.5 16.5L12 21L21 12L19.5 10.5L12 18Z"
        fill="white"
      />
    </svg>
  );
}

export function NavBar({ breadcrumbs }: NavBarProps) {
  return (
    <nav
      data-testid="navbar"
      style={{
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E5E1DB",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <Link to="/projects" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
        <ShieldLogo />
        <span style={{ fontSize: "18px", fontWeight: 700, color: "#2D7A6F" }}>
          CodeGuard
        </span>
      </Link>

      {breadcrumbs && breadcrumbs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#D6D2CC" }}>/</span>
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  style={{ color: "#2D7A6F", textDecoration: "none", fontWeight: 500 }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: "#7A7570", fontWeight: 500 }}>{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </nav>
  );
}
