import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileText, ChevronRight, Search } from 'lucide-react';
import type { Block, Document } from '../../../types';
import { useEditorStore } from '../../../store/editorStore';
import { useDocumentStore } from '../../../store/documentStore';

interface Props { block: Block; }

function flattenTree(docs: Document[]): Document[] {
  const result: Document[] = [];
  for (const doc of docs) {
    result.push(doc);
    if (doc.children?.length) result.push(...flattenTree(doc.children));
  }
  return result;
}

export function PageBlock({ block }: Props) {
  const { updateBlock, addBlock } = useEditorStore();
  const { tree, setActiveDocument, activeDocumentId } = useDocumentStore();

  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allDocs = useMemo(() => flattenTree(tree), [tree]);

  const linkedDoc = useMemo(
    () => (block.linked_doc_id ? allDocs.find(d => d.id === block.linked_doc_id) ?? null : null),
    [allDocs, block.linked_doc_id],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    // Exclude current document to avoid self-reference
    return allDocs.filter(d => d.id !== activeDocumentId && (!q || d.title.toLowerCase().includes(q)));
  }, [allDocs, query, activeDocumentId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = async (doc: Document) => {
    setDropdownOpen(false);
    setQuery('');
    await updateBlock(block.id, { linked_doc_id: doc.id });
  };

  const handleCardClick = () => {
    if (linkedDoc) setActiveDocument(linkedDoc.id);
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      await handleSelect(filtered[0]);
    }
    if (e.key === 'Escape') {
      setDropdownOpen(false);
      // If still no linked doc, add a text block below and delete this one
      if (!block.linked_doc_id) {
        const newBlock = await addBlock(block.id, 'text');
        await updateBlock(block.id, { type: 'text' });
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-block-id="${newBlock.id}"] [contenteditable]`) as HTMLElement;
          if (el) el.focus();
        });
      }
    }
  };

  // Picker state (no linked doc yet)
  if (!linkedDoc) {
    return (
      <div ref={containerRef} className="relative">
        <div className="flex items-center gap-2 border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-editor)]">
          <Search size={14} className="text-[var(--text-tertiary)] shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search for a page to link..."
            className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        {dropdownOpen && filtered.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--bg-editor)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto">
            {filtered.map(doc => (
              <button
                key={doc.id}
                onMouseDown={e => { e.preventDefault(); handleSelect(doc); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[var(--bg-block-hover)] transition-colors"
              >
                <span className="text-base leading-none">
                  {doc.emoji ?? <FileText size={14} className="text-[var(--text-tertiary)]" />}
                </span>
                <span className="text-[var(--text-primary)] truncate">{doc.title || 'Untitled'}</span>
              </button>
            ))}
          </div>
        )}

        {dropdownOpen && filtered.length === 0 && query && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--bg-editor)] border border-[var(--border)] rounded-lg shadow-xl px-3 py-3">
            <p className="text-sm text-[var(--text-tertiary)]">No pages found</p>
          </div>
        )}
      </div>
    );
  }

  // Linked card
  return (
    <div
      onClick={handleCardClick}
      className="group flex items-center gap-3 border border-[var(--border)] rounded-lg px-4 py-3 cursor-pointer hover:bg-[var(--bg-block-hover)] hover:border-[var(--accent)] transition-all select-none"
    >
      <span className="text-xl leading-none shrink-0">
        {linkedDoc.emoji || '📄'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {linkedDoc.title || 'Untitled'}
        </p>
      </div>
      <ChevronRight
        size={14}
        className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] shrink-0 transition-colors"
      />
    </div>
  );
}
