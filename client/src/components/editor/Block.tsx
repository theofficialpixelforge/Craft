import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus } from 'lucide-react';
import type { Block as BlockType, BlockType as BT } from '../../types';
import { BlockRenderer } from './BlockRenderer';
import { SlashMenu } from './SlashMenu';
import { useEditorStore } from '../../store/editorStore';
import { cn } from '../../utils/cn';

interface Props {
  block: BlockType;
  numberedIndex: number;
}

export function Block({ block, numberedIndex }: Props) {
  const {
    focusedBlockId, slashMenuOpen, slashMenuBlockId, slashMenuQuery,
    addBlock, updateBlock, changeBlockType, closeSlashMenu,
  } = useEditorStore();

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleAddBelow = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newBlock = await addBlock(block.id, 'text');
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-block-id="${newBlock.id}"] [contenteditable]`) as HTMLElement;
      if (el) el.focus();
    });
  }, [block.id, addBlock]);

  const handleSlashSelect = useCallback(async (type: BT) => {
    closeSlashMenu();
    await changeBlockType(block.id, type);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-block-id="${block.id}"] [contenteditable]`) as HTMLElement;
      if (el) {
        el.focus();
        // Clear any remaining slash text
        if (el.textContent === '/') el.textContent = '';
      }
    });
  }, [block.id, changeBlockType, closeSlashMenu]);

  const isSlashMenuForThis = slashMenuOpen && slashMenuBlockId === block.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={block.id}
      className={cn(
        'group relative flex gap-1.5 py-0.5 rounded-md transition-colors',
        isDragging && 'z-50',
      )}
    >
      {/* Left controls: drag handle + add button */}
      <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5 shrink-0">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-grab active:cursor-grabbing rounded hover:bg-[var(--bg-block-hover)] touch-none"
          tabIndex={-1}
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
        <button
          onClick={handleAddBelow}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] rounded hover:bg-[var(--bg-block-hover)]"
          tabIndex={-1}
          title="Add block below"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Block content */}
      <div className="flex-1 min-w-0">
        <BlockRenderer block={block} numberedIndex={numberedIndex} />
      </div>

      {/* Slash command menu */}
      {isSlashMenuForThis && (
        <SlashMenu
          blockId={block.id}
          query={slashMenuQuery}
          onSelect={handleSlashSelect}
          onClose={closeSlashMenu}
        />
      )}
    </div>
  );
}
