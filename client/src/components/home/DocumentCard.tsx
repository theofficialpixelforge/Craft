import React, { useEffect, useState } from 'react';
import { Folder } from 'lucide-react';
import type { Block, Document } from '../../types';
import { api } from '../../api';
import { nodesToPlainText } from '../../utils/inlineNodes';

interface Props {
  doc: Document;
  parentName?: string;
  onClick: () => void;
}

function MiniPreview({ blocks }: { blocks: Block[] }) {
  const visible = blocks.filter(b => b.type !== 'divider').slice(0, 8);
  return (
    <div style={{
      padding: '12px 14px', fontSize: 9, lineHeight: 1.5,
      color: '#333', background: '#fff', height: '100%',
      overflow: 'hidden', fontFamily: 'system-ui',
    }}>
      {visible.map(b => {
        const text = nodesToPlainText(b.content || []);
        if (!text && b.type !== 'divider') return null;
        const style: React.CSSProperties = {};
        if (b.type === 'h1') { style.fontWeight = 800; style.fontSize = 13; style.color = '#111'; style.marginBottom = 4; }
        else if (b.type === 'h2') { style.fontWeight = 700; style.fontSize = 11; style.color = '#222'; style.marginBottom = 3; }
        else if (b.type === 'h3') { style.fontWeight = 600; style.fontSize = 10; style.color = '#333'; }
        else if (b.type === 'code') { style.fontFamily = 'monospace'; style.background = '#f3f4f6'; style.padding = '1px 3px'; style.borderRadius = 2; style.fontSize = 8; }
        else if (b.type === 'quote') { style.borderLeft = '2px solid #ccc'; style.paddingLeft = 5; style.color = '#666'; style.fontStyle = 'italic'; }
        else if (b.type === 'bullet') { return <div key={b.id} style={{ display: 'flex', gap: 3, ...style }}><span>•</span><span>{text}</span></div>; }
        else if (b.type === 'todo') { return <div key={b.id} style={{ display: 'flex', gap: 3, ...style }}><span style={{ opacity: 0.5 }}>☐</span><span>{text}</span></div>; }
        else if (b.type === 'divider') { return <hr key={b.id} style={{ border: 'none', borderTop: '1px solid #eee', margin: '3px 0' }} />; }
        return <div key={b.id} style={style}>{text}</div>;
      })}
    </div>
  );
}

function timeAgo(dateStr: string) {
  if (!dateStr) return 'Updated';
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

export function DocumentCard({ doc, parentName, onClick }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    api.getBlocks(doc.id).then(setBlocks).catch(() => {});
  }, [doc.id]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'var(--bg-sidebar)',
        border: '1px solid var(--border)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
        borderColor: hovered ? 'var(--accent)' : 'var(--border)',
      }}
    >
      {/* Preview thumbnail */}
      <div style={{ height: 180, overflow: 'hidden', background: '#f9f9f9', position: 'relative' }}>
        <div style={{ transform: 'scale(0.65)', transformOrigin: 'top left', width: '154%', height: '154%', pointerEvents: 'none' }}>
          <MiniPreview blocks={blocks} />
        </div>
        {blocks.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 32, background: '#f5f5f5',
          }}>
            {doc.emoji || '📄'}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
          {doc.emoji && <span>{doc.emoji}</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title || 'Untitled'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
          <Folder size={10} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
            {parentName || 'My Space'}
          </span>
          <span>•</span>
          <span>{timeAgo(doc.updated_at || '')}</span>
        </div>
      </div>
    </div>
  );
}
