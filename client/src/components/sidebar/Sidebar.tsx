import React from 'react';
import { Search, Plus, Star, ChevronLeft, PenSquare } from 'lucide-react';
import { useDocumentStore } from '../../store/documentStore';
import { useUIStore } from '../../store/uiStore';
import { DocumentTreeItem } from './DocumentTreeItem';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface Props {
  onSelectDocument: (id: string) => void;
  userName?: string;
}

export function Sidebar({ onSelectDocument, userName }: Props) {
  const { tree, favorites, activeDocumentId, createDocument } = useDocumentStore();
  const { sidebarCollapsed, toggleSidebar, openSearchModal } = useUIStore();

  const handleNewDoc = async () => {
    const doc = await createDocument(null);
    onSelectDocument(doc.id);
  };

  if (sidebarCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 pt-3 px-2 h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)] w-12 shrink-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-[var(--bg-block-hover)] text-[var(--text-secondary)]"
        >
          <ChevronLeft size={16} className="rotate-180" />
        </button>
        <button onClick={openSearchModal} className="p-1.5 rounded hover:bg-[var(--bg-block-hover)] text-[var(--text-secondary)]">
          <Search size={15} />
        </button>
        <button onClick={handleNewDoc} className="p-1.5 rounded hover:bg-[var(--bg-block-hover)] text-[var(--text-secondary)]">
          <PenSquare size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)] w-64 shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-2">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate">Craft</span>
        </div>
        <Button size="sm" onClick={openSearchModal} title="Search (Cmd+K)">
          <Search size={14} />
        </Button>
        <Button size="sm" onClick={handleNewDoc} title="New page">
          <PenSquare size={14} />
        </Button>
        <Button size="sm" onClick={toggleSidebar} title="Collapse sidebar">
          <ChevronLeft size={14} />
        </Button>
      </div>

      {/* Search bar */}
      <button
        onClick={openSearchModal}
        className="mx-3 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--bg-block-hover)] text-[var(--text-tertiary)] text-sm hover:text-[var(--text-secondary)] transition-colors"
      >
        <Search size={13} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-xs bg-[var(--bg-sidebar)] px-1.5 py-0.5 rounded border border-[var(--border)]">⌘K</kbd>
      </button>

      {/* Scrollable tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              <Star size={10} /> Favorites
            </div>
            {favorites.map(doc => (
              <DocumentTreeItem key={doc.id} doc={doc} onSelect={onSelectDocument} activeId={activeDocumentId} />
            ))}
          </div>
        )}

        {/* All pages */}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Pages</span>
          <button
            onClick={handleNewDoc}
            className="p-0.5 rounded hover:bg-[var(--bg-block-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            title="New page"
          >
            <Plus size={13} />
          </button>
        </div>

        {tree.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-[var(--text-tertiary)]">
            <p>No pages yet</p>
            <button onClick={handleNewDoc} className="mt-2 text-[var(--accent)] hover:underline text-xs">
              Create your first page →
            </button>
          </div>
        ) : (
          tree.map(doc => (
            <DocumentTreeItem key={doc.id} doc={doc} onSelect={onSelectDocument} activeId={activeDocumentId} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          {userName && (
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-[var(--text-tertiary)] truncate">
            {userName ? userName : 'Craft Clone'}
          </span>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
