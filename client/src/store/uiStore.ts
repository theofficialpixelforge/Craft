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

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function mixWithWhite(hex: string, pct: number): string {
  const [r,g,b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c*pct + 255*(1-pct));
  const toH = (n: number) => Math.min(255,n).toString(16).padStart(2,'0');
  return `#${toH(mix(r))}${toH(mix(g))}${toH(mix(b))}`;
}

export function applyTintedSidebar(accent: string) {
  const d = document.documentElement;
  if (!d.classList.contains('dark')) {
    d.style.setProperty('--bg-sidebar', mixWithWhite(accent, 0.12));
    d.style.setProperty('--bg-app', mixWithWhite(accent, 0.07));
    d.style.setProperty('--bg-block-hover', mixWithWhite(accent, 0.18));
  }
}

export function clearTintedSidebar() {
  const d = document.documentElement;
  d.style.removeProperty('--bg-sidebar');
  d.style.removeProperty('--bg-app');
  d.style.removeProperty('--bg-block-hover');
}

function initImageTheme(): boolean {
  const stored = localStorage.getItem('craft_image_theme');
  if (!stored) return false;
  try {
    const { vars, isDark } = JSON.parse(stored) as { vars: Record<string, string>; isDark: boolean };
    Object.entries(vars).forEach(([k,v]) => document.documentElement.style.setProperty(k, v));
    document.documentElement.classList.toggle('dark', isDark);
    return true;
  } catch {
    localStorage.removeItem('craft_image_theme');
    return false;
  }
}

function initAccentTheme() {
  if (localStorage.getItem('craft_image_theme')) return;
  const accent = localStorage.getItem('craft_accent');
  const tinted = localStorage.getItem('craft_sidebar_tinted') === 'true';
  if (accent) document.documentElement.style.setProperty('--accent', accent);
  if (tinted && accent) applyTintedSidebar(accent);
}

const saved = (localStorage.getItem('theme') as Theme) || 'system';
applyTheme(saved);
initImageTheme();
initAccentTheme();

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
