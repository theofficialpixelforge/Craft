import React, { useEffect, useRef, useCallback } from 'react';
import type { Block } from '../../../types';
import { renderInlineNodes, parseInlineNodes } from '../../../utils/inlineNodes';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorStore } from '../../../store/editorStore';

interface Props { block: Block; }

const PLACEHOLDER: Record<string, string> = {
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
};

export function HeadingBlock({ block }: Props) {
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

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  }, []);

  return (
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={isFocused ? PLACEHOLDER[block.type] || '' : ''}
      className={`block-${block.type} min-h-[1.2em]`}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      onFocus={() => setFocusedBlock(block.id)}
      onBlur={handleBlur}
      onPaste={handlePaste}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      style={{ color: 'var(--text-primary)' }}
    />
  );
}
