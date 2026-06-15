/**
 * InlineSlashMenu
 *
 * A slash-command popup for use inside embedded editors (table cells, column
 * panes).  Unlike the main SlashMenu it is positioned by an explicit {top,left}
 * coordinate instead of looking up a [data-block-id] element.
 *
 * Keyboard handling uses the capture phase so it intercepts keys before the
 * host contenteditable's own handlers.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BLOCK_MENU_ITEMS } from '../../types';
import type { BlockType } from '../../types';

interface Props {
  query: string;
  pos: { top: number; left: number };
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function InlineSlashMenu({ query, pos, onSelect, onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = BLOCK_MENU_ITEMS.filter(item => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    );
  });

  // Reset selection whenever the filter result changes
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Keyboard navigation — capture phase so we fire before the cell/pane handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (filtered[selectedIndex]) onSelect(filtered[selectedIndex].type);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler, true /* capture */);
    return () => document.removeEventListener('keydown', handler, true);
  }, [filtered, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Nothing to show → close and render nothing
  if (filtered.length === 0) {
    return null;
  }

  const top  = Math.min(pos.top,  window.innerHeight - 300);
  const left = Math.min(pos.left, window.innerWidth  - 300);

  return createPortal(
    <div
      ref={menuRef}
      className="slash-menu-enter fixed z-[200] w-72 rounded-xl border border-[var(--border)] bg-[var(--bg-editor)] shadow-2xl overflow-hidden"
      style={{ top, left }}
    >
      <div className="px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] border-b border-[var(--border)]">
        INSERT BLOCK AFTER
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
            // onMouseDown + preventDefault keeps focus on the cell/pane so we
            // can still read the caret position for deletion
            onMouseDown={e => { e.preventDefault(); onSelect(item.type); }}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <span
              className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-medium shrink-0 ${
                i === selectedIndex
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--bg-block-hover)] text-[var(--text-primary)]'
              }`}
            >
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
    document.body,
  );
}
