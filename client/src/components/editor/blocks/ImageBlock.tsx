import React, { useState, useRef, useCallback } from 'react';
import type { Block } from '../../../types';
import { useEditorStore } from '../../../store/editorStore';
import { Image as ImageIcon } from 'lucide-react';

interface Props { block: Block; }

export function ImageBlock({ block }: Props) {
  const { updateBlock, addBlock } = useEditorStore();
  const [urlInput, setUrlInput] = useState('');
  const [editing, setEditing] = useState(!block.image_url);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      updateBlock(block.id, { image_url: urlInput.trim() });
      setEditing(false);
    }
  };

  const handleCaptionKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newBlock = await addBlock(block.id, 'text');
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-block-id="${newBlock.id}"] [contenteditable]`) as HTMLElement;
        if (el) el.focus();
      });
    }
  };

  if (editing) {
    return (
      <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 flex flex-col items-center gap-4">
        <ImageIcon size={32} className="text-[var(--text-tertiary)]" />
        <p className="text-sm text-[var(--text-secondary)]">Add an image via URL</p>
        <form onSubmit={handleUrlSubmit} className="flex gap-2 w-full max-w-md">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg-editor)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            autoFocus
          />
          <button type="submit" className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-md hover:bg-[var(--accent-hover)]">
            Add
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={block.image_url!}
          alt={block.image_caption || ''}
          className="w-full h-auto rounded-lg"
          onError={() => setEditing(true)}
        />
        <button
          onClick={() => setEditing(true)}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm rounded-lg"
        >
          Change image
        </button>
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Caption..."
        className="mt-2 text-sm text-center text-[var(--text-tertiary)] outline-none"
        onBlur={(e) => updateBlock(block.id, { image_caption: e.currentTarget.textContent || '' })}
        onKeyDown={handleCaptionKeyDown}
        dangerouslySetInnerHTML={{ __html: block.image_caption || '' }}
      />
    </div>
  );
}
