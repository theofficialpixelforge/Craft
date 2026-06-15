const express = require('express');
const { getDB } = require('../db/database');

const router = express.Router();

// GET /api/search?q=<query>&limit=20
router.get('/', (req, res) => {
  const { prepare } = getDB();
  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  if (!q) return res.json([]);

  const likeQ = `%${q}%`;

  // Search document titles
  const titleRows = prepare(`
    SELECT id, title, emoji FROM documents
    WHERE title LIKE ? AND is_deleted = 0
    LIMIT ?
  `).all(likeQ, 10);

  // Search block content
  const blockRows = prepare(`
    SELECT b.id as block_id, b.content as block_content, b.document_id,
           d.title as document_title, d.emoji as document_emoji
    FROM blocks b
    JOIN documents d ON d.id = b.document_id
    WHERE b.content LIKE ? AND d.is_deleted = 0
    LIMIT ?
  `).all(likeQ, limit);

  const titleResults = titleRows.map(d => ({
    document_id: d.id,
    document_title: d.title,
    document_emoji: d.emoji,
    block_id: null,
    snippet: d.title,
    is_title_match: true,
  }));

  const seenDocs = new Set(titleResults.map(r => r.document_id));

  const blockResults = blockRows
    .filter(r => !seenDocs.has(r.document_id))
    .map(r => {
      let plainText = '';
      try {
        const nodes = JSON.parse(r.block_content);
        plainText = extractText(nodes);
      } catch {
        plainText = r.block_content;
      }
      const idx = plainText.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, idx - 30);
      const snippet = (start > 0 ? '...' : '') + plainText.slice(start, start + 80) + (start + 80 < plainText.length ? '...' : '');
      return {
        document_id: r.document_id,
        document_title: r.document_title,
        document_emoji: r.document_emoji,
        block_id: r.block_id,
        snippet: snippet.replace(new RegExp(q, 'gi'), `<mark>$&</mark>`),
        is_title_match: false,
      };
    });

  res.json([...titleResults, ...blockResults].slice(0, limit));
});

function extractText(nodes) {
  if (!Array.isArray(nodes)) return '';
  return nodes.map(n => {
    if (n.t === 'text') return n.v || '';
    if (n.c) return extractText(n.c);
    return '';
  }).join('');
}

module.exports = router;
