import React, { useEffect, useRef, useCallback } from 'react';
import type { Block } from '../../../types';
import { renderInlineNodes, parseInlineNodes } from '../../../utils/inlineNodes';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorStore } from '../../../store/editorStore';

interface Props { block: Block; }

export function TodoBlock({ block }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { focusedBlockId, setFocusedBlock, updateBlock } = useEditorStore();
  const isFocused = focusedBlockId === block.id;
  const indent = block.indent || 0;
  const checked = !!block.checked;

  const { handleKeyDown, handleInput, handleCompositionStart, handleCompositionEnd } = useBlockEditor(block, contentRef);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || document.activeElement === el) return;
    renderInlineNodes(block.content, el);
  }, [block.content]);

  const handleBlur = useCallback(() => {
    const el = contentRef.current;
    if (el) updateBlock(block.id, { content: parseInlineNodes(el) });
  }, [block.id, updateBlock]);

  const toggleCheck = useCallback(() => {
    updateBlock(block.id, { checked: !checked });
  }, [block.id, checked, updateBlock]);

  return (
    <div className="flex items-start gap-2" style={{ paddingLeft: `${indent * 24}px` }}>
      <button
        onClick={toggleCheck}
        className={`shrink-0 mt-1 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
          checked
            ? 'bg-[var(--accent)] border-[var(--accent)]'
            : 'border-[var(--border)] hover:border-[var(--accent)]'
        }`}
        tabIndex={-1}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={isFocused ? 'To-do' : ''}
        className={`block-text flex-1 min-h-[1.5em] transition-opacity ${checked ? 'line-through opacity-50' : ''}`}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onFocus={() => setFocusedBlock(block.id)}
        onBlur={handleBlur}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }}
        style={{ color: 'var(--text-primary)' }}
      />
    </div>
  );
}
