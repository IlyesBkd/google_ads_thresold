import type { Product } from "@/lib/data";
import Image from "next/image";

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
        <Image src="/google-ads.png" alt="Google Ads" width={36} height={36} />
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
          <CoinIcon coin="BTC" />
          <CoinIcon coin="ETH" />
          <CoinIcon coin="USDT" />
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

function CoinIcon({ coin, size = 24 }: { coin: "BTC" | "ETH" | "USDT"; size?: number }) {
  if (coin === "BTC") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#F7931A" />
        <path
          fill="#fff"
          d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"
        />
      </svg>
    );
  }
  if (coin === "ETH") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <g fill="#fff" fillRule="nonzero">
          <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z" />
          <path d="M16.498 4L9 16.22l7.498-3.35z" />
          <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z" />
          <path d="M16.498 27.995v-6.028L9 17.616z" />
          <path fillOpacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z" />
          <path fillOpacity=".602" d="M9 16.22l7.498 4.353v-7.701z" />
        </g>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        fill="#fff"
        d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"
      />
    </svg>
  );
}
