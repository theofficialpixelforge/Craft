import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Block, BlockType, InlineNode } from '../../../types';
import { useEditorStore } from '../../../store/editorStore';
import { renderInlineNodes, parseInlineNodes } from '../../../utils/inlineNodes';
import { useInlineSlash } from '../../../hooks/useInlineSlash';
import { InlineSlashMenu } from '../InlineSlashMenu';

function parseColumns(raw: unknown, count: number): InlineNode[][] {
  if (Array.isArray(raw)) {
    const cols = raw as InlineNode[][];
    if (cols.length === count) return cols;
    if (cols.length < count)
      return [...cols, ...Array.from({ length: count - cols.length }, () => [] as InlineNode[])];
    return cols.slice(0, count);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parseColumns(parsed, count);
    } catch { /* fall through */ }
  }
  return Array.from({ length: count }, () => [] as InlineNode[]);
}

// ── ColumnPane ────────────────────────────────────────────────────────────────

interface PaneProps {
  content: InlineNode[];
  placeholder: string;
  onChange: (nodes: InlineNode[]) => void;
  /** Called when the user picks a block type from the slash menu. */
  onSlashSelect: (type: BlockType) => void;
}

function ColumnPane({ content, placeholder, onChange, onSlashSelect }: PaneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { slashOpen, slashQuery, slashPos, handleInput, deleteSlashText, closeSlash } =
    useInlineSlash();

  // Render content from nodes only when not focused
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      renderInlineNodes(content, ref.current);
    }
  }, [content]);

  const handleBlur = useCallback(() => {
    closeSlash(); // always close the slash menu on blur
    if (ref.current) onChange(parseInlineNodes(ref.current));
  }, [onChange, closeSlash]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.stopPropagation(); // keep all keys inside the column

      // Close slash menu without navigating when Tab is pressed during a command
      if (slashOpen && e.key === 'Tab') {
        e.preventDefault();
        closeSlash();
        return;
      }

      const isMac = navigator.platform.toLowerCase().includes('mac');
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      if (ctrl) {
        if (e.key === 'b') { e.preventDefault(); document.execCommand('bold');      return; }
        if (e.key === 'i') { e.preventDefault(); document.execCommand('italic');    return; }
        if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); return; }
      }

      if (e.key === 'Tab') { e.preventDefault(); }
    },
    [slashOpen, closeSlash],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  }, []);

  /** User picked a block type — delete the '/query' text, close, and notify parent. */
  const handleSelectType = useCallback(
    (type: BlockType) => {
      if (ref.current) deleteSlashText(ref.current);
      closeSlash();
      onSlashSelect(type);
    },
    [deleteSlashText, closeSlash, onSlashSelect],
  );

  return (
    <>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onInput={() => ref.current && handleInput(ref.current)}
        className="block-text"           /* reuses existing placeholder CSS */
        style={{
          minHeight: 60,
          padding: '4px 6px',
          outline: 'none',
          fontSize: 14,
          lineHeight: '1.6',
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      />

      {slashOpen && (
        <InlineSlashMenu
          query={slashQuery}
          pos={slashPos}
          onSelect={handleSelectType}
          onClose={closeSlash}
        />
      )}
    </>
  );
}

// ── ColumnsBlock ──────────────────────────────────────────────────────────────

interface Props {
  block: Block;
  count: 2 | 3;
}

export function ColumnsBlock({ block, count }: Props) {
  const { updateBlock, addBlock } = useEditorStore();
  const [columns, setColumns] = useState<InlineNode[][]>(() =>
    parseColumns(block.columns_data, count),
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Save initial empty state on first mount if block has no columns_data
  useEffect(() => {
    if (!block.columns_data) {
      updateBlock(block.id, { columns_data: columns } as any);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateColumn = useCallback(
    (idx: number, nodes: InlineNode[]) => {
      setColumns(prev => {
        const next = [...prev];
        next[idx] = nodes;
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          updateBlock(block.id, { columns_data: next } as any);
        }, 400);
        return next;
      });
    },
    [block.id, updateBlock],
  );

  /**
   * A column pane's slash command was confirmed.
   * Insert a new block of the chosen type immediately after this columns block,
   * then move focus to its first contenteditable.
   */
  const handleSlashSelect = useCallback(
    async (type: BlockType) => {
      const newBlock = await addBlock(block.id, type);
      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-block-id="${newBlock.id}"] [contenteditable]`,
        ) as HTMLElement | null;
        if (el) el.focus();
      });
    },
    [block.id, addBlock],
  );

  const placeholders = ['Column 1', 'Column 2', 'Column 3'];

  return (
    <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
      {Array.from({ length: count }, (_, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <div
              style={{
                width: 1,
                background: 'var(--border)',
                flexShrink: 0,
                margin: '4px 8px',
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <ColumnPane
              content={columns[i] ?? []}
              placeholder={placeholders[i]}
              onChange={nodes => updateColumn(i, nodes)}
              onSlashSelect={handleSlashSelect}
            />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
