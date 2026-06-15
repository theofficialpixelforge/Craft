import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Clock, File } from 'lucide-react';
import { useSearchStore } from '../../store/searchStore';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';
import type { Document } from '../../types';

export function SearchModal() {
  const { query, results, isSearching, recentIds, setQuery, addRecent, clearQuery } = useSearchStore();
  const { closeSearchModal } = useUIStore();
  const { tree, setActiveDocument } = useDocumentStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Flatten tree for recent lookup
  const allDocs: Document[] = [];
  const flattenTree = (docs: Document[]) => { docs.forEach(d => { allDocs.push(d); flattenTree(d.children); }); };
  flattenTree(tree);

  const recentDocs = recentIds.map(id => allDocs.find(d => d.id === id)).filter(Boolean) as Document[];

  const handleSelect = (id: string) => {
    addRecent(id);
    setActiveDocument(id);
    clearQuery();
    closeSearchModal();
  };

  const displayItems = query.trim()
    ? results.map(r => ({ id: r.document_id, title: r.document_title, emoji: r.document_emoji, snippet: r.snippet, is_title_match: r.is_title_match }))
    : recentDocs.map(d => ({ id: d.id, title: d.title, emoji: d.emoji, snippet: null, is_title_match: true }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, displayItems.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter')     { if (displayItems[selectedIndex]) handleSelect(displayItems[selectedIndex].id); }
    if (e.key === 'Escape')    { clearQuery(); closeSearchModal(); }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center pt-20 bg-black/40 backdrop-blur-sm"
      onClick={() => { clearQuery(); closeSearchModal(); }}
    >
      <div
        className="w-full max-w-lg mx-4 bg-[var(--bg-editor)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <Search size={18} className="text-[var(--text-tertiary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none text-base"
          />
          {isSearching && <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin shrink-0" />}
          <kbd className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-block-hover)] px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {displayItems.length === 0 && query.trim() ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
              No results for "{query}"
            </div>
          ) : displayItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
              Start typing to search...
            </div>
          ) : (
            <>
              {!query.trim() && recentDocs.length > 0 && (
                <div className="px-4 py-1 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-1">
                  <Clock size={10} /> Recent
                </div>
              )}
              {displayItems.map((item, i) => (
                <button
                  key={`${item.id}-${i}`}
                  onClick={() => handleSelect(item.id)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selectedIndex ? 'bg-[var(--bg-block-hover)]' : 'hover:bg-[var(--bg-block-hover)]'
                  }`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{item.emoji || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title || 'Untitled'}</div>
                    {item.snippet && !item.is_title_match && (
                      <div
                        className="text-xs text-[var(--text-secondary)] mt-0.5 truncate"
                        dangerouslySetInnerHTML={{ __html: item.snippet }}
                      />
                    )}
                  </div>
                  <File size={13} className="text-[var(--text-tertiary)] shrink-0 mt-0.5" />
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--border)] text-xs text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1">↑↓ navigate</span>
          <span className="flex items-center gap-1">↵ open</span>
          <span className="flex items-center gap-1">Esc close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
