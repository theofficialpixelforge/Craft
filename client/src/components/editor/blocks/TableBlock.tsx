import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Block, BlockType, TableData } from '../../../types';
import { useEditorStore } from '../../../store/editorStore';
import { useInlineSlash } from '../../../hooks/useInlineSlash';
import { InlineSlashMenu } from '../InlineSlashMenu';

function defaultTable(): TableData {
  return {
    hasHeader: true,
    rows: [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ],
  };
}

function parseTableData(raw: unknown): TableData {
  if (!raw) return defaultTable();
  if (typeof raw === 'object' && raw !== null && 'rows' in raw) return raw as TableData;
  try { return JSON.parse(raw as string); } catch { return defaultTable(); }
}

// ── Cell ──────────────────────────────────────────────────────────────────────

interface CellProps {
  value: string;
  isHeader: boolean;
  rowIdx: number;
  colIdx: number;
  tableId: string;
  onChange: (v: string) => void;
  onTab: (shift: boolean) => void;
  onEnter: () => void;
  /** Called when the user picks a block type from the slash menu. */
  onSlashSelect: (type: BlockType) => void;
}

function Cell({
  value, isHeader, rowIdx, colIdx, tableId,
  onChange, onTab, onEnter, onSlashSelect,
}: CellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const { slashOpen, slashQuery, slashPos, handleInput, deleteSlashText, closeSlash } =
    useInlineSlash();

  // Sync DOM when value changes from outside (structural changes only)
  useEffect(() => {
    if (ref.current && !focused.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.stopPropagation(); // never let the parent block editor intercept

      // While slash menu is open, Tab closes menu but does NOT navigate cells
      if (slashOpen && e.key === 'Tab') {
        e.preventDefault();
        closeSlash();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        onChange(ref.current?.innerText ?? '');
        onTab(e.shiftKey);
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onChange(ref.current?.innerText ?? '');
        onEnter();
      }
    },
    [onChange, onTab, onEnter, slashOpen, closeSlash],
  );

  /** User picked a block type — delete '/query', close menu, notify parent. */
  const handleSelectType = useCallback(
    (type: BlockType) => {
      if (ref.current) deleteSlashText(ref.current);
      closeSlash();
      onSlashSelect(type);
    },
    [deleteSlashText, closeSlash, onSlashSelect],
  );

  const Tag = isHeader ? 'th' : 'td';

  return (
    <Tag
      data-row={rowIdx}
      data-col={colIdx}
      style={{
        border: '1px solid var(--border)',
        padding: 0,
        minWidth: 80,
        verticalAlign: 'top',
        background: isHeader ? 'var(--bg-block-hover)' : 'transparent',
      }}
    >
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => { focused.current = true; }}
        onBlur={e => {
          focused.current = false;
          closeSlash(); // always dismiss slash menu when cell loses focus
          onChange(e.currentTarget.innerText ?? '');
        }}
        onInput={e => {
          const el = e.currentTarget as HTMLDivElement;
          onChange(el.innerText ?? '');
          handleInput(el); // slash detection
        }}
        onKeyDown={handleKeyDown}
        onPaste={e => {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
        style={{
          padding: '6px 10px',
          minHeight: 30,
          outline: 'none',
          fontSize: 14,
          lineHeight: '1.5',
          fontWeight: isHeader ? 600 : 400,
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      />

      {/* Portal to document.body — safe inside a <td> because createPortal bypasses table DOM */}
      {slashOpen && (
        <InlineSlashMenu
          query={slashQuery}
          pos={slashPos}
          onSelect={handleSelectType}
          onClose={closeSlash}
        />
      )}
    </Tag>
  );
}

// ── TableBlock ────────────────────────────────────────────────────────────────

export function TableBlock({ block }: { block: Block }) {
  const { updateBlock, addBlock } = useEditorStore();
  const [data, setData] = useState<TableData>(() => parseTableData(block.table_data));
  const [hovRow, setHovRow] = useState<number | null>(null);
  const [hovCol, setHovCol] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Save defaults on first mount if block has no table_data yet
  useEffect(() => {
    if (!block.table_data) {
      updateBlock(block.id, { table_data: data } as any);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback((next: TableData) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateBlock(block.id, { table_data: next } as any);
    }, 400);
  }, [block.id, updateBlock]);

  const mutate = useCallback((fn: (d: TableData) => void) => {
    setData(prev => {
      const next: TableData = { hasHeader: prev.hasHeader, rows: prev.rows.map(r => [...r]) };
      fn(next);
      save(next);
      return next;
    });
  }, [save]);

  const setCell = useCallback((rowIdx: number, colIdx: number, value: string) => {
    mutate(d => { d.rows[rowIdx][colIdx] = value; });
  }, [mutate]);

  const focusCell = useCallback((rowIdx: number, colIdx: number) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-table-block="${block.id}"] th[data-row="${rowIdx}"][data-col="${colIdx}"] [contenteditable],
         [data-table-block="${block.id}"] td[data-row="${rowIdx}"][data-col="${colIdx}"] [contenteditable]`,
      ) as HTMLElement | null;
      el?.focus();
    });
  }, [block.id]);

  const addRow = useCallback((afterIdx?: number) => {
    mutate(d => {
      const cols = d.rows[0]?.length ?? 1;
      const newRow = Array(cols).fill('');
      d.rows.splice(afterIdx === undefined ? d.rows.length : afterIdx + 1, 0, newRow);
    });
  }, [mutate]);

  const addColumn = useCallback(() => {
    mutate(d => d.rows.forEach(r => r.push('')));
  }, [mutate]);

  const deleteRow = useCallback((idx: number) => {
    if (data.rows.length <= 1) return;
    mutate(d => d.rows.splice(idx, 1));
  }, [data.rows.length, mutate]);

  const deleteColumn = useCallback((idx: number) => {
    if ((data.rows[0]?.length ?? 0) <= 1) return;
    mutate(d => d.rows.forEach(r => r.splice(idx, 1)));
  }, [data, mutate]);

  /**
   * A cell's slash command was confirmed.
   * Insert a new block of the chosen type immediately after this table block,
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

  const colCount = data.rows[0]?.length ?? 0;

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--bg-block-hover)', color: 'var(--text-secondary)',
    fontSize: 12, fontWeight: 500, cursor: 'pointer',
  };

  return (
    <div data-table-block={block.id} style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        {/* Column header row — shows delete button on hover */}
        {data.rows.length > 0 && (
          <thead>
            <tr>
              {data.rows[0].map((_, colIdx) => (
                <th
                  key={colIdx}
                  onMouseEnter={() => setHovCol(colIdx)}
                  onMouseLeave={() => setHovCol(null)}
                  style={{
                    padding: '2px 4px 0',
                    border: 'none',
                    background: 'none',
                    verticalAlign: 'bottom',
                    textAlign: 'center',
                    height: hovCol === colIdx ? 24 : 6,
                    transition: 'height 0.1s',
                  }}
                >
                  {hovCol === colIdx && colCount > 1 && (
                    <button
                      onClick={() => deleteColumn(colIdx)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-tertiary)', display: 'flex', margin: '0 auto',
                      }}
                      title="Delete column"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
        )}

        <tbody>
          {data.rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              onMouseEnter={() => setHovRow(rowIdx)}
              onMouseLeave={() => setHovRow(null)}
              style={{ position: 'relative' }}
            >
              {row.map((cellValue, colIdx) => (
                <Cell
                  key={`${rowIdx}-${colIdx}`}
                  value={cellValue}
                  isHeader={data.hasHeader && rowIdx === 0}
                  rowIdx={rowIdx}
                  colIdx={colIdx}
                  tableId={block.id}
                  onChange={v => setCell(rowIdx, colIdx, v)}
                  onTab={shift => {
                    if (!shift) {
                      if (colIdx + 1 < row.length) focusCell(rowIdx, colIdx + 1);
                      else if (rowIdx + 1 < data.rows.length) focusCell(rowIdx + 1, 0);
                      else { addRow(); setTimeout(() => focusCell(rowIdx + 1, 0), 30); }
                    } else {
                      if (colIdx > 0) focusCell(rowIdx, colIdx - 1);
                      else if (rowIdx > 0) focusCell(rowIdx - 1, row.length - 1);
                    }
                  }}
                  onEnter={() => { addRow(rowIdx); setTimeout(() => focusCell(rowIdx + 1, colIdx), 30); }}
                  onSlashSelect={handleSlashSelect}
                />
              ))}

              {/* Row delete button */}
              <td style={{ border: 'none', padding: '0 4px', width: 20, background: 'none' }}>
                {hovRow === rowIdx && data.rows.length > 1 && (
                  <button
                    onClick={() => deleteRow(rowIdx)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-tertiary)', display: 'flex',
                    }}
                    title="Delete row"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button onClick={() => addRow()} style={btnStyle}>
          <Plus size={11} /> Row
        </button>
        <button onClick={addColumn} style={btnStyle}>
          <Plus size={11} /> Column
        </button>
        <button
          onClick={() => mutate(d => { d.hasHeader = !d.hasHeader; })}
          style={{ ...btnStyle, color: data.hasHeader ? 'var(--accent)' : 'var(--text-secondary)' }}
        >
          Header row {data.hasHeader ? 'on' : 'off'}
        </button>
      </div>
    </div>
  );
}
