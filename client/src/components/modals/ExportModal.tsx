import React from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';

interface Props {
  blobUrl: string;
  filename: string;
  onClose: () => void;
}

export function ExportModal({ blobUrl, filename, onClose }: Props) {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-editor)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '28px 32px',
        width: 360,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Your document has been exported! 🎉
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>
            Download the exported document below
          </p>

          <button
            onClick={handleDownload}
            style={{
              width: '100%', padding: '10px 0',
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 500,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Download size={15} />
            Download
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
