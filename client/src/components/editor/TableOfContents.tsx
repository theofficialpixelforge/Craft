import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { nodesToPlainText } from '../../utils/inlineNodes';

export function TableOfContents() {
  const { blocks } = useEditorStore();
  const headings = blocks.filter(b => ['h1', 'h2', 'h3'].includes(b.type));

  if (headings.length === 0) {
    return <p className="text-xs text-[var(--text-tertiary)]">No headings yet.</p>;
  }

  const scrollTo = (id: string) => {
    const el = document.querySelector(`[data-block-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-1">
      {headings.map(h => {
        const indent = h.type === 'h1' ? 0 : h.type === 'h2' ? 8 : 16;
        const fontSize = h.type === 'h1' ? 'text-sm font-medium' : 'text-xs';
        return (
          <button
            key={h.id}
            onClick={() => scrollTo(h.id)}
            className={`block w-full text-left text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors ${fontSize} truncate`}
            style={{ paddingLeft: indent }}
          >
            {nodesToPlainText(h.content) || 'Untitled heading'}
          </button>
        );
      })}
    </div>
  );
}
