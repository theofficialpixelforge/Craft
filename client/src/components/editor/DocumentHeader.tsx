import React, { useRef, useEffect, useState } from 'react';
import { Smile, Image, Star, MoreHorizontal, Download, Trash2 } from 'lucide-react';
import { useDocumentStore } from '../../store/documentStore';
import { useUIStore } from '../../store/uiStore';
import { COVER_PRESETS } from '../../types';
import { api } from '../../api';
import { ExportModal } from '../modals/ExportModal';

export function DocumentHeader() {
  const { activeDocument, renameDocument, setEmoji, setCover, toggleFavorite, deleteDocument } = useDocumentStore();
  const { openEmojiPicker } = useUIStore();
  const titleRef = useRef<HTMLDivElement>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [hoverCover, setHoverCover] = useState(false);
  const [exportResult, setExportResult] = useState<{ blobUrl: string; filename: string } | null>(null);

  useEffect(() => {
    if (titleRef.current && activeDocument) {
      if (document.activeElement !== titleRef.current) {
        titleRef.current.textContent = activeDocument.title;
      }
    }
  }, [activeDocument?.title]);

  if (!activeDocument) return null;

  const handleTitleBlur = () => {
    const title = titleRef.current?.textContent?.trim() || 'Untitled';
    if (title !== activeDocument.title) renameDocument(activeDocument.id, title);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus the first block
      const firstBlock = document.querySelector('#editor-content [contenteditable]') as HTMLElement;
      if (firstBlock) firstBlock.focus();
    }
  };

  const coverStyle = activeDocument.cover_url
    ? COVER_PRESETS.find(p => p.id === activeDocument.cover_url)?.style
    : null;

  const handleExport = async () => {
    const result = await api.exportMarkdown(activeDocument.id, activeDocument.title);
    setExportResult(result);
  };
  const handleCloseExport = () => {
    if (exportResult) URL.revokeObjectURL(exportResult.blobUrl);
    setExportResult(null);
  };
  const handleDelete = () => deleteDocument(activeDocument.id);

  return (
    <div className="relative">
      {/* Cover image */}
      {activeDocument.cover_url && (
        <div
          className="relative h-48 w-full mb-4 cursor-pointer group"
          onMouseEnter={() => setHoverCover(true)}
          onMouseLeave={() => setHoverCover(false)}
        >
          <div
            className="absolute inset-0 rounded-none"
            style={coverStyle
              ? { background: coverStyle }
              : { backgroundImage: `url(${activeDocument.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            }
          />
          {hoverCover && (
            <button
              onClick={() => setShowCoverPicker(true)}
              className="absolute bottom-3 right-3 px-3 py-1.5 text-xs font-medium bg-black/50 text-white rounded-md hover:bg-black/70 transition-colors"
            >
              Change cover
            </button>
          )}
        </div>
      )}

      <div className="px-8 pb-4">
        {/* Top actions row */}
        <div className="flex items-center gap-2 mb-2 opacity-0 hover:opacity-100 transition-opacity group">
          {!activeDocument.cover_url && (
            <button
              onClick={() => setShowCoverPicker(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <Image size={13} /> Add cover
            </button>
          )}
          {!activeDocument.emoji && (
            <button
              onClick={() => openEmojiPicker('document')}
              className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <Smile size={13} /> Add icon
            </button>
          )}
        </div>

        {/* Emoji icon */}
        {activeDocument.emoji && (
          <button
            onClick={() => openEmojiPicker('document')}
            className="text-5xl mb-3 hover:scale-105 transition-transform cursor-pointer block"
            title="Change icon"
          >
            {activeDocument.emoji}
          </button>
        )}

        {/* Title + action buttons */}
        <div className="flex items-start gap-2">
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Untitled"
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 text-4xl font-bold text-[var(--text-primary)] outline-none leading-tight tracking-tight min-h-[1em]"
            style={{ wordBreak: 'break-word' }}
          />
          <div className="flex items-center gap-1 pt-2 shrink-0">
            <button
              onClick={() => toggleFavorite(activeDocument.id)}
              title={activeDocument.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`p-1.5 rounded hover:bg-[var(--bg-block-hover)] transition-colors ${activeDocument.is_favorite ? 'text-amber-400' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
            >
              <Star size={16} fill={activeDocument.is_favorite ? 'currentColor' : 'none'} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(v => !v)}
                className="p-1.5 rounded hover:bg-[var(--bg-block-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-[var(--border)] bg-[var(--bg-editor)] shadow-xl py-1">
                  <MoreMenuItem icon={<Download size={13} />} label="Export as Markdown" onClick={() => { handleExport(); setShowMoreMenu(false); }} />
                  <div className="my-1 border-t border-[var(--border)]" />
                  <MoreMenuItem icon={<Trash2 size={13} />} label="Delete page" onClick={() => { handleDelete(); setShowMoreMenu(false); }} danger />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export success modal */}
      {exportResult && (
        <ExportModal
          blobUrl={exportResult.blobUrl}
          filename={exportResult.filename}
          onClose={handleCloseExport}
        />
      )}

      {/* Cover picker */}
      {showCoverPicker && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-[var(--bg-editor)] border-b border-[var(--border)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--text-primary)]">Choose a cover</span>
            <button onClick={() => setShowCoverPicker(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">✕</button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {COVER_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => { setCover(activeDocument.id, preset.id); setShowCoverPicker(false); }}
                className="w-20 h-12 rounded-md hover:ring-2 hover:ring-[var(--accent)] transition-all"
                style={{ background: preset.style }}
                title={preset.label}
              />
            ))}
            <button
              onClick={() => { setCover(activeDocument.id, null); setShowCoverPicker(false); }}
              className="w-20 h-12 rounded-md border-2 border-dashed border-[var(--border)] hover:border-[var(--text-tertiary)] text-xs text-[var(--text-tertiary)] transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MoreMenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-[var(--bg-block-hover)] transition-colors ${danger ? 'text-red-500' : 'text-[var(--text-primary)]'}`}
    >
      {icon} {label}
    </button>
  );
}
