import React from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Block } from './Block';
import { useEditorStore } from '../../store/editorStore';
import type { Block as BlockType } from '../../types';
import { BlockRenderer } from './BlockRenderer';
import { useState } from 'react';

export function BlockList() {
  const { blocks, reorderBlocks } = useEditorStore();
  const [activeBlock, setActiveBlock] = useState<BlockType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const block = blocks.find(b => b.id === event.active.id);
    setActiveBlock(block || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveBlock(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(blocks, oldIndex, newIndex);
    reorderBlocks(reordered.map(b => b.id));
  };

  // Compute numbered list index (sequential within consecutive numbered blocks)
  const getNumberedIndex = (block: BlockType, index: number): number => {
    if (block.type !== 'numbered') return 1;
    let count = 0;
    for (let i = index; i >= 0; i--) {
      if (blocks[i].type !== 'numbered' || blocks[i].indent !== block.indent) break;
      count++;
    }
    return count;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {blocks.map((block, index) => (
            <Block key={block.id} block={block} numberedIndex={getNumberedIndex(block, index)} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeBlock && (
          <div className="bg-[var(--bg-editor)] border border-[var(--border)] rounded-lg p-3 shadow-2xl opacity-90">
            <BlockRenderer block={activeBlock} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
