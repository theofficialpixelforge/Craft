import React, { useCallback } from 'react';
import type { Block } from '../../../types';
import { useEditorStore } from '../../../store/editorStore';

interface Props { block: Block; }

export function DividerBlock({ block }: Props) {
  const { addBlock, deleteBlock, blocks } = useEditorStore();
  const blockIndex = blocks.findIndex(b => b.id === block.id);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = blocks[blockIndex + 1];
      if (next) {
        const el = document.querySelector(`[data-block-id="${next.id}"] [contenteditable]`) as HTMLElement;
        if (el) el.focus();
      } else {
        const newBlock = await addBlock(block.id, 'text');
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-block-id="${newBlock.id}"] [contenteditable]`) as HTMLElement;
          if (el) el.focus();
        });
      }
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
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
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = blocks[blockIndex - 1];
      if (prev) {
        const el = document.querySelector(`[data-block-id="${prev.id}"] [contenteditable]`) as HTMLElement;
        if (el) el.focus();
      }
    }
  }, [block.id, blocks, blockIndex, addBlock, deleteBlock]);

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="group py-3 outline-none focus:ring-0"
    >
      <hr className="border-[var(--border)] group-focus:border-[var(--accent)]" />
    </div>
  );
}
