/**
 * useInlineSlash
 *
 * Detects when the user types `/` inside a contentEditable element and manages
 * the slash-menu state (open, query, screen position).
 *
 * Usage:
 *   const { slashOpen, slashQuery, slashPos, handleInput, deleteSlashText, closeSlash } = useInlineSlash();
 *
 *   // In the contenteditable's onInput handler:
 *   onInput={() => ref.current && handleInput(ref.current)}
 *
 *   // When a menu item is selected:
 *   deleteSlashText(ref.current);  // removes '/query' from the element
 *   closeSlash();
 */

import { useState, useRef, useCallback } from 'react';

function getCursorScreenPos(): { top: number; left: number } {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { top: 0, left: 0 };
  try {
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  } catch {
    return { top: 0, left: 0 };
  }
}

function getCaretTextOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  try {
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(el);
    range.setEnd(sel.anchorNode!, sel.anchorOffset);
    return range.toString().length;
  } catch {
    return 0;
  }
}

export function useInlineSlash() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Refs so callbacks always see fresh values without needing them as deps
  const openRef = useRef(false);
  const queryRef = useRef('');

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    openRef.current = false;
    queryRef.current = '';
  }, []);

  /**
   * Call this inside the contenteditable's `onInput` event handler.
   * It inspects the text before the caret for a `/query` pattern and
   * opens/updates/closes the slash menu accordingly.
   */
  const handleInput = useCallback((el: HTMLElement) => {
    const text = el.innerText ?? '';
    const caretOffset = getCaretTextOffset(el);
    const textBeforeCaret = text.slice(0, caretOffset);

    const slashIdx = textBeforeCaret.lastIndexOf('/');

    if (slashIdx !== -1) {
      const afterSlash = textBeforeCaret.slice(slashIdx + 1);
      // Only treat as a command if no whitespace follows the slash
      if (!/\s/.test(afterSlash)) {
        if (!openRef.current) {
          // Capture cursor position the first time we open
          setPos(getCursorScreenPos());
          setOpen(true);
          openRef.current = true;
        }
        setQuery(afterSlash);
        queryRef.current = afterSlash;
        return;
      }
    }

    // No valid slash pattern → close if open
    if (openRef.current) close();
  }, [close]);

  /**
   * Deletes the '/query' text that sits just behind the current caret.
   * Call this (while the element still has focus) before processing the
   * selected block type.
   *
   * Uses Selection.modify (non-standard but universally supported) to
   * extend the selection backwards character by character, then removes
   * it via execCommand so contenteditable mutation observers fire normally.
   */
  const deleteSlashText = useCallback((el: HTMLElement) => {
    const charCount = queryRef.current.length + 1; // +1 for the '/' itself
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    // Extend selection backwards one character at a time
    for (let i = 0; i < charCount; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sel as any).modify('extend', 'backward', 'character');
    }
    // Delete the selected range (deprecated but still the only clean way)
    document.execCommand('delete');
  }, []);

  return {
    slashOpen: open,
    slashQuery: query,
    slashPos: pos,
    handleInput,
    deleteSlashText,
    closeSlash: close,
  };
}
