import React, { useEffect, useRef, useCallback } from 'react';
import type { Block } from '../../../types';
import { renderInlineNodes, parseInlineNodes } from '../../../utils/inlineNodes';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorStore } from '../../../store/editorStore';

interface Props { block: Block; }

export function QuoteBlock({ block }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { focusedBlockId, setFocusedBlock, updateBlock } = useEditorStore();
  const isFocused = focusedBlockId === block.id;
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
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={isFocused ? 'Quote...' : ''}
      className="block-quote block-text min-h-[1.5em]"
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      onFocus={() => setFocusedBlock(block.id)}
      onBlur={handleBlur}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }}
    />
  );
}
