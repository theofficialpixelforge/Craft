import React, { useEffect, useState } from 'react';
import { Link } from 'lucide-react';
import type { Document } from '../../types';
import { api } from '../../api';
import { useDocumentStore } from '../../store/documentStore';

interface Props {
  documentId: string;
  compact?: boolean;
}

export function BacklinksSection({ documentId, compact = false }: Props) {
  const [backlinks, setBacklinks] = useState<Document[]>([]);
  const { setActiveDocument } = useDocumentStore();

  useEffect(() => {
    api.getBacklinks(documentId).then(setBacklinks).catch(() => setBacklinks([]));
  }, [documentId]);

  if (backlinks.length === 0) {
    if (compact) return <p className="text-xs text-[var(--text-tertiary)]">No backlinks yet.</p>;
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-1">
        {backlinks.map(doc => (
          <button
            key={doc.id}
            onClick={() => setActiveDocument(doc.id)}
            className="block w-full text-left text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] truncate"
          >
            {doc.emoji && <span className="mr-1">{doc.emoji}</span>}
            {doc.title}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="px-8 py-8 border-t border-[var(--border)] mt-8">
      <div className="flex items-center gap-2 mb-4 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
        <Link size={12} /> {backlinks.length} Backlink{backlinks.length > 1 ? 's' : ''}
      </div>
      <div className="space-y-2">
        {backlinks.map(doc => (
          <button
            key={doc.id}
            onClick={() => setActiveDocument(doc.id)}
            className="block w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-block-hover)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{doc.emoji || '📄'}</span>
              <span className="text-sm text-[var(--text-primary)]">{doc.title}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
