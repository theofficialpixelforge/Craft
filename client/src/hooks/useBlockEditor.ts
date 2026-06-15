import { useCallback, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { Block, BlockType } from '../types';
import {
  isCaretAtStart, isCaretAtEnd, isCaretOnFirstLine, isCaretOnLastLine,
  setCaretToEnd, setCaretToStart, splitAtCaret, parseInlineNodes,
} from '../utils/inlineNodes';

const MARKDOWN_SHORTCUTS: Record<string, BlockType> = {
  '#': 'h1', '##': 'h2', '###': 'h3',
  '-': 'bullet', '*': 'bullet',
  '1.': 'numbered',
  '[]': 'todo', '[ ]': 'todo',
  '>': 'quote',
  '```': 'code',
  '---': 'divider',
};

export function useBlockEditor(block: Block, contentRef: React.RefObject<HTMLDivElement | null>) {
  const { blocks, addBlock, updateBlock, deleteBlock, setFocusedBlock, openSlashMenu, closeSlashMenu, slashMenuOpen } = useEditorStore();
  const isComposing = useRef(false);

  const blockIndex = blocks.findIndex(b => b.id === block.id);

  const focusPrev = useCallback(() => {
    const prev = blocks[blockIndex - 1];
    if (!prev) return;
    setFocusedBlock(prev.id);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-block-id="${prev.id}"] [contenteditable]`) as HTMLElement;
      if (el) { el.focus(); setCaretToEnd(el); }
    });
  }, [blocks, blockIndex, setFocusedBlock]);

  const focusNext = useCallback(() => {
    const next = blocks[blockIndex + 1];
    if (!next) return;
    setFocusedBlock(next.id);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-block-id="${next.id}"] [contenteditable]`) as HTMLElement;
      if (el) { el.focus(); setCaretToStart(el); }
    });
  }, [blocks, blockIndex, setFocusedBlock]);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isComposing.current) return;
    const el = contentRef.current;
    if (!el) return;

    const isMac = navigator.platform.toLowerCase().includes('mac');
    const ctrl = isMac ? e.metaKey : e.ctrlKey;

    // ── Inline formatting ─────────────────────────────────────────────────
    if (ctrl) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); document.execCommand('bold'); return;
        case 'i': e.preventDefault(); document.execCommand('italic'); return;
        case 'u': e.preventDefault(); document.execCommand('underline'); return;
        case '`': e.preventDefault(); document.execCommand('insertHTML', false, `<code>${getSelectionText()}</code>`); return;
      }
    }

    // ── Enter ─────────────────────────────────────────────────────────────
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (slashMenuOpen) return; // let slash menu handle it

      if (block.type === 'divider') {
        await addBlock(block.id, 'text');
        return;
      }

      const [before, after] = splitAtCaret(el);

      // Update current block with content before cursor
      await updateBlock(block.id, { content: before });

      // Determine type for new block
      const newType: BlockType = (['bullet', 'numbered', 'todo'].includes(block.type))
        ? (after.length > 0 ? block.type : 'text')
        : 'text';
      const newIndent = newType !== 'text' ? block.indent : 0;

      const newBlock = await addBlock(block.id, newType, after, { indent: newIndent });

      requestAnimationFrame(() => {
        const newEl = document.querySelector(`[data-block-id="${newBlock.id}"] [contenteditable]`) as HTMLElement;
        if (newEl) { newEl.focus(); setCaretToStart(newEl); }
      });
      return;
    }

    // ── Backspace ─────────────────────────────────────────────────────────
    if (e.key === 'Backspace') {
      const empty = !el.textContent && !el.innerText;
      const atStart = isCaretAtStart(el);

      if (block.type !== 'text' && (empty || atStart)) {
        e.preventDefault();
        // Reset block type to text on Backspace at start
        await updateBlock(block.id, { type: 'text', indent: 0 });
        requestAnimationFrame(() => { el.focus(); setCaretToStart(el); });
        return;
      }

      if (atStart && blockIndex > 0) {
        e.preventDefault();
        const prevBlock = blocks[blockIndex - 1];
        if (!prevBlock) return;

        if (empty) {
          await deleteBlock(block.id);
          requestAnimationFrame(() => {
            const prevEl = document.querySelector(`[data-block-id="${prevBlock.id}"] [contenteditable]`) as HTMLElement;
            if (prevEl) { prevEl.focus(); setCaretToEnd(prevEl); }
          });
        } else {
          // Merge: append current content to previous
          const curContent = parseInlineNodes(el);
          const mergedContent = [...(prevBlock.content || []), ...curContent];
          await updateBlock(prevBlock.id, { content: mergedContent });
          await deleteBlock(block.id);
          requestAnimationFrame(() => {
            const prevEl = document.querySelector(`[data-block-id="${prevBlock.id}"] [contenteditable]`) as HTMLElement;
            if (prevEl) { prevEl.focus(); setCaretToEnd(prevEl); }
          });
        }
        return;
      }
    }

    // ── Tab / Shift+Tab ───────────────────────────────────────────────────
    if (e.key === 'Tab') {
      const isListType = ['bullet', 'numbered', 'todo'].includes(block.type);
      if (isListType) {
        e.preventDefault();
        const newIndent = e.shiftKey
          ? Math.max(0, (block.indent || 0) - 1)
          : Math.min(4, (block.indent || 0) + 1);
        await updateBlock(block.id, { indent: newIndent });
      }
      return;
    }

    // ── Arrow navigation ──────────────────────────────────────────────────
    if (e.key === 'ArrowUp' && isCaretOnFirstLine(el)) {
      e.preventDefault();
      focusPrev();
      return;
    }
    if (e.key === 'ArrowDown' && isCaretOnLastLine(el)) {
      e.preventDefault();
      focusNext();
      return;
    }
  }, [block, blocks, blockIndex, addBlock, updateBlock, deleteBlock, setFocusedBlock, focusPrev, focusNext, slashMenuOpen]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (isComposing.current) return;
    const el = contentRef.current;
    if (!el) return;

    const text = el.textContent || '';
    const content = parseInlineNodes(el);

    // Check for slash command
    if (text.endsWith('/') || text.match(/\/[\w]*$/)) {
      const slashIdx = text.lastIndexOf('/');
      const query = text.slice(slashIdx + 1);
      // Only open if slash is at the very start or after space
      const beforeSlash = text.slice(0, slashIdx);
      if (!beforeSlash || beforeSlash.endsWith(' ')) {
        openSlashMenu(block.id, query);
        updateBlock(block.id, { content });
        return;
      }
    } else if (slashMenuOpen) {
      closeSlashMenu();
    }

    // Check for markdown shortcuts on Space
    if (text.endsWith(' ')) {
      const trimmed = text.trimEnd();
      const newType = MARKDOWN_SHORTCUTS[trimmed];
      if (newType) {
        el.textContent = '';
        if (newType === 'divider') {
          updateBlock(block.id, { type: newType, content: [] });
        } else {
          updateBlock(block.id, { type: newType, content: [] });
        }
        return;
      }
    }

    updateBlock(block.id, { content });
  }, [block.id, openSlashMenu, closeSlashMenu, updateBlock, slashMenuOpen]);

  const handleCompositionStart = useCallback(() => { isComposing.current = true; }, []);
  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLDivElement>) => {
    isComposing.current = false;
    const el = contentRef.current;
    if (el) updateBlock(block.id, { content: parseInlineNodes(el) });
  }, [block.id, updateBlock]);

  return { handleKeyDown, handleInput, handleCompositionStart, handleCompositionEnd, focusPrev, focusNext };
}

function getSelectionText(): string {
  return window.getSelection()?.toString() || '';
}
