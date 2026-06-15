import type { Block, BlockType, Document, InlineNode, SearchResult } from '../types';

const BASE = '/api';

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ── Documents ──────────────────────────────────────────────────────────────
export const api = {
  // Tree
  getDocumentTree: () => request<Document[]>('/documents'),
  getFavorites: () => request<Document[]>('/documents/favorites'),

  // Single document
  getDocument: (id: string) => request<Document>(`/documents/${id}`),
  createDocument: (data?: { parent_id?: string; title?: string; emoji?: string }) =>
    request<Document>('/documents', { method: 'POST', body: JSON.stringify(data || {}) }),
  updateDocument: (id: string, data: Partial<Pick<Document, 'title' | 'emoji' | 'cover_url' | 'position' | 'parent_id' | 'is_favorite'>>) =>
    request<Document>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDocument: (id: string) =>
    request<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),

  // Backlinks
  getBacklinks: (id: string) => request<Document[]>(`/documents/${id}/backlinks`),
  syncBacklinks: (id: string, target_ids: string[]) =>
    request<{ success: boolean }>(`/documents/${id}/backlinks`, {
      method: 'POST',
      body: JSON.stringify({ target_ids }),
    }),

  // ── Blocks ──────────────────────────────────────────────────────────────
  getBlocks: (documentId: string) => request<Block[]>(`/documents/${documentId}/blocks`),
  createBlock: (documentId: string, data: {
    type: BlockType;
    content?: InlineNode[];
    position?: number;
    indent?: number;
    checked?: boolean | null;
    language?: string | null;
    callout_icon?: string | null;
    image_url?: string | null;
    image_caption?: string | null;
    linked_doc_id?: string | null;
    table_data?: import('../types').TableData | null;
    columns_data?: import('../types').InlineNode[][] | null;
  }) =>
    request<Block>(`/documents/${documentId}/blocks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBlock: (id: string, data: Partial<Block>) =>
    request<Block>(`/blocks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBlock: (id: string) =>
    request<{ success: boolean }>(`/blocks/${id}`, { method: 'DELETE' }),
  reorderBlocks: (documentId: string, ids: string[]) =>
    request<{ success: boolean }>(`/documents/${documentId}/blocks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // ── Search ──────────────────────────────────────────────────────────────
  search: (q: string, limit = 20) =>
    request<SearchResult[]>(`/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  // ── Assistant ───────────────────────────────────────────────────────────
  async *chatStream(
    messages: { role: 'user' | 'assistant'; content: string }[],
    context?: { docTitle?: string; blockCount?: number },
  ): AsyncGenerator<string> {
    const res = await fetch(`${BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context }),
    });
    if (!res.ok || !res.body) throw new Error('Assistant request failed');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') return;
        try {
          const { content } = JSON.parse(payload);
          yield content;
        } catch { /* skip malformed */ }
      }
    }
  },

  // ── Export ──────────────────────────────────────────────────────────────
  exportMarkdown: async (documentId: string, title: string): Promise<{ blobUrl: string; filename: string }> => {
    const res = await fetch(`${BASE}/documents/${documentId}/export`);
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const filename = `${title.replace(/[^a-z0-9]/gi, '_')}.md`;
    return { blobUrl, filename };
  },
};
