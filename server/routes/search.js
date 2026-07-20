'use strict';

const express = require('express');
const { supabaseAdmin } = require('../supabase');

const router = express.Router();

// GET /api/search?q=<query>&limit=20
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  if (!q) return res.json([]);

  const orgId = req.auth.orgId;

  const [titleResult, blockResult] = await Promise.all([
    supabaseAdmin
      .from('documents')
      .select('id, title, emoji')
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .ilike('title', `%${q}%`)
      .limit(10),
    supabaseAdmin
      .from('blocks')
      .select('id, document_id, content')
      .eq('org_id', orgId)
      .filter('content::text', 'ilike', `%${q}%`)
      .limit(limit),
  ]);

  const titleDocs = titleResult.data || [];
  const blockRows = blockResult.data || [];
  const seenDocIds = new Set(titleDocs.map(d => d.id));

  const blockDocIds = [...new Set(
    blockRows.map(b => b.document_id).filter(id => !seenDocIds.has(id)),
  )];

  let blockDocMap = {};
  if (blockDocIds.length > 0) {
    const { data: blockDocs } = await supabaseAdmin
      .from('documents')
      .select('id, title, emoji')
      .in('id', blockDocIds)
      .eq('is_deleted', false);
    for (const d of blockDocs || []) blockDocMap[d.id] = d;
  }

  const titleResults = titleDocs.map(d => ({
    document_id: d.id,
    document_title: d.title,
    document_emoji: d.emoji,
    block_id: null,
    snippet: d.title,
    is_title_match: true,
  }));

  const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockResults = blockRows
    .filter(r => !seenDocIds.has(r.document_id) && blockDocMap[r.document_id])
    .map(r => {
      const doc = blockDocMap[r.document_id];
      const plainText = extractText(Array.isArray(r.content) ? r.content : []);
      const idx = plainText.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, idx - 30);
      const snippet = (start > 0 ? '...' : '') +
        plainText.slice(start, start + 80) +
        (start + 80 < plainText.length ? '...' : '');
      return {
        document_id: r.document_id,
        document_title: doc.title,
        document_emoji: doc.emoji,
        block_id: r.id,
        snippet: snippet.replace(new RegExp(safeQ, 'gi'), '<mark>$&</mark>'),
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
