import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BLOCK_MENU_ITEMS } from '../../types';
import type { BlockType } from '../../types';
import { useEditorStore } from '../../store/editorStore';

interface Props {
  blockId: string;
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function SlashMenu({ blockId, query, onSelect, onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const filtered = BLOCK_MENU_ITEMS.filter(item => {
    if (!query) return true;
    const q = query.toLowerCase();
    return item.label.toLowerCase().includes(q) ||
           item.keywords.some(k => k.includes(q));
  });

  // Position menu at the block's location
  useEffect(() => {
    const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
    if (blockEl) {
      const rect = blockEl.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    }
  }, [blockId]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); if (filtered[selectedIndex]) onSelect(filtered[selectedIndex].type); }
      if (e.key === 'Escape')    { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [filtered, selectedIndex, onSelect, onClose]);

  // Reset selection when filter changes
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (filtered.length === 0) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="slash-menu-enter fixed z-[200] w-72 rounded-xl border border-[var(--border)] bg-[var(--bg-editor)] shadow-2xl overflow-hidden"
      style={{ top: Math.min(position.top, window.innerHeight - 300), left: Math.min(position.left, window.innerWidth - 300) }}
    >
      <div className="px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] border-b border-[var(--border)]">
        TURN INTO
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {filtered.map((item, i) => (
          <button
            key={item.type}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              i === selectedIndex
                ? 'bg-[var(--accent)] text-white'
                : 'hover:bg-[var(--bg-block-hover)] text-[var(--text-primary)]'
            }`}
            onMouseDown={e => { e.preventDefault(); onSelect(item.type); }}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <span className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-medium shrink-0 ${
              i === selectedIndex ? 'bg-white/20 text-white' : 'bg-[var(--bg-block-hover)] text-[var(--text-primary)]'
            }`}>
              {item.icon}
            </span>
            <div>
              <div className="text-sm font-medium">{item.label}</div>
              <div className={`text-xs ${i === selectedIndex ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
