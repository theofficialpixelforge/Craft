import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Underline, Strikethrough, Code, Link } from 'lucide-react';

interface ToolbarButton {
  icon: React.ReactNode;
  command: string;
  value?: string;
  title: string;
}

const BUTTONS: ToolbarButton[] = [
  { icon: <Bold size={13} />, command: 'bold', title: 'Bold (⌘B)' },
  { icon: <Italic size={13} />, command: 'italic', title: 'Italic (⌘I)' },
  { icon: <Underline size={13} />, command: 'underline', title: 'Underline (⌘U)' },
  { icon: <Strikethrough size={13} />, command: 'strikeThrough', title: 'Strikethrough' },
  { icon: <Code size={13} />, command: 'code', title: 'Inline code' },
  { icon: <Link size={13} />, command: 'link', title: 'Link' },
];

export function FormatToolbar() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setVisible(false);
        setLinkMode(false);
        return;
      }

      // Only show inside the editor
      const range = sel.getRangeAt(0);
      const editorEl = document.getElementById('editor-content');
      if (!editorEl || !editorEl.contains(range.commonAncestorContainer)) {
        setVisible(false);
        return;
      }

      const rect = range.getBoundingClientRect();
      const toolbarWidth = 280;
      setPos({
        top: rect.top - 44 + window.scrollY,
        left: Math.max(8, Math.min(rect.left + rect.width / 2 - toolbarWidth / 2, window.innerWidth - toolbarWidth - 8)),
      });
      setVisible(true);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  // Click outside closes
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setLinkMode(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyFormat = useCallback((btn: ToolbarButton) => {
    if (btn.command === 'code') {
      const sel = window.getSelection();
      const text = sel?.toString() || '';
      document.execCommand('insertHTML', false, `<code>${text}</code>`);
    } else if (btn.command === 'link') {
      setLinkMode(true);
      setLinkUrl('');
    } else {
      document.execCommand(btn.command);
    }
  }, []);

  const applyLink = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (linkUrl.trim()) {
      document.execCommand('createLink', false, linkUrl.trim());
    }
    setLinkMode(false);
    setVisible(false);
  }, [linkUrl]);

  if (!visible) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      className="toolbar-enter fixed z-[300] flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-editor)] shadow-2xl overflow-hidden"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={e => e.preventDefault()}
    >
      {linkMode ? (
        <form onSubmit={applyLink} className="flex items-center gap-2 px-3 py-1.5">
          <Link size={13} className="text-[var(--text-tertiary)]" />
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-44 text-sm bg-transparent outline-none text-[var(--text-primary)]"
          />
          <button type="submit" className="text-xs text-[var(--accent)] hover:underline font-medium">Apply</button>
        </form>
      ) : (
        <>
          {BUTTONS.map(btn => (
            <button
              key={btn.command}
              title={btn.title}
              onMouseDown={(e) => { e.preventDefault(); applyFormat(btn); }}
              className="px-2.5 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-block-hover)] transition-colors"
            >
              {btn.icon}
            </button>
          ))}
        </>
      )}
    </div>,
    document.body
  );
}
