'use client';

import { useCallback, useEffect, useState } from 'react';
import { faqs, type Product } from '@/lib/data';
import Navbar from './Navbar';
import Hero from './Hero';
import Pricing from './Pricing';
import Faq from './Faq';
import Footer from './Footer';
import CheckoutModal from './CheckoutModal';
import { track } from '@/lib/analytics';

export default function HomePage({ initialProducts }: { initialProducts: Product[] }) {
  const [isMobile, setIsMobile] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [checkout, setCheckout] = useState<Product | null>(null);
  const products = initialProducts;

  // Top of the funnel: everything else is measured against this.
  useEffect(() => {
    track('shop_viewed', {
      products_in_stock: initialProducts.length,
    });
  }, [initialProducts.length]);

  // responsive: hide nav links under 760px (matches prototype breakpoint)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 760);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const closeCheckout = useCallback(() => {
    document.body.style.overflow = '';
    setCheckout(null);
  }, []);

  // Escape closes the checkout modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCheckout();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCheckout]);

  // restore scroll on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const toggleFaq = (i: number) => setOpenFaq((cur) => (cur === i ? -1 : i));

  const openCheckout = (p: Product) => {
    track('checkout_opened', { product_id: p.id, product_name: p.name });
    document.body.style.overflow = 'hidden';
    setCheckout(p);
  };

  return (
    <div style={{ background: '#080808', minHeight: '100vh' }}>
      <Navbar showNavLinks={!isMobile} />
      <Hero />
      <Pricing products={products} onBuy={openCheckout} />
      <Faq faqs={faqs} openFaq={openFaq} onToggle={toggleFaq} />
      <Footer />

      {checkout && <CheckoutModal checkout={checkout} onClose={closeCheckout} />}
    </div>
  );
}
