const { v4: uuidv4 } = require('uuid');

function txt(v) { return JSON.stringify([{ t: 'text', v }]); }
function bold(v) { return JSON.stringify([{ t: 'bold', c: [{ t: 'text', v }] }]); }
function mixed(...parts) { return JSON.stringify(parts); }

function seedIfEmpty(db) {
  const { prepare } = db;
  const existing = prepare("SELECT id FROM documents WHERE title = 'How to use Craft' AND is_deleted = 0").get();
  if (existing) return;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const folderId = uuidv4();
  const doc1Id   = uuidv4(); // Getting Started
  const doc2Id   = uuidv4(); // Craft Handbook
  const doc3Id   = uuidv4(); // How To Videos

  // ── Documents ────────────────────────────────────────────────────────────
  const insDoc = prepare(`
    INSERT INTO documents (id, parent_id, title, emoji, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insDoc.run(folderId, null,     'How to use Craft', '🖐️', 1, now, now);
  insDoc.run(doc1Id,   folderId, 'Getting Started',  '👋',  1, now, now);
  insDoc.run(doc2Id,   folderId, 'Craft Handbook',   '💻',  2, now, now);
  insDoc.run(doc3Id,   folderId, 'How To Videos',    '📺',  3, now, now);

  // ── Blocks helper ────────────────────────────────────────────────────────
  const insBlock = prepare(`
    INSERT INTO blocks (id, document_id, type, content, indent, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?)
  `);

  const addBlock = (docId, type, content, pos) =>
    insBlock.run(uuidv4(), docId, type, content, pos, now, now);

  // ── Getting Started ──────────────────────────────────────────────────────
  addBlock(doc1Id, 'h1',     txt('Getting Started'), 1);
  addBlock(doc1Id, 'text',   txt('Think of Craft as your personal notebook. Bring together Tasks, your Calendar as well as Docs in one place to keep an overview of projects, work and life.'), 2);
  addBlock(doc1Id, 'divider',txt(''), 3);
  addBlock(doc1Id, 'h2',     txt('What can you do in Craft?'), 4);
  addBlock(doc1Id, 'bullet', txt('Write beautiful documents with rich formatting'), 5);
  addBlock(doc1Id, 'bullet', txt('Organise your notes in folders and subpages'), 6);
  addBlock(doc1Id, 'bullet', txt('Manage tasks alongside your documents'), 7);
  addBlock(doc1Id, 'bullet', txt('Share and collaborate with others'), 8);
  addBlock(doc1Id, 'bullet', txt('Use the AI Assistant to research, summarise and more'), 9);
  addBlock(doc1Id, 'divider',txt(''), 10);
  addBlock(doc1Id, 'callout',txt('💡 Tip: Press / anywhere in a document to see all available block types — headings, lists, code, images and more.'), 11);
  addBlock(doc1Id, 'h2',     txt('Creating your first document'), 12);
  addBlock(doc1Id, 'text',   txt('Click New Document in the sidebar, or press ⌘N to start a fresh page. Give it a title, then click below the title or press Enter to begin writing.'), 13);
  addBlock(doc1Id, 'todo',   txt('Create your first document'), 14);
  addBlock(doc1Id, 'todo',   txt('Try the slash (/) command menu'), 15);
  addBlock(doc1Id, 'todo',   txt('Add an emoji icon to a document'), 16);
  addBlock(doc1Id, 'text',   txt('Have fun with writing again 🎉'), 17);

  // ── Craft Handbook ───────────────────────────────────────────────────────
  addBlock(doc2Id, 'h1',     txt('Craft Handbook'), 1);
  addBlock(doc2Id, 'text',   txt("Here's an overview of Craft's main features in brief."), 2);
  addBlock(doc2Id, 'divider',txt(''), 3);
  addBlock(doc2Id, 'h2',     txt('Are videos your thing?'), 4);
  addBlock(doc2Id, 'text',   txt("Check out our How To Videos page — subscribe to always get the latest videos from our team!"), 5);
  addBlock(doc2Id, 'text',   txt('Want to become a pro? Explore our Craft Master course.'), 6);
  addBlock(doc2Id, 'text',   txt('Need help? Visit our Help Centre.'), 7);
  addBlock(doc2Id, 'divider',txt(''), 8);
  addBlock(doc2Id, 'h2',     txt('Get to Know Craft'), 9);
  addBlock(doc2Id, 'h3',     txt('The Basics'), 10);
  addBlock(doc2Id, 'bullet', txt('Blocks are the fundamental units in Craft. Every paragraph, heading, list item and image is a block.'), 11);
  addBlock(doc2Id, 'bullet', txt('Pages contain blocks and can themselves be nested inside other pages.'), 12);
  addBlock(doc2Id, 'bullet', txt('Spaces are the top-level containers — think of them as separate notebooks.'), 13);
  addBlock(doc2Id, 'h3',     txt('Tasks and Scheduling'), 14);
  addBlock(doc2Id, 'bullet', txt('Turn any block into a task by clicking the checkbox, or use the /todo block type.'), 15);
  addBlock(doc2Id, 'bullet', txt('Assign due dates to tasks and they appear in the Calendar view automatically.'), 16);
  addBlock(doc2Id, 'bullet', txt('Use the Tasks view to see all your outstanding to-dos across every document.'), 17);
  addBlock(doc2Id, 'h3',     txt('Daily Notes and Pages'), 18);
  addBlock(doc2Id, 'bullet', txt('Create a daily note from the Calendar view to capture thoughts for that day.'), 19);
  addBlock(doc2Id, 'bullet', txt('Daily notes are linked to their calendar date for easy retrieval.'), 20);

  // ── How To Videos ────────────────────────────────────────────────────────
  addBlock(doc3Id, 'h1',     txt('How To Videos'), 1);
  addBlock(doc3Id, 'text',   txt('Learn Craft fast with our short How to Videos. Clicking the links below will take you to the Craft YouTube channel — subscribe to always get the latest videos from our team!'), 2);
  addBlock(doc3Id, 'divider',txt(''), 3);
  addBlock(doc3Id, 'h2',     txt('Craft — An Introduction'), 4);
  addBlock(doc3Id, 'text',   txt('Get going with this short introduction video to Craft for iPhone, iPad and Mac.'), 5);
  addBlock(doc3Id, 'callout',txt('▶ Introducing Craft for iPhone, iPad and Mac — watch on YouTube'), 6);
  addBlock(doc3Id, 'divider',txt(''), 7);
  addBlock(doc3Id, 'h2',     txt('Using Blocks and Pages'), 8);
  addBlock(doc3Id, 'bullet', txt('How blocks work'), 9);
  addBlock(doc3Id, 'bullet', txt('How to create a page'), 10);
  addBlock(doc3Id, 'bullet', txt('How to move and nest blocks'), 11);
  addBlock(doc3Id, 'divider',txt(''), 12);
  addBlock(doc3Id, 'h2',     txt('Formatting and Styling'), 13);
  addBlock(doc3Id, 'bullet', txt('Text formatting shortcuts'), 14);
  addBlock(doc3Id, 'bullet', txt('Using headings and dividers'), 15);
  addBlock(doc3Id, 'bullet', txt('Adding images and code blocks'), 16);
  addBlock(doc3Id, 'divider',txt(''), 17);
  addBlock(doc3Id, 'h2',     txt('Tips and Tricks'), 18);
  addBlock(doc3Id, 'bullet', txt('The slash (/) command menu'), 19);
  addBlock(doc3Id, 'bullet', txt('Keyboard shortcuts reference'), 20);
  addBlock(doc3Id, 'bullet', txt('Using the Craft Assistant'), 21);

  console.log('✅ Seeded "How to use Craft" folder with 3 documents.');
}

module.exports = { seedIfEmpty };
