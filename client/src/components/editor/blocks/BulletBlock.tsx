import React, { useEffect, useRef, useCallback } from 'react';
import type { Block } from '../../../types';
import { renderInlineNodes, parseInlineNodes } from '../../../utils/inlineNodes';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorStore } from '../../../store/editorStore';

interface Props { block: Block; }

const BULLETS = ['•', '◦', '▪', '‣', '–'];

export function BulletBlock({ block }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { focusedBlockId, setFocusedBlock, updateBlock } = useEditorStore();
  const isFocused = focusedBlockId === block.id;
  const indent = block.indent || 0;
  const bullet = BULLETS[indent % BULLETS.length];

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

  return (
    <div className="flex items-start gap-2" style={{ paddingLeft: `${indent * 24}px` }}>
      <span className="shrink-0 mt-0.5 text-[var(--text-tertiary)] select-none w-5 text-center leading-7">
        {bullet}
      </span>
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={isFocused ? 'List item' : ''}
        className="block-text flex-1 min-h-[1.5em]"
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
