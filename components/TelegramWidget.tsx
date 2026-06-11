"use client";

import { useEffect, useState } from 'react';

/**
 * Telegram Widget - Fixed button for customer support
 * Configurable from admin settings (telegram_username)
 */
export default function TelegramWidget() {
  const [username, setUsername] = useState('@adscale_support');
  const [visible, setVisible] = useState(false);

  // Fetch Telegram username from settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/public/settings');
        const data = await response.json();

        if (data.success && data.data.telegram_username) {
          setUsername(data.data.telegram_username);
        }
      } catch (error) {
        console.error('Failed to load Telegram settings:', error);
        // Fallback to default
      }
    };

    fetchSettings();

    // Show widget after slight delay (better UX)
    setTimeout(() => setVisible(true), 500);
  }, []);

  // Don't render on admin pages
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <a
      href={`https://t.me/${username.replace('@', '')}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 18px 12px 14px',
        background: 'linear-gradient(135deg, #0088cc 0%, #0077b5 100%)',
        color: '#fff',
        borderRadius: '999px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'var(--font-inter), -apple-system, sans-serif',
        boxShadow: '0 4px 16px rgba(0, 136, 204, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 136, 204, 0.5), 0 3px 10px rgba(0, 0, 0, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 136, 204, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)';
      }}
      aria-label="Contact support on Telegram"
    >
      {/* Telegram Icon */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ flexShrink: 0 }}
      >
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.121.099.155.232.171.326.016.094.037.308.021.475z"/>
      </svg>

      <span>Support</span>
    </a>
  );
}
