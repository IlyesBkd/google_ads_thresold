"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  products,
  faqs,
  feedData,
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
  const [feedIndex, setFeedIndex] = useState(0);

  // responsive: hide nav links under 760px (matches prototype breakpoint)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 760);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // rotating live feed every 3.6s
  useEffect(() => {
    const id = setInterval(
      () => setFeedIndex((i) => (i + 1) % feedData.length),
      3600
    );
    return () => clearInterval(id);
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
      <Hero currentFeed={feedData[feedIndex]} feedIndex={feedIndex} />
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
