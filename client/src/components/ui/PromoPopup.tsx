import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'craft_promo_dismissed';

export function PromoPopup() {
  const [visible, setVisible] = useState(false);

  // Show after 3s delay, but only if not previously dismissed
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 296,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      zIndex: 200,
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
      background: '#fff',
      animation: 'promoSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`
        @keyframes promoSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header gradient */}
      <div style={{
        height: 72,
        background: 'linear-gradient(135deg, #bfdbfe 0%, #e0f2fe 40%, #dbeafe 70%, #ede9fe 100%)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        position: 'relative',
      }}>
        {/* CRAFT PLUS badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#111', letterSpacing: '-0.5px' }}>CRAFT</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#fff',
            background: '#111', borderRadius: 6,
            padding: '2px 7px', letterSpacing: '0.04em',
          }}>PLUS</span>
        </div>

        {/* Close button */}
        <button
          onClick={dismiss}
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.12)', border: 'none',
            borderRadius: '50%', width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#333',
          }}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 16px' }}>
        <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: '1.55', color: '#111' }}>
          Go unlimited and get up to{' '}
          <strong>40% off</strong>{' '}
          now. Make the most of this limited time offer today.
        </p>

        <button
          style={{
            width: '100%', padding: '11px 0',
            borderRadius: 10, border: 'none',
            background: '#111', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#333')}
          onMouseLeave={e => (e.currentTarget.style.background = '#111')}
        >
          Upgrade
        </button>
      </div>
    </div>
  );
}
