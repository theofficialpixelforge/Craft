import React, { useRef, useCallback } from 'react';
import type { Block } from '../../../types';
import { useEditorStore } from '../../../store/editorStore';
import { nodesToPlainText, parseInlineNodes } from '../../../utils/inlineNodes';
import { useBlockEditor } from '../../../hooks/useBlockEditor';

interface Props { block: Block; }

const LANGUAGES = ['', 'javascript', 'typescript', 'python', 'rust', 'go', 'java', 'c', 'cpp', 'css', 'html', 'json', 'bash', 'sql', 'markdown'];

export function CodeBlock({ block }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { setFocusedBlock, updateBlock } = useEditorStore();
  const { blocks, addBlock, deleteBlock } = useEditorStore();
  const blockIndex = blocks.findIndex(b => b.id === block.id);

  const text = nodesToPlainText(block.content);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateBlock(block.id, { content: [{ t: 'text', v: e.target.value }] });
  }, [block.id, updateBlock]);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const ctrl = isMac ? e.metaKey : e.ctrlKey;

    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = text.substring(0, start) + '  ' + text.substring(end);
      updateBlock(block.id, { content: [{ t: 'text', v: newValue }] });
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
      return;
    }

    if (e.key === 'Enter' && ctrl) {
      e.preventDefault();
      const newBlock = await addBlock(block.id, 'text');
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-block-id="${newBlock.id}"] [contenteditable]`) as HTMLElement;
        if (el) el.focus();
      });
    }

    if (e.key === 'Backspace' && !text) {
      e.preventDefault();
      const prev = blocks[blockIndex - 1];
      await deleteBlock(block.id);
      requestAnimationFrame(() => {
        const target = prev
          ? document.querySelector(`[data-block-id="${prev.id}"] [contenteditable]`) as HTMLElement
          : null;
        if (target) target.focus();
      });
    }
  }, [block.id, text, addBlock, deleteBlock, blocks, blockIndex, updateBlock]);

  return (
    <div className="block-code relative group">
      <div className="flex items-center justify-between mb-2 -mt-1">
        <select
          value={block.language || ''}
          onChange={e => updateBlock(block.id, { language: e.target.value || null })}
          className="text-xs bg-transparent text-[var(--text-tertiary)] border-none outline-none cursor-pointer hover:text-[var(--text-secondary)]"
        >
          {LANGUAGES.map(l => <option key={l} value={l}>{l || 'plain text'}</option>)}
        </select>
        <button
          onClick={() => navigator.clipboard.writeText(text)}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Copy
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocusedBlock(block.id)}
        spellCheck={false}
        className="w-full bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-[var(--text-primary)] min-h-[3em]"
        rows={Math.max(3, text.split('\n').length + 1)}
        placeholder="// code here..."
      />
    </div>
  );
}
