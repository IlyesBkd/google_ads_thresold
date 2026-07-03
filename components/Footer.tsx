import BarsMark from "./BarsMark";

export default function Footer() {
  return (
    <footer
      id="support"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.07)",
        marginTop: "32px",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "26px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          fontSize: "13px",
          color: "#6A6A6A",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BarsMark variant="footer" />
          <span>© 2026 ADSCALE</span>
        </div>
        <div style={{ display: "flex", gap: "22px", flexWrap: "wrap" }}>
          <a href="#pricing" className="footer-link" style={{ color: "#6A6A6A", textDecoration: "none" }}>
            Pricing
          </a>
          <a href="#faq" className="footer-link" style={{ color: "#6A6A6A", textDecoration: "none" }}>
            FAQ
          </a>
          <a href="/account" className="footer-link" style={{ color: "#6A6A6A", textDecoration: "none" }}>
            My Orders
          </a>
          <a href="#" className="footer-link" style={{ color: "#6A6A6A", textDecoration: "none" }}>
            Terms
          </a>
          <a href="https://t.me/Selling_GAds" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ color: "#6A6A6A", textDecoration: "none" }}>
            Telegram
          </a>
        </div>
        <span>Crypto only · Telegram support</span>
      </div>
    </footer>
  );
}
