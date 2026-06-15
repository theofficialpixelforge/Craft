import { create } from 'zustand';
import { api } from '../api';
import type { Block, BlockType, InlineNode } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface EditorStore {
  blocks: Block[];
  focusedBlockId: string | null;
  focusedBlockOffset: number;
  slashMenuOpen: boolean;
  slashMenuBlockId: string | null;
  slashMenuQuery: string;
  formatToolbarOpen: boolean;
  formatToolbarRect: DOMRect | null;
  isLoading: boolean;
  currentDocumentId: string | null;

  fetchBlocks: (documentId: string) => Promise<void>;
  addBlock: (afterId: string | null, type?: BlockType, content?: InlineNode[], opts?: Partial<Block>) => Promise<Block>;
  updateBlock: (id: string, data: Partial<Block>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  reorderBlocks: (ids: string[]) => Promise<void>;
  setFocusedBlock: (id: string | null, offset?: number) => void;
  openSlashMenu: (blockId: string, query: string) => void;
  closeSlashMenu: () => void;
  openFormatToolbar: (rect: DOMRect) => void;
  closeFormatToolbar: () => void;
  changeBlockType: (id: string, type: BlockType) => Promise<void>;
  setBlocks: (blocks: Block[]) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  blocks: [],
  focusedBlockId: null,
  focusedBlockOffset: 0,
  slashMenuOpen: false,
  slashMenuBlockId: null,
  slashMenuQuery: '',
  formatToolbarOpen: false,
  formatToolbarRect: null,
  isLoading: false,
  currentDocumentId: null,

  fetchBlocks: async (documentId) => {
    set({ isLoading: true, currentDocumentId: documentId, blocks: [] });
    try {
      const blocks = await api.getBlocks(documentId);
      // If no blocks, create an initial empty text block
      if (blocks.length === 0) {
        const first = await api.createBlock(documentId, { type: 'text', content: [], position: 1 });
        set({ blocks: [first], isLoading: false });
      } else {
        set({ blocks, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  addBlock: async (afterId, type = 'text', content = [], opts = {}) => {
    const { blocks, currentDocumentId } = get();
    if (!currentDocumentId) throw new Error('No document open');

    let position: number;
    if (afterId === null) {
      position = (blocks[0]?.position ?? 1) / 2;
    } else {
      const idx = blocks.findIndex(b => b.id === afterId);
      if (idx === -1) {
        position = (blocks[blocks.length - 1]?.position ?? 0) + 1;
      } else {
        const cur = blocks[idx].position;
        const next = blocks[idx + 1]?.position;
        position = next !== undefined ? (cur + next) / 2 : cur + 1;
      }
    }

    const tempId = uuidv4();
    const tempBlock: Block = {
      id: tempId,
      document_id: currentDocumentId,
      type,
      content,
      indent: 0,
      position,
      ...opts,
    };

    // Optimistic update
    set(s => {
      const idx = s.blocks.findIndex(b => b.id === afterId);
      const newBlocks = [...s.blocks];
      newBlocks.splice(idx + 1, 0, tempBlock);
      return { blocks: newBlocks };
    });

    try {
      const real = await api.createBlock(currentDocumentId, { type, content, position, ...opts });
      set(s => ({ blocks: s.blocks.map(b => b.id === tempId ? real : b) }));
      return real;
    } catch {
      set(s => ({ blocks: s.blocks.filter(b => b.id !== tempId) }));
      throw new Error('Failed to create block');
    }
  },

  updateBlock: async (id, data) => {
    // Optimistic update
    set(s => ({ blocks: s.blocks.map(b => b.id === id ? { ...b, ...data } : b) }));
    try {
      await api.updateBlock(id, data);
    } catch {
      // Revert on error — refetch
      if (get().currentDocumentId) await get().fetchBlocks(get().currentDocumentId!);
    }
  },

  deleteBlock: async (id) => {
    const { blocks } = get();
    // Don't delete if it's the only block
    if (blocks.length <= 1) {
      await get().updateBlock(id, { content: [], type: 'text' });
      return;
    }
    set(s => ({ blocks: s.blocks.filter(b => b.id !== id) }));
    await api.deleteBlock(id);
  },

  reorderBlocks: async (ids) => {
    const { currentDocumentId } = get();
    if (!currentDocumentId) return;
    set(s => {
      const map = new Map(s.blocks.map(b => [b.id, b]));
      return { blocks: ids.map((id, i) => ({ ...map.get(id)!, position: i + 1 })).filter(Boolean) };
    });
    await api.reorderBlocks(currentDocumentId, ids);
  },

  setFocusedBlock: (id, offset = 0) => set({ focusedBlockId: id, focusedBlockOffset: offset }),

  openSlashMenu: (blockId, query) => set({ slashMenuOpen: true, slashMenuBlockId: blockId, slashMenuQuery: query }),
  closeSlashMenu: () => set({ slashMenuOpen: false, slashMenuBlockId: null, slashMenuQuery: '' }),

  openFormatToolbar: (rect) => set({ formatToolbarOpen: true, formatToolbarRect: rect }),
  closeFormatToolbar: () => set({ formatToolbarOpen: false, formatToolbarRect: null }),

  changeBlockType: async (id, type) => {
    await get().updateBlock(id, { type, indent: 0 });
  },

  setBlocks: (blocks) => set({ blocks }),
}));
