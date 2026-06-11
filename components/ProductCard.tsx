import type { Product } from "@/lib/data";
import BarsMark from "./BarsMark";

function Check() {
  return (
    <span
      style={{
        flexShrink: 0,
        marginTop: "1px",
        color: "#4285F4",
        display: "inline-flex",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

export default function ProductCard({
  product,
  onBuy,
  stock,
}: {
  product: Product;
  onBuy: () => void;
  stock?: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: "24px",
        background: "#0C0C0C",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "18px",
      }}
    >
      {product.popular && (
        <>
          <div
            style={{
              position: "absolute",
              inset: "-1px",
              border: "1px solid rgba(66,133,244,0.5)",
              borderRadius: "18px",
              boxShadow:
                "0 0 0 1px rgba(66,133,244,0.12),0 24px 70px -28px rgba(66,133,244,0.45)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-11px",
              left: "28px",
              padding: "5px 12px",
              background: "#4285F4",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "#fff",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            MOST POPULAR
          </div>
        </>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <BarsMark variant="card" />
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 10px",
            background: stock === 0 ? "rgba(234,67,53,0.1)" : "rgba(52,168,83,0.1)",
            border: stock === 0 ? "1px solid rgba(234,67,53,0.25)" : "1px solid rgba(52,168,83,0.25)",
            borderRadius: "999px",
            fontSize: "11px",
            color: stock === 0 ? "#F28B82" : "#5BD17E",
            fontFamily: "var(--font-mono), monospace",
            letterSpacing: "0.03em",
          }}
        >
          {stock !== undefined && stock > 0 && (
            <span
              className="anim-pulse-dot"
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#34A853",
              }}
            />
          )}
          {stock === undefined ? "Loading..." : stock === 0 ? "Out of Stock" : `In Stock (${stock} left)`}
        </span>
      </div>

      <div
        style={{
          marginTop: "16px",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "11px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#6A6A6A",
        }}
      >
        {product.tag}
      </div>

      <h3
        style={{
          margin: "10px 0 0",
          fontSize: "21px",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "#F5F5F5",
          lineHeight: 1.25,
        }}
      >
        {product.name}
      </h3>

      <div
        style={{
          marginTop: "12px",
          display: "flex",
          alignItems: "baseline",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "44px",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "#FAFAFA",
          }}
        >
          {product.price}
        </span>
        <span style={{ color: "#6A6A6A", fontSize: "14px" }}>one-time</span>
      </div>

      <p
        style={{
          margin: "10px 0 0",
          fontSize: "14px",
          lineHeight: 1.55,
          color: "#9A9A9A",
        }}
      >
        {product.desc}
      </p>

      <div
        style={{
          height: "1px",
          background: "rgba(255,255,255,0.07)",
          margin: "14px 0",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
        {product.features.map((f) => (
          <div
            key={f}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              fontSize: "13.5px",
              color: "#C8C8C8",
              lineHeight: 1.45,
            }}
          >
            <Check />
            <span>{f}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span style={{ fontSize: "12px", color: "#6A6A6A" }}>Pay with</span>
        <div style={{ display: "flex", gap: "6px" }}>
          <CoinIcon
            symbol="&#8383;"
            color="#F7931A"
            bg="rgba(247,147,26,0.1)"
            border="rgba(247,147,26,0.28)"
          />
          <CoinIcon
            symbol="&#926;"
            color="#8AA0F5"
            bg="rgba(98,126,234,0.1)"
            border="rgba(98,126,234,0.3)"
          />
          <CoinIcon
            symbol="&#8366;"
            color="#3FBF93"
            bg="rgba(38,161,123,0.1)"
            border="rgba(38,161,123,0.3)"
          />
        </div>
      </div>

      <button
        onClick={onBuy}
        className="btn-buy"
        style={{
          marginTop: "14px",
          width: "100%",
          padding: "13px",
          background: "#4285F4",
          color: "#fff",
          border: "none",
          borderRadius: "11px",
          fontSize: "15px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Buy Now
      </button>
    </div>
  );
}

function CoinIcon({
  symbol,
  color,
  bg,
  border,
}: {
  symbol: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: "12px",
        fontWeight: 700,
      }}
      dangerouslySetInnerHTML={{ __html: symbol }}
    />
  );
}
