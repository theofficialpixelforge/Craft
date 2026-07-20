'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../supabase');

const router = express.Router({ mergeParams: true });

// Supabase returns JSONB as parsed objects; normalizeBlock keeps the shape the client expects.
function normalizeBlock(b) {
  if (!b) return null;
  return {
    ...b,
    content: b.content ?? [],
    checked: b.checked ?? null,
    indent: Number(b.indent) || 0,
    position: Number(b.position) || 0,
  };
}

function parseJson(v, fallback) {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return fallback; } }
  return v;
}

// GET /api/documents/:id/blocks
router.get('/', async (req, res) => {
  const { data: blocks, error } = await supabaseAdmin
    .from('blocks')
    .select('*')
    .eq('document_id', req.params.id)
    .eq('org_id', req.auth.orgId)
    .order('position');
  if (error) return res.status(500).json({ error: error.message });
  res.json((blocks || []).map(normalizeBlock));
});

// POST /api/documents/:id/blocks
router.post('/', async (req, res) => {
  const docId = req.params.id;
  const {
    type = 'text',
    content = [],
    position,
    indent = 0,
    checked = null,
    language = null,
    callout_icon = null,
    image_url = null,
    image_caption = null,
    linked_doc_id = null,
    table_data = null,
    columns_data = null,
  } = req.body;

  let pos = position;
  if (pos === undefined || pos === null) {
    const { data: posRows } = await supabaseAdmin
      .from('blocks')
      .select('position')
      .eq('document_id', docId)
      .eq('org_id', req.auth.orgId)
      .order('position', { ascending: false })
      .limit(1);
    pos = (posRows?.[0]?.position ?? 0) + 1;
  }

  const id = uuidv4();
  const { data: block, error } = await supabaseAdmin
    .from('blocks')
    .insert({
      id,
      org_id: req.auth.orgId,
      document_id: docId,
      type,
      content: parseJson(content, []),
      indent,
      position: pos,
      checked,
      language,
      callout_icon,
      image_url,
      image_caption,
      linked_doc_id,
      table_data: parseJson(table_data, null),
      columns_data: parseJson(columns_data, null),
    })
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(normalizeBlock(block));
});

// PATCH /api/blocks/:blockId
router.patch('/:blockId', async (req, res) => {
  const allowed = ['type', 'content', 'indent', 'position', 'checked', 'language',
    'callout_icon', 'image_url', 'image_caption', 'linked_doc_id', 'table_data', 'columns_data'];
  const jsonFields = new Set(['content', 'table_data', 'columns_data']);
  const updates = {};

  for (const key of allowed) {
    if (key in req.body) {
      const raw = req.body[key];
      updates[key] = jsonFields.has(key) ? parseJson(raw, key === 'content' ? [] : null) : raw;
    }
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });

  const { data: block, error } = await supabaseAdmin
    .from('blocks')
    .update(updates)
    .eq('id', req.params.blockId)
    .eq('org_id', req.auth.orgId)
    .select('*')
    .single();
  if (error || !block) return res.status(404).json({ error: error?.message || 'Not found' });
  res.json(normalizeBlock(block));
});

// DELETE /api/blocks/:blockId
router.delete('/:blockId', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('blocks')
    .delete()
    .eq('id', req.params.blockId)
    .eq('org_id', req.auth.orgId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /api/documents/:id/blocks/reorder
router.post('/reorder', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });

  await Promise.all(
    ids.map((id, i) =>
      supabaseAdmin
        .from('blocks')
        .update({ position: i + 1 })
        .eq('id', id)
        .eq('org_id', req.auth.orgId),
    ),
  );

  res.json({ success: true });
});

module.exports = router;
