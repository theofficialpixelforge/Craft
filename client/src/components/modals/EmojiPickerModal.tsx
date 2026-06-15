import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';

const EMOJI_CATEGORIES = {
  'Documents': ['📄', '📃', '📝', '📋', '📑', '🗒️', '🗓️', '📅', '📆', '📊'],
  'Objects': ['💡', '🔑', '🔒', '🔓', '🔧', '🔨', '⚙️', '🛠️', '📌', '📍'],
  'Symbols': ['⭐', '🌟', '✨', '💫', '🔥', '❄️', '🌈', '⚡', '💯', '✅'],
  'Faces': ['😀', '🤔', '💪', '👍', '🎯', '🚀', '💡', '🏆', '🎉', '🎊'],
  'Nature': ['🌿', '🌱', '🍀', '🌸', '🌺', '🍁', '🌙', '☀️', '🌊', '🏔️'],
  'Food': ['☕', '🍎', '🍕', '🎂', '🍩', '🌮', '🍜', '🥗', '🍓', '🥑'],
};

export function EmojiPickerModal() {
  const { closeEmojiPicker } = useUIStore();
  const { activeDocument, setEmoji } = useDocumentStore();
  const [search, setSearch] = useState('');

  const handleSelect = async (emoji: string) => {
    if (activeDocument) {
      await setEmoji(activeDocument.id, emoji);
    }
    closeEmojiPicker();
  };

  const handleRemove = async () => {
    if (activeDocument) await setEmoji(activeDocument.id, null);
    closeEmojiPicker();
  };

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
  const filtered = search ? allEmojis.filter(e => e.includes(search)) : null;

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30" onClick={closeEmojiPicker}>
      <div className="bg-[var(--bg-editor)] rounded-2xl border border-[var(--border)] shadow-2xl p-4 w-80" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emoji..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-block-hover)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] mb-3"
        />

        <div className="max-h-64 overflow-y-auto">
          {filtered ? (
            <div className="grid grid-cols-8 gap-1">
              {filtered.map(e => (
                <button key={e} onClick={() => handleSelect(e)}
                  className="p-1.5 text-xl rounded hover:bg-[var(--bg-block-hover)] transition-colors cursor-pointer">
                  {e}
                </button>
              ))}
            </div>
          ) : (
            Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => (
              <div key={cat} className="mb-3">
                <div className="text-xs text-[var(--text-tertiary)] mb-1 font-medium">{cat}</div>
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map(e => (
                    <button key={e} onClick={() => handleSelect(e)}
                      className="p-1.5 text-xl rounded hover:bg-[var(--bg-block-hover)] transition-colors cursor-pointer">
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {activeDocument?.emoji && (
          <button onClick={handleRemove} className="mt-3 w-full py-1.5 text-xs text-[var(--text-tertiary)] hover:text-red-500 transition-colors border-t border-[var(--border)]">
            Remove icon
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
