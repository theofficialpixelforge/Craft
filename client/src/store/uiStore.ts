import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';
type RightPanelTab = 'toc' | 'backlinks';

interface UIStore {
  theme: Theme;
  sidebarCollapsed: boolean;
  rightPanelOpen: boolean;
  rightPanelTab: RightPanelTab;
  searchModalOpen: boolean;
  emojiPickerOpen: boolean;
  emojiPickerFor: 'document' | 'callout' | null;
  coverPickerOpen: boolean;
  exportModalOpen: boolean;

  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  openSearchModal: () => void;
  closeSearchModal: () => void;
  openEmojiPicker: (for_: 'document' | 'callout') => void;
  closeEmojiPicker: () => void;
  openCoverPicker: () => void;
  closeCoverPicker: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
}

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
}

const saved = (localStorage.getItem('theme') as Theme) || 'system';
applyTheme(saved);

export const useUIStore = create<UIStore>((set) => ({
  theme: saved,
  sidebarCollapsed: false,
  rightPanelOpen: false,
  rightPanelTab: 'toc',
  searchModalOpen: false,
  emojiPickerOpen: false,
  emojiPickerFor: null,
  coverPickerOpen: false,
  exportModalOpen: false,

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  openSearchModal: () => set({ searchModalOpen: true }),
  closeSearchModal: () => set({ searchModalOpen: false }),
  openEmojiPicker: (emojiPickerFor) => set({ emojiPickerOpen: true, emojiPickerFor }),
  closeEmojiPicker: () => set({ emojiPickerOpen: false, emojiPickerFor: null }),
  openCoverPicker: () => set({ coverPickerOpen: true }),
  closeCoverPicker: () => set({ coverPickerOpen: false }),
  openExportModal: () => set({ exportModalOpen: true }),
  closeExportModal: () => set({ exportModalOpen: false }),
}));
