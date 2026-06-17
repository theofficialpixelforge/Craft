import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Crown, LayoutGrid, LayoutList, Columns, MoreHorizontal,
  Check, ArrowDown, Calendar, Upload, FileDown, FileText, Settings,
} from 'lucide-react';
import type { Document } from '../../types';
import { DocumentCard } from './DocumentCard';
import { api } from '../../api';
import { useDocumentStore } from '../../store/documentStore';

interface Props {
  docs: Document[];
  onSelectDoc: (id: string) => void;
  onNewDoc: () => void;
}

function flattenWithParent(docs: Document[], parentName?: string): Array<{ doc: Document; parentName?: string }> {
  const result: Array<{ doc: Document; parentName?: string }> = [];
  for (const doc of docs) {
    result.push({ doc, parentName });
    if (doc.children.length > 0) {
      result.push(...flattenWithParent(doc.children, doc.title));
    }
  }
  return result;
}

type ViewMode = 'grid' | 'masonry' | 'list';
type SortMode = 'name' | 'last_viewed' | 'date_created' | 'date_updated';

// ── More menu ────────────────────────────────────────────────────────────────
interface MoreMenuProps {
  sort: SortMode;
  sortDir: 'asc' | 'desc';
  showDailyNotes: boolean;
  onSort: (s: SortMode) => void;
  onToggleSortDir: () => void;
  onToggleDailyNotes: () => void;
  onClose: () => void;
  docs: Document[];
}

function MoreMenu({ sort, sortDir, showDailyNotes, onSort, onToggleSortDir, onToggleDailyNotes, onClose, docs }: MoreMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { activeDocument } = useDocumentStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleExportAll = async () => {
    for (const { doc } of flattenWithParent(docs)) {
      await api.exportMarkdown(doc.id, doc.title);
    }
    onClose();
  };

  const SORT_OPTIONS: { key: SortMode; label: string }[] = [
    { key: 'name',         label: 'Name' },
    { key: 'last_viewed',  label: 'Last Viewed' },
    { key: 'date_created', label: 'Date Created' },
    { key: 'date_updated', label: 'Date Updated' },
  ];

  const divider = <div style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }} />;

  const item = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    right?: React.ReactNode,
  ) => {
    const [hov, setHov] = useState(false);
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '7px 14px',
          background: hov ? 'var(--bg-block-hover)' : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          color: 'var(--text-primary)', fontSize: 13,
        }}
      >
        <span style={{ color: 'var(--text-secondary)', display: 'flex', width: 16 }}>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        {right}
      </button>
    );
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
        width: 240,
        background: 'var(--bg-editor)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        padding: '6px 0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      {/* Sort by */}
      <div style={{ padding: '4px 14px 2px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
        Sort by
      </div>
      {SORT_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => { onSort(opt.key); }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '7px 14px',
            background: 'transparent', border: 'none',
            cursor: 'pointer', textAlign: 'left',
            color: 'var(--text-primary)', fontSize: 13,
          }}
        >
          <span style={{ width: 14, display: 'flex', color: 'var(--accent)' }}>
            {sort === opt.key ? <Check size={13} /> : null}
          </span>
          <span style={{ flex: 1 }}>{opt.label}</span>
          {sort === opt.key && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSortDir(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2, borderRadius: 4 }}
            >
              <ArrowDown size={13} style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          )}
        </button>
      ))}

      {divider}

      {/* Show Daily Notes */}
      <button
        onClick={onToggleDailyNotes}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '7px 14px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          color: 'var(--text-primary)', fontSize: 13,
        }}
      >
        <span style={{ color: 'var(--text-secondary)', display: 'flex', width: 16 }}><Calendar size={14} /></span>
        <span style={{ flex: 1 }}>Show Daily Notes</span>
        {showDailyNotes && <Check size={13} style={{ color: 'var(--accent)' }} />}
      </button>

      {divider}

      {/* Import */}
      <button
        onClick={() => { onClose(); }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '7px 14px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          color: 'var(--text-primary)', fontSize: 13,
        }}
      >
        <span style={{ color: 'var(--text-secondary)', display: 'flex', width: 16 }}><Upload size={14} /></span>
        Import
      </button>

      {/* Export as Markdown */}
      <button
        onClick={handleExportAll}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '7px 14px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          color: 'var(--text-primary)', fontSize: 13,
        }}
      >
        <span style={{ color: 'var(--text-secondary)', display: 'flex', width: 16 }}><FileDown size={14} /></span>
        Export as Markdown
      </button>

      {/* Export as TextBundle */}
      <button
        onClick={() => { onClose(); }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '7px 14px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          color: 'var(--text-primary)', fontSize: 13,
        }}
      >
        <span style={{ color: 'var(--text-secondary)', display: 'flex', width: 16 }}><FileText size={14} /></span>
        Export as TextBundle
      </button>

      {divider}

      {/* Space Settings */}
      <button
        onClick={() => { onClose(); }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '7px 14px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          color: 'var(--text-primary)', fontSize: 13,
        }}
      >
        <span style={{ color: 'var(--text-secondary)', display: 'flex', width: 16 }}><Settings size={14} /></span>
        Space Settings
      </button>
    </div>
  );
}

// ── HomeView ─────────────────────────────────────────────────────────────────
export function HomeView({ docs, onSelectDoc, onNewDoc }: Props) {
  const [view, setView] = useState<ViewMode>('grid');
  const [sort, setSort] = useState<SortMode>('date_updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showDailyNotes, setShowDailyNotes] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const flat = flattenWithParent(docs);

  // Sort logic
  const sorted = [...flat].sort((a, b) => {
    let cmp = 0;
    if (sort === 'name') cmp = (a.doc.title || '').localeCompare(b.doc.title || '');
    else if (sort === 'date_created') cmp = (a.doc.created_at || '').localeCompare(b.doc.created_at || '');
    else cmp = (a.doc.updated_at || '').localeCompare(b.doc.updated_at || '');
    return sortDir === 'desc' ? -cmp : cmp;
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-app)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '14px 24px',
        borderBottom: '1px solid var(--border)', gap: 10, flexShrink: 0,
      }}>
        <button onClick={onNewDoc} style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--text-primary)', color: 'var(--bg-editor)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer', flexShrink: 0,
        }}>
          <Plus size={16} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>All Docs</h1>
        <div style={{ flex: 1 }} />

        {/* Get My Org Plus */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
        }}>
          <Crown size={13} style={{ color: '#f59e0b' }} />
          Get My Org Plus
        </button>

        {/* View toggles */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {([['grid', <LayoutGrid size={14}/>], ['masonry', <Columns size={14}/>], ['list', <LayoutList size={14}/>]] as [ViewMode, React.ReactNode][]).map(([v, icon]) => (
            <button
              key={v}
              onClick={() => setView(v as ViewMode)}
              style={{
                padding: '6px 10px', border: 'none', cursor: 'pointer',
                background: view === v ? 'var(--bg-block-hover)' : 'transparent',
                color: view === v ? 'var(--text-primary)' : 'var(--text-tertiary)',
                display: 'flex', alignItems: 'center',
              }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Three dots + dropdown */}
        <div ref={moreRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              padding: '6px 8px', borderRadius: 8, border: 'none',
              background: menuOpen ? 'var(--bg-block-hover)' : 'transparent',
              color: menuOpen ? 'var(--text-primary)' : 'var(--text-tertiary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <MoreMenu
              sort={sort}
              sortDir={sortDir}
              showDailyNotes={showDailyNotes}
              onSort={(s) => setSort(s)}
              onToggleSortDir={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              onToggleDailyNotes={() => setShowDailyNotes(v => !v)}
              onClose={() => setMenuOpen(false)}
              docs={docs}
            />
          )}
        </div>
      </div>

      {/* Document grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {sorted.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 16 }}>
            <div style={{ fontSize: 48 }}>📄</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No documents yet</div>
            <button
              onClick={onNewDoc}
              style={{
                padding: '8px 20px', borderRadius: 8,
                background: 'var(--accent)', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
              }}
            >
              Create your first document
            </button>
          </div>
        ) : view === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sorted.map(({ doc, parentName }) => (
              <button
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 18 }}>{doc.emoji || '📄'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title || 'Untitled'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {parentName || 'My Space'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: view === 'masonry' ? 'repeat(auto-fill, minmax(220px, 1fr))' : 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
            alignItems: view === 'masonry' ? 'start' : undefined,
          }}>
            {sorted.map(({ doc, parentName }) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                parentName={parentName}
                onClick={() => onSelectDoc(doc.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
