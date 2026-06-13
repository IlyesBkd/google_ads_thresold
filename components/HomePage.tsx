"use client";

import { useCallback, useEffect, useState } from "react";
import {
  products as staticProducts,
  faqs,
  type Product,
} from "@/lib/data";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Pricing from "./Pricing";
import Faq from "./Faq";
import Footer from "./Footer";
import CheckoutModal from "./CheckoutModal";

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [checkout, setCheckout] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>(staticProducts);

  // Fetch products from DB (overrides static data with live prices)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/public/products");
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setProducts(data.data);
        }
      } catch {
        // Keep static fallback
      }
    };
    fetchProducts();
  }, []);

  // responsive: hide nav links under 760px (matches prototype breakpoint)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 760);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const closeCheckout = useCallback(() => {
    document.body.style.overflow = "";
    setCheckout(null);
  }, []);

  // Escape closes the checkout modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCheckout();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeCheckout]);

  // restore scroll on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const toggleFaq = (i: number) =>
    setOpenFaq((cur) => (cur === i ? -1 : i));

  const openCheckout = (p: Product) => {
    document.body.style.overflow = "hidden";
    setCheckout(p);
  };

  return (
    <div style={{ background: "#080808", minHeight: "100vh" }}>
      <Navbar showNavLinks={!isMobile} />
      <Hero />
      <Pricing products={products} onBuy={openCheckout} />
      <Faq faqs={faqs} openFaq={openFaq} onToggle={toggleFaq} />
      <Footer />

      {checkout && (
        <CheckoutModal
          checkout={checkout}
          onClose={closeCheckout}
        />
      )}
    </div>
  );
}
