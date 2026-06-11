"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/data";
import ProductCard from "./ProductCard";

export default function Pricing({
  products,
  onBuy,
}: {
  products: Product[];
  onBuy: (p: Product) => void;
}) {
  const [stock, setStock] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const response = await fetch("/api/public/stock");
        const data = await response.json();
        if (data.success) {
          setStock(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stock:", error);
      }
    };
    fetchStock();
  }, []);
  return (
    <section
      id="pricing"
      style={{
        maxWidth: "1040px",
        margin: "0 auto",
        padding: "clamp(16px,2.5vw,28px) 24px clamp(48px,8vw,90px)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            letterSpacing: "0.2em",
            color: "#4285F4",
            textTransform: "uppercase",
          }}
        >
          Pick your threshold
        </span>
        <h2
          style={{
            margin: "10px 0 0",
            fontSize: "clamp(23px,3.4vw,34px)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "#FAFAFA",
          }}
        >
          Two tiers. Instant delivery, every time.
        </h2>
      </div>

      <div
        style={{
          marginTop: "26px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: "20px",
        }}
      >
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onBuy={() => onBuy(p)} stock={stock[p.id]} />
        ))}
      </div>

      <p
        style={{
          margin: "28px 0 0",
          textAlign: "center",
          fontSize: "13px",
          color: "#6A6A6A",
        }}
      >
        Every account is delivered instantly as a .txt once payment confirms. Replacement
        guaranteed if a login fails on arrival.
      </p>
    </section>
  );
}
