const http = require('http');

const DOC_ID = '1ffc55ae-2b1b-47a5-ace1-167a44c290a7';
const BASE   = 'localhost';
const PORT   = 3001;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: BASE, port: PORT, path, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    };
    const r = http.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const txt = v => [{ t: 'text', v }];

const BLOCKS = [
  // ── Intro ────────────────────────────────────────────────────────────────
  { type: 'h1',     content: txt('Craft Handbook 💻') },
  { type: 'quote',  content: txt("Here's an overview of this app's main features. Everything you need to know to get the most out of your workspace.") },
  { type: 'divider',content: txt('') },

  // ── Get to Know the App ──────────────────────────────────────────────────
  { type: 'h2',     content: txt('Get to Know the App') },
  { type: 'h3',     content: txt('The Basics') },
  { type: 'text',   content: txt('This is a block-based document editor — everything on a page is a block. Each block can be a paragraph, heading, list item, image, code snippet, and more. Blocks are reorderable by dragging the handle on the left, and nestable using Tab.') },
  { type: 'bullet', content: txt('Every page is made of blocks — click anywhere below the title to start writing') },
  { type: 'bullet', content: txt('Drag the grip handle ⋮⋮ on the left of any block to reorder it') },
  { type: 'bullet', content: txt("Use Tab to indent list blocks and Shift+Tab to dedent them") },
  { type: 'bullet', content: txt('Click the + button on the left of any block to insert a new one below it') },

  { type: 'h3',     content: txt('12 Block Types') },
  { type: 'text',   content: txt('Open the block picker by typing / at the start of any line:') },
  { type: 'numbered', content: txt('Text — regular paragraph') },
  { type: 'numbered', content: txt('Heading 1, 2, 3 — section titles at three sizes') },
  { type: 'numbered', content: txt('Bullet List — unordered list, supports up to 4 levels of nesting') },
  { type: 'numbered', content: txt('Numbered List — ordered list with automatic numbering') },
  { type: 'numbered', content: txt('To-do — checkbox task, click to mark done') },
  { type: 'numbered', content: txt('Code — monospace block with language selector and copy button') },
  { type: 'numbered', content: txt('Quote — indented blockquote with italic styling') },
  { type: 'numbered', content: txt('Divider — horizontal separator line') },
  { type: 'numbered', content: txt('Callout — highlighted box with a customisable emoji icon') },
  { type: 'numbered', content: txt('Image — paste a URL to embed any image with an optional caption') },

  { type: 'h3',     content: txt('Auto-Markdown Shortcuts') },
  { type: 'text',   content: txt('Type these at the start of a line followed by Space to instantly change the block type:') },
  { type: 'bullet', content: txt('# + Space → Heading 1') },
  { type: 'bullet', content: txt('## + Space → Heading 2') },
  { type: 'bullet', content: txt('### + Space → Heading 3') },
  { type: 'bullet', content: txt('- + Space → Bullet List') },
  { type: 'bullet', content: txt('1. + Space → Numbered List') },
  { type: 'bullet', content: txt('[] + Space → To-do') },
  { type: 'bullet', content: txt('> + Space → Quote') },
  { type: 'bullet', content: txt('``` + Space → Code Block') },
  { type: 'bullet', content: txt('--- → Divider (no Space needed)') },
  { type: 'divider', content: txt('') },

  // ── Tasks and Scheduling ─────────────────────────────────────────────────
  { type: 'h2',   content: txt('Tasks and Scheduling') },
  { type: 'h3',   content: txt('Tasks View') },
  { type: 'text', content: txt("Click Tasks in the sidebar to open the task manager. Tasks are organised across four tabs: Inbox (uncategorised), Today (due today), Upcoming (future due dates), and All Tasks (everything in your workspace). Any block set to the To-do type across any document also appears here.") },
  { type: 'h3',   content: txt('Calendar View') },
  { type: 'text', content: txt('The Calendar view shows a scrollable list of days starting from today. Click a day card to view or create notes for that day. Use the bottom bar to quickly Add Task or Create Daily Note.') },
  { type: 'callout', content: txt('Tip: Daily notes are great for capturing meeting notes and decisions for a specific day — they stay linked to that date forever.'), callout_icon: '💡' },
  { type: 'divider', content: txt('') },

  // ── Adding Content ───────────────────────────────────────────────────────
  { type: 'h2',   content: txt('Adding Content') },
  { type: 'h3',   content: txt('Using the Slash Command Menu') },
  { type: 'text', content: txt("The fastest way to add any block type is the slash command. Place your cursor at the start of an empty line and type / — a searchable menu appears. Type a few letters to filter (e.g. /code, /head, /call) and press Enter or click to insert.") },

  { type: 'h3',   content: txt('Inline Formatting') },
  { type: 'text', content: txt('Select any text to reveal the floating format toolbar above the selection:') },
  { type: 'bullet', content: txt('Bold — Cmd+B (Mac) or Ctrl+B (Windows)') },
  { type: 'bullet', content: txt('Italic — Cmd+I') },
  { type: 'bullet', content: txt('Underline — Cmd+U') },
  { type: 'bullet', content: txt('Strikethrough — available in the toolbar') },
  { type: 'bullet', content: txt('Inline Code — Cmd+` or the toolbar') },
  { type: 'bullet', content: txt('Link — Cmd+K with text selected, or the toolbar link button') },

  { type: 'h3',   content: txt('Images') },
  { type: 'text', content: txt('Type /image or click + and choose Image. Paste any image URL into the field and press Add. The image renders inline with an optional caption below.') },

  { type: 'h3',   content: txt('Code Blocks') },
  { type: 'text', content: txt('Type /code to insert a code block. Use the language dropdown to set the language (JavaScript, TypeScript, Python, Rust, Go, SQL, Bash and more). Press Cmd+Enter inside the block to create a new text block below. Click Copy in the top-right to copy code to clipboard.') },

  { type: 'h3',   content: txt('Callouts') },
  { type: 'text', content: txt('Callouts are highlighted boxes for important notes. Type /callout to insert one. Click the emoji icon on the left to pick a different icon (💡 ℹ️ ⚠️ 🚨 ✅ 📌 🎯 💬 🔥 ⭐).') },
  { type: 'divider', content: txt('') },

  // ── Styling ──────────────────────────────────────────────────────────────
  { type: 'h2',   content: txt('Styling and Customisation') },
  { type: 'h3',   content: txt('Dark / Light / System Mode') },
  { type: 'text', content: txt('Toggle between Light, Dark, and System theme using the theme button in the bottom-left of the sidebar. System mode follows your OS preference automatically. All colours adapt instantly — no reload required.') },

  { type: 'h3',   content: txt('Document Covers') },
  { type: 'text', content: txt("Hover over the title area and click Add cover to choose from six gradient presets: Ocean, Lavender, Rose, Sunset, Teal, and Storm. Click Change cover to switch, or Remove to clear it.") },

  { type: 'h3',   content: txt('Emoji Icons') },
  { type: 'text', content: txt("Give any document a visual identity. Hover the title area and click Add icon, or click an existing emoji to change it. The emoji appears in the sidebar, document cards, and search results.") },

  { type: 'h3',   content: txt('Favourites') },
  { type: 'text', content: txt('Star any document with the ⭐ icon in the top-right of the editor. Starred documents appear in the Starred section at the top of the sidebar for instant access.') },
  { type: 'divider', content: txt('') },

  // ── Search ───────────────────────────────────────────────────────────────
  { type: 'h2',   content: txt('Search') },
  { type: 'text', content: txt("Press Cmd+K (Mac) or Ctrl+K (Windows) anywhere in the app to open the search modal. Search scans both document titles and the content of every block across your entire workspace.") },
  { type: 'bullet', content: txt('Results show a snippet with the matching text highlighted') },
  { type: 'bullet', content: txt('Use arrow keys to navigate results and Enter to open') },
  { type: 'bullet', content: txt('Opening search with an empty query shows your 8 most recent documents') },
  { type: 'callout', content: txt("Tip: The search bar at the top shows the current folder name when you're inside a folder view, so you always know where you are."), callout_icon: '💡' },
  { type: 'divider', content: txt('') },

  // ── Keyboard Shortcuts ───────────────────────────────────────────────────
  { type: 'h2',   content: txt('Keyboard Shortcuts') },
  { type: 'h3',   content: txt('Global') },
  { type: 'bullet', content: txt('⌘K / Ctrl+K — Open search') },
  { type: 'bullet', content: txt('⌘N / Ctrl+N — New document') },
  { type: 'bullet', content: txt('⌘\\ / Ctrl+\\ — Toggle table of contents panel') },
  { type: 'h3',   content: txt('Editor') },
  { type: 'bullet', content: txt('/ — Open block type menu') },
  { type: 'bullet', content: txt('Enter — Create new block below') },
  { type: 'bullet', content: txt('Backspace at start — Delete empty block or reset type to Text') },
  { type: 'bullet', content: txt('Tab — Indent list block (up to 4 levels)') },
  { type: 'bullet', content: txt('Shift+Tab — Dedent list block') },
  { type: 'bullet', content: txt('⌘B — Bold  |  ⌘I — Italic  |  ⌘U — Underline') },
  { type: 'bullet', content: txt('⌘K (with selection) — Create link') },
  { type: 'bullet', content: txt('⌘` — Inline code') },
  { type: 'bullet', content: txt('Arrow Up / Down — Move cursor between blocks') },
  { type: 'h3',   content: txt('Code Blocks') },
  { type: 'bullet', content: txt('Tab — Insert 2 spaces') },
  { type: 'bullet', content: txt('⌘+Enter — Exit code block, create text block below') },
  { type: 'divider', content: txt('') },

  // ── Export ───────────────────────────────────────────────────────────────
  { type: 'h2',   content: txt('Export') },
  { type: 'h3',   content: txt('Export a Document as Markdown') },
  { type: 'text', content: txt('Any document can be exported as a standard .md file that works in GitHub, Obsidian, VS Code, or any static site generator.') },
  { type: 'numbered', content: txt('Open the document you want to export') },
  { type: 'numbered', content: txt('Click the ··· menu in the top-right corner of the document') },
  { type: 'numbered', content: txt('Choose Export as Markdown') },
  { type: 'numbered', content: txt('The file downloads immediately, named after the document title') },
  { type: 'text', content: txt('The export preserves all formatting: headings, bold, italic, links, bullet and numbered lists, to-dos, code blocks with language tags, quotes, callouts, and image URLs.') },
  { type: 'h3',   content: txt('Export All Docs') },
  { type: 'text', content: txt("From the All Docs home view, click ··· and choose Export as Markdown. This downloads every document in your workspace as individual Markdown files.") },
  { type: 'divider', content: txt('') },

  // ── Assistant ────────────────────────────────────────────────────────────
  { type: 'h2',   content: txt('Assistant Panel') },
  { type: 'text', content: txt("Click the Assistant button in the bottom-right corner to open the AI assistant panel alongside your current view.") },
  { type: 'bullet', content: txt('Research a Topic — deep-dive into any subject') },
  { type: 'bullet', content: txt('Semantic Search — find related content across your docs') },
  { type: 'bullet', content: txt('Get an Overview — summarise the current document') },
  { type: 'bullet', content: txt('Fast mode — quicker responses for short questions') },
  { type: 'bullet', content: txt('Auto mode — the assistant picks the best approach for your query') },
  { type: 'text', content: txt('Click New Chat at the top of the panel to start a fresh conversation. The context card at the bottom shows which space or document the assistant is aware of.') },
  { type: 'divider', content: txt('') },

  // ── Imagine ──────────────────────────────────────────────────────────────
  { type: 'h2',   content: txt('Imagine') },
  { type: 'text', content: txt("Click Imagine in the sidebar to open the integrations hub — where you connect external tools and build workflows around your documents.") },
  { type: 'bullet', content: txt('MCP Connections — let AI tools like Claude read and write your documents') },
  { type: 'bullet', content: txt('API Connections — build custom automations and push data into your docs') },
  { type: 'callout', content: txt('Imagine the possibilities when everything is connected to your workspace.'), callout_icon: '✨' },
  { type: 'divider', content: txt('') },

  // ── Start Building ───────────────────────────────────────────────────────
  { type: 'h2',   content: txt('Start Building Your Workspace 🎉') },
  { type: 'text', content: txt("You now know everything you need. Here are some tasks to get you started:") },
  { type: 'todo', content: txt('Create your first document and give it an emoji icon') },
  { type: 'todo', content: txt('Try all 12 block types using the / command') },
  { type: 'todo', content: txt('Star your favourite documents for quick access') },
  { type: 'todo', content: txt('Add a cover image to this handbook') },
  { type: 'todo', content: txt('Open the Calendar and create a daily note for today') },
  { type: 'todo', content: txt('Export a document to Markdown') },
  { type: 'todo', content: txt('Open the Assistant panel and try a suggestion') },
  { type: 'callout', content: txt("You're all set. Happy writing! ✏️"), callout_icon: '🎉' },
];

(async () => {
  // Clear existing blocks
  const existing = await req('GET', `/api/documents/${DOC_ID}/blocks`);
  for (const b of (Array.isArray(existing) ? existing : [])) {
    await req('DELETE', `/api/blocks/${b.id}`);
  }

  // Set cover
  await req('PATCH', `/api/documents/${DOC_ID}`, { cover_url: 'gradient-blue' });

  // Add new blocks
  for (let i = 0; i < BLOCKS.length; i++) {
    const block = BLOCKS[i];
    await req('POST', `/api/documents/${DOC_ID}/blocks`, {
      ...block,
      position: i + 1,
    });
    process.stdout.write(`\r${i + 1}/${BLOCKS.length} blocks added`);
  }
  console.log('\n✅ Handbook filled!');
})();
