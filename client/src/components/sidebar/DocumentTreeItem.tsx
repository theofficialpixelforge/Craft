import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, File, Folder, Star, Trash2, Plus, MoreHorizontal, FolderOpen } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDocumentStore } from '../../store/documentStore';
import type { Document } from '../../types';

interface Props {
  doc: Document;
  depth?: number;
  onSelect: (id: string) => void;
  activeId: string | null;
}

export function DocumentTreeItem({ doc, depth = 0, onSelect, activeId }: Props) {
  const { expandedIds, toggleExpanded, createDocument, deleteDocument, renameDocument, toggleFavorite } = useDocumentStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(doc.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const isExpanded = expandedIds.has(doc.id);
  const isActive = activeId === doc.id;
  const hasChildren = doc.children.length > 0;

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleRename = async () => {
    setRenaming(false);
    if (renameValue.trim() && renameValue !== doc.title) {
      await renameDocument(doc.id, renameValue.trim());
    }
  };

  const handleAddChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const child = await createDocument(doc.id);
    if (!expandedIds.has(doc.id)) toggleExpanded(doc.id);
    onSelect(child.id);
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer select-none text-sm transition-colors',
          isActive
            ? 'bg-[var(--accent)] text-white'
            : 'hover:bg-[var(--bg-block-hover)] text-[var(--text-primary)]',
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(doc.id)}
      >
        {/* Expand chevron */}
        <button
          className={cn(
            'shrink-0 p-0.5 rounded transition-transform',
            !hasChildren && 'invisible',
            isActive ? 'text-white/70 hover:text-white' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
          )}
          onClick={(e) => { e.stopPropagation(); toggleExpanded(doc.id); }}
        >
          <ChevronRight size={12} className={cn('transition-transform', isExpanded && 'rotate-90')} />
        </button>

        {/* Icon */}
        <span className="shrink-0 text-base leading-none" style={{ width: 18, textAlign: 'center' }}>
          {doc.emoji || (hasChildren
            ? (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />)
            : <File size={14} />
          )}
        </span>

        {/* Title */}
        {renaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setRenaming(false); setRenameValue(doc.title); }
              e.stopPropagation();
            }}
            onClick={e => e.stopPropagation()}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm"
          />
        ) : (
          <span className={cn('flex-1 min-w-0 truncate', isActive ? 'text-white' : 'text-[var(--text-primary)]')}>
            {doc.title || 'Untitled'}
          </span>
        )}

        {/* Action buttons (visible on hover) */}
        <div className={cn('flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0', isActive && 'text-white/80')}>
          <button
            className={cn('p-0.5 rounded hover:bg-white/20', !isActive && 'hover:bg-[var(--border)]')}
            onClick={handleAddChild}
            title="New subpage"
          >
            <Plus size={12} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              className={cn('p-0.5 rounded hover:bg-white/20', !isActive && 'hover:bg-[var(--border)]')}
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              title="More options"
            >
              <MoreHorizontal size={12} />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-lg border border-[var(--border)] bg-[var(--bg-editor)] shadow-xl text-[var(--text-primary)] py-1">
                <MenuItem icon={<Star size={13} />} label={doc.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  onClick={() => { toggleFavorite(doc.id); setMenuOpen(false); }} />
                <MenuItem icon={<File size={13} />} label="Rename"
                  onClick={() => { setRenaming(true); setMenuOpen(false); }} />
                <div className="my-1 border-t border-[var(--border)]" />
                <MenuItem icon={<Trash2 size={13} />} label="Delete" danger
                  onClick={() => { deleteDocument(doc.id); setMenuOpen(false); }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {doc.children.map(child => (
            <DocumentTreeItem key={child.id} doc={child} depth={depth + 1} onSelect={onSelect} activeId={activeId} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={cn(
        'flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-[var(--bg-block-hover)] transition-colors',
        danger ? 'text-red-500' : 'text-[var(--text-primary)]'
      )}
      onClick={onClick}
    >
      {icon} {label}
    </button>
  );
}
