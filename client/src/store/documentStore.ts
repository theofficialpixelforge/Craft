import { create } from 'zustand';
import { api } from '../api';
import type { Document } from '../types';

interface DocumentStore {
  tree: Document[];
  favorites: Document[];
  activeDocumentId: string | null;
  activeDocument: Document | null;
  expandedIds: Set<string>;
  isLoading: boolean;
  error: string | null;

  fetchTree: () => Promise<void>;
  setActiveDocument: (id: string | null) => Promise<void>;
  createDocument: (parentId?: string | null) => Promise<Document>;
  updateDocument: (id: string, data: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleExpanded: (id: string) => void;
  renameDocument: (id: string, title: string) => Promise<void>;
  setEmoji: (id: string, emoji: string | null) => Promise<void>;
  setCover: (id: string, coverUrl: string | null) => Promise<void>;
  moveDocument: (id: string, newParentId: string | null) => Promise<void>;
}

function findDoc(tree: Document[], id: string): Document | null {
  for (const d of tree) {
    if (d.id === id) return d;
    const found = findDoc(d.children, id);
    if (found) return found;
  }
  return null;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  tree: [],
  favorites: [],
  activeDocumentId: null,
  activeDocument: null,
  expandedIds: new Set(),
  isLoading: false,
  error: null,

  fetchTree: async () => {
    set({ isLoading: true, error: null });
    try {
      const [tree, favorites] = await Promise.all([api.getDocumentTree(), api.getFavorites()]);
      set({ tree, favorites, isLoading: false });
      // Restore active document
      const { activeDocumentId } = get();
      if (activeDocumentId) {
        const doc = findDoc(tree, activeDocumentId);
        if (doc) set({ activeDocument: doc });
      }
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  setActiveDocument: async (id) => {
    if (!id) return set({ activeDocumentId: null, activeDocument: null });
    set({ activeDocumentId: id });
    try {
      const doc = await api.getDocument(id);
      set({ activeDocument: doc });
    } catch {
      // Try from tree
      const doc = findDoc(get().tree, id);
      if (doc) set({ activeDocument: doc });
    }
  },

  createDocument: async (parentId = null) => {
    const doc = await api.createDocument({ parent_id: parentId ?? undefined });
    await get().fetchTree();
    if (parentId) {
      set(s => ({ expandedIds: new Set([...s.expandedIds, parentId]) }));
    }
    return doc;
  },

  updateDocument: async (id, data) => {
    await api.updateDocument(id, data);
    await get().fetchTree();
    if (get().activeDocumentId === id) {
      const doc = findDoc(get().tree, id);
      if (doc) set({ activeDocument: { ...doc, ...data } });
    }
  },

  deleteDocument: async (id) => {
    await api.deleteDocument(id);
    if (get().activeDocumentId === id) {
      set({ activeDocumentId: null, activeDocument: null });
    }
    await get().fetchTree();
  },

  toggleFavorite: async (id) => {
    const doc = findDoc(get().tree, id);
    if (!doc) return;
    await api.updateDocument(id, { is_favorite: !doc.is_favorite });
    await get().fetchTree();
  },

  toggleExpanded: (id) => {
    set(s => {
      const next = new Set(s.expandedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedIds: next };
    });
  },

  renameDocument: async (id, title) => {
    await api.updateDocument(id, { title });
    set(s => ({
      activeDocument: s.activeDocumentId === id ? { ...s.activeDocument!, title } : s.activeDocument,
    }));
    await get().fetchTree();
  },

  setEmoji: async (id, emoji) => {
    await api.updateDocument(id, { emoji: emoji ?? undefined });
    await get().fetchTree();
    if (get().activeDocumentId === id) {
      set(s => ({ activeDocument: s.activeDocument ? { ...s.activeDocument, emoji } : null }));
    }
  },

  setCover: async (id, coverUrl) => {
    await api.updateDocument(id, { cover_url: coverUrl ?? undefined });
    if (get().activeDocumentId === id) {
      set(s => ({ activeDocument: s.activeDocument ? { ...s.activeDocument, cover_url: coverUrl } : null }));
    }
  },

  moveDocument: async (id, newParentId) => {
    await api.updateDocument(id, { parent_id: newParentId ?? undefined });
    await get().fetchTree();
  },
}));
