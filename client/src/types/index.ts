export type BlockType =
  | 'text'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'code'
  | 'quote'
  | 'divider'
  | 'callout'
  | 'image'
  | 'page'
  | 'table'
  | 'columns2'
  | 'columns3';

export interface TableData {
  hasHeader: boolean;
  rows: string[][];
}

export type InlineNode =
  | { t: 'text'; v: string }
  | { t: 'bold' | 'italic' | 'underline' | 'strike' | 'code'; c: InlineNode[] }
  | { t: 'link'; href: string; c: InlineNode[] };

export interface Block {
  id: string;
  document_id: string;
  type: BlockType;
  content: InlineNode[];
  indent: number;
  position: number;
  checked?: boolean | null;
  language?: string | null;
  callout_icon?: string | null;
  image_url?: string | null;
  image_caption?: string | null;
  linked_doc_id?: string | null;
  table_data?: TableData | null;
  columns_data?: InlineNode[][] | null;
  created_at?: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  parent_id: string | null;
  title: string;
  emoji: string | null;
  cover_url: string | null;
  position: number;
  is_favorite: boolean;
  is_deleted?: boolean;
  children: Document[];
  created_at?: string;
  updated_at?: string;
}

export interface SearchResult {
  document_id: string;
  document_title: string;
  document_emoji: string | null;
  block_id: string | null;
  snippet: string;
  is_title_match?: boolean;
}

export interface BlockMenuItem {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
}

export const BLOCK_MENU_ITEMS: BlockMenuItem[] = [
  { type: 'text',     label: 'Text',          description: 'Just start writing',              icon: '¶',    keywords: ['text', 'paragraph', 'plain'] },
  { type: 'h1',       label: 'Heading 1',     description: 'Big section heading',             icon: 'H1',   keywords: ['h1', 'heading', 'title', 'large'] },
  { type: 'h2',       label: 'Heading 2',     description: 'Medium section heading',          icon: 'H2',   keywords: ['h2', 'heading', 'subtitle', 'medium'] },
  { type: 'h3',       label: 'Heading 3',     description: 'Small section heading',           icon: 'H3',   keywords: ['h3', 'heading', 'small'] },
  { type: 'bullet',   label: 'Bullet List',   description: 'Create a simple bulleted list',   icon: '•',    keywords: ['bullet', 'list', 'unordered', 'ul'] },
  { type: 'numbered', label: 'Numbered List', description: 'Create a list with numbering',    icon: '1.',   keywords: ['numbered', 'list', 'ordered', 'ol', 'number'] },
  { type: 'todo',     label: 'To-do',         description: 'Track tasks with a checkbox',     icon: '☐',    keywords: ['todo', 'task', 'check', 'checkbox'] },
  { type: 'code',     label: 'Code',          description: 'Capture a code snippet',          icon: '</>',  keywords: ['code', 'snippet', 'programming', 'pre'] },
  { type: 'quote',    label: 'Quote',         description: 'Capture a quote',                 icon: '"',    keywords: ['quote', 'blockquote', 'citation'] },
  { type: 'callout',  label: 'Callout',       description: 'Make writing stand out',          icon: '💡',   keywords: ['callout', 'highlight', 'note', 'info', 'warning'] },
  { type: 'divider',  label: 'Divider',       description: 'Visually divide the page',        icon: '—',    keywords: ['divider', 'separator', 'rule', 'hr', 'line'] },
  { type: 'image',    label: 'Image',         description: 'Upload or embed with a link',     icon: '🖼',   keywords: ['image', 'photo', 'picture', 'img'] },
  { type: 'page',     label: 'Page',          description: 'Link to another document',         icon: '📄',   keywords: ['page', 'link', 'document', 'subpage'] },
  { type: 'table',    label: 'Table',         description: 'Insert a table with rows & columns', icon: '⊞',   keywords: ['table', 'grid', 'spreadsheet', 'rows', 'columns'] },
  { type: 'columns2', label: '2 Columns',     description: 'Two side-by-side text columns',     icon: '⊟',   keywords: ['2 columns', 'split', 'layout', 'side by side'] },
  { type: 'columns3', label: '3 Columns',     description: 'Three side-by-side text columns',   icon: '⊠',   keywords: ['3 columns', 'split', 'layout', 'side by side'] },
];

export const COVER_PRESETS = [
  { id: 'gradient-blue',   label: 'Ocean',   style: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #60a5fa 100%)' },
  { id: 'gradient-purple', label: 'Lavender',style: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #c4b5fd 100%)' },
  { id: 'gradient-rose',   label: 'Rose',    style: 'linear-gradient(135deg, #881337 0%, #e11d48 50%, #fda4af 100%)' },
  { id: 'gradient-amber',  label: 'Sunset',  style: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #fcd34d 100%)' },
  { id: 'gradient-teal',   label: 'Teal',    style: 'linear-gradient(135deg, #134e4a 0%, #0d9488 50%, #5eead4 100%)' },
  { id: 'gradient-slate',  label: 'Storm',   style: 'linear-gradient(135deg, #0f172a 0%, #334155 50%, #94a3b8 100%)' },
];
