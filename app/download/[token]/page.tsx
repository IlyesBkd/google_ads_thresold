"use client";

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function DownloadPage() {
  const params = useParams();
  const token = params.token as string;
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/download/${token}`);

      if (!response.ok) {
        const errorText = await response.text();
        setError(errorText || 'Download failed');
        setDownloading(false);
        return;
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'credentials.txt';

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloading(false);
    } catch (err: any) {
      setError(err.message || 'Download failed');
      setDownloading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '520px', width: '100%' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', justifyContent: 'center', marginBottom: '32px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '3px', height: '32px', padding: '6px', background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
            <i style={{ width: '4px', height: '8px', borderRadius: '2px', background: '#4285F4' }}></i>
            <i style={{ width: '4px', height: '13px', borderRadius: '2px', background: '#4285F4' }}></i>
            <i style={{ width: '4px', height: '18px', borderRadius: '2px', background: '#FBBC04' }}></i>
          </span>
          <span style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em' }}>GADSCALE</span>
        </div>

        {/* Card */}
        <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '32px' }}>

          <div style={{ fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.2em', color: '#4285F4', textTransform: 'uppercase', marginBottom: '12px' }}>Download ready</div>

          <h1 style={{ margin: '0 0 16px', fontSize: '26px', fontWeight: 600, letterSpacing: '-0.03em', color: '#FAFAFA' }}>
            Your credentials
          </h1>

          <p style={{ margin: '0 0 28px', fontSize: '14.5px', lineHeight: 1.6, color: '#9A9A9A' }}>
            Click the button below to download your Google Ads account credentials as a .txt file. Save it to a secure location.
          </p>

          {error && (
            <div style={{ marginBottom: '20px', padding: '14px 16px', background: 'rgba(234,67,53,0.08)', border: '1px solid rgba(234,67,53,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#EA4335', marginBottom: '4px' }}>Download failed</div>
                <div style={{ fontSize: '13px', color: '#E8B3B0', lineHeight: 1.5 }}>{error}</div>
              </div>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              width: '100%',
              padding: '16px',
              background: downloading ? '#2a5a9a' : '#4285F4',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: downloading ? 'not-allowed' : 'pointer',
              marginBottom: '20px',
              opacity: downloading ? 0.7 : 1,
              transition: 'all 0.15s',
            }}
          >
            {downloading ? 'Downloading...' : '⬇️ Download credentials.txt'}
          </button>

          {/* Warning */}
          <div style={{ padding: '14px 16px', background: 'rgba(251,188,4,0.06)', border: '1px solid rgba(251,188,4,0.18)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '16px' }}>⏱️</span>
              <div style={{ fontSize: '12.5px', color: '#E8D9A8', lineHeight: 1.5 }}>
                <strong style={{ color: '#FBBC04' }}>Link expires in 24 hours.</strong> You can download up to 3 times. Save the file immediately.
              </div>
            </div>
          </div>
        </div>

        {/* Footer help */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#9A9A9A' }}>
            Need help? Check your email for support instructions.
          </p>
          <a href="/" style={{ fontSize: '13px', color: '#4285F4', textDecoration: 'none' }}>
            ← Back to homepage
          </a>
        </div>

      </div>
    </div>
  );
}
