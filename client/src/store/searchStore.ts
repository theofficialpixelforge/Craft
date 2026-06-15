import { create } from 'zustand';
import { api } from '../api';
import type { SearchResult } from '../types';

const RECENT_KEY = 'craft_recent_docs';
const MAX_RECENT = 8;

interface SearchStore {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  recentIds: string[];

  setQuery: (q: string) => void;
  search: (q: string) => Promise<void>;
  addRecent: (id: string) => void;
  clearQuery: () => void;
}

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

let searchTimer: ReturnType<typeof setTimeout>;

export const useSearchStore = create<SearchStore>((set, get) => ({
  query: '',
  results: [],
  isSearching: false,
  recentIds: loadRecent(),

  setQuery: (q) => {
    set({ query: q });
    clearTimeout(searchTimer);
    if (!q.trim()) return set({ results: [], isSearching: false });
    set({ isSearching: true });
    searchTimer = setTimeout(() => get().search(q), 200);
  },

  search: async (q) => {
    try {
      const results = await api.search(q);
      set({ results, isSearching: false });
    } catch {
      set({ results: [], isSearching: false });
    }
  },

  addRecent: (id) => {
    const prev = get().recentIds.filter(r => r !== id);
    const next = [id, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    set({ recentIds: next });
  },

  clearQuery: () => {
    clearTimeout(searchTimer);
    set({ query: '', results: [], isSearching: false });
  },
}));
