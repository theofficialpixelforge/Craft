import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { Block } from '../../../types';
import { renderInlineNodes, parseInlineNodes } from '../../../utils/inlineNodes';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorStore } from '../../../store/editorStore';

const ICONS = ['💡', 'ℹ️', '⚠️', '🚨', '✅', '📌', '🎯', '💬', '🔥', '⭐'];

interface Props { block: Block; }

export function CalloutBlock({ block }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { focusedBlockId, setFocusedBlock, updateBlock } = useEditorStore();
  const isFocused = focusedBlockId === block.id;
  const [showIconPicker, setShowIconPicker] = useState(false);
  const icon = block.callout_icon || '💡';

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
    <div className="block-callout flex items-start gap-3">
      <div className="relative shrink-0">
        <button
          onClick={() => setShowIconPicker(v => !v)}
          className="text-xl leading-none hover:scale-110 transition-transform cursor-pointer"
          tabIndex={-1}
        >
          {icon}
        </button>
        {showIconPicker && (
          <div className="absolute top-full left-0 mt-1 z-50 p-2 grid grid-cols-5 gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-editor)] shadow-xl">
            {ICONS.map(ic => (
              <button
                key={ic}
                onClick={() => { updateBlock(block.id, { callout_icon: ic }); setShowIconPicker(false); }}
                className="text-lg p-1 hover:bg-[var(--bg-block-hover)] rounded cursor-pointer"
              >
                {ic}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={isFocused ? 'Callout text...' : ''}
        className="block-text flex-1 min-h-[1.5em]"
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onFocus={() => setFocusedBlock(block.id)}
        onBlur={handleBlur}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }}
        style={{ color: 'var(--text-primary)' }}
      />
    </div>
  );
}
