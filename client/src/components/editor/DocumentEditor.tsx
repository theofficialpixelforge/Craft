import React, { useEffect } from 'react';
import { DocumentHeader } from './DocumentHeader';
import { BlockList } from './BlockList';
import { FormatToolbar } from './FormatToolbar';
import { useEditorStore } from '../../store/editorStore';
import { useUIStore } from '../../store/uiStore';
import { BacklinksSection } from './BacklinksSection';
import { TableOfContents } from './TableOfContents';

interface Props {
  documentId: string;
}

export function DocumentEditor({ documentId }: Props) {
  const { fetchBlocks, isLoading, addBlock, blocks } = useEditorStore();
  const { rightPanelOpen, rightPanelTab } = useUIStore();

  useEffect(() => {
    fetchBlocks(documentId);
  }, [documentId, fetchBlocks]);

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading...</div>
      </div>
    );
  }

  const handleClickBelowBlocks = async () => {
    const last = blocks[blocks.length - 1];
    const newBlock = await addBlock(last?.id || null, 'text');
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-block-id="${newBlock.id}"] [contenteditable]`) as HTMLElement;
      if (el) el.focus();
    });
  };

  return (
    <div style={{ display: 'flex', flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
      {/* Main editor */}
      <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', paddingTop: 64, paddingBottom: 128 }}>
          <DocumentHeader />

          <div id="editor-content" style={{ padding: '0 32px' }}>
            <BlockList />
            <div style={{ marginTop: 16, height: 64, cursor: 'text' }} onClick={handleClickBelowBlocks} />
          </div>

          <BacklinksSection documentId={documentId} />
        </div>
      </div>

      {/* Right panel */}
      {rightPanelOpen && (
        <div style={{
          width: 220, flexShrink: 0, borderLeft: '1px solid var(--border)',
          height: '100%', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {(['toc', 'backlinks'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => useUIStore.getState().setRightPanelTab(tab)}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 500,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: rightPanelTab === tab ? 'var(--accent)' : 'var(--text-tertiary)',
                  borderBottom: rightPanelTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                {tab === 'toc' ? 'Contents' : 'Backlinks'}
              </button>
            ))}
          </div>
          <div style={{ padding: 12 }}>
            {rightPanelTab === 'toc' ? <TableOfContents /> : <BacklinksSection documentId={documentId} compact />}
          </div>
        </div>
      )}

      <FormatToolbar />
    </div>
  );
}
