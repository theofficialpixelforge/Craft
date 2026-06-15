import React, { useEffect, useRef, useCallback } from 'react';
import type { Block } from '../../../types';
import { renderInlineNodes, parseInlineNodes } from '../../../utils/inlineNodes';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorStore } from '../../../store/editorStore';

interface Props {
  block: Block;
  placeholder?: string;
  className?: string;
}

export function TextBlock({ block, placeholder = "Type '/' for commands", className = '' }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { focusedBlockId, setFocusedBlock, updateBlock } = useEditorStore();
  const isFocused = focusedBlockId === block.id;
  const lastContent = useRef(block.content);

  const { handleKeyDown, handleInput, handleCompositionStart, handleCompositionEnd } = useBlockEditor(block, contentRef);

  // Render content from nodes (only when content changes externally)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (document.activeElement === el) return; // don't interrupt typing
    renderInlineNodes(block.content, el);
    lastContent.current = block.content;
  }, [block.content]);

  const handleFocus = useCallback(() => {
    setFocusedBlock(block.id);
  }, [block.id, setFocusedBlock]);

  const handleBlur = useCallback(() => {
    const el = contentRef.current;
    if (el) {
      const nodes = parseInlineNodes(el);
      updateBlock(block.id, { content: nodes });
    }
  }, [block.id, updateBlock]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  return (
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={isFocused ? placeholder : ''}
      className={`block-text min-h-[1.5em] ${className}`}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPaste={handlePaste}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      style={{ color: 'var(--text-primary)' }}
    />
  );
}
