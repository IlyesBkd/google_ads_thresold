import BarsMark from "./BarsMark";

export default function Navbar({ showNavLinks }: { showNavLinks: boolean }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        background: "rgba(8,8,8,0.72)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <nav
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "15px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <a
          href="#top"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "11px",
            textDecoration: "none",
          }}
        >
          <BarsMark variant="nav" />
          <span
            style={{
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#F5F5F5",
            }}
          >
            GADSCALE
          </span>
        </a>

        {showNavLinks && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "34px",
            }}
          >
            <a
              href="#pricing"
              className="nav-link"
              style={{ fontSize: "14px", textDecoration: "none", fontWeight: 450 }}
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="nav-link"
              style={{ fontSize: "14px", textDecoration: "none", fontWeight: 450 }}
            >
              FAQ
            </a>
            <a
              href="#support"
              className="nav-link"
              style={{ fontSize: "14px", textDecoration: "none", fontWeight: 450 }}
            >
              Support
            </a>
          </div>
        )}

        <a
          href="/account"
          className="btn-orders"
          style={{
            padding: "9px 16px",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "9px",
            color: "#F5F5F5",
            fontSize: "13.5px",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          My Orders
        </a>
      </nav>
    </header>
  );
}
