'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../supabase');

const router = express.Router();

function buildTree(rows, parentId = null) {
  return rows
    .filter(r => (r.parent_id || null) === parentId)
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map(r => ({ ...r, children: buildTree(rows, r.id) }));
}

// GET /api/documents
router.get('/', async (req, res) => {
  const { data: rows, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('org_id', req.auth.orgId)
    .eq('is_deleted', false)
    .order('position');
  if (error) return res.status(500).json({ error: error.message });
  res.json(buildTree(rows || []));
});

// GET /api/documents/favorites
router.get('/favorites', async (req, res) => {
  const { data: rows, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('org_id', req.auth.orgId)
    .eq('is_deleted', false)
    .eq('is_favorite', true)
    .order('title');
  if (error) return res.status(500).json({ error: error.message });
  res.json((rows || []).map(r => ({ ...r, children: [] })));
});

// GET /api/documents/:id
router.get('/:id', async (req, res) => {
  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', req.params.id)
    .eq('org_id', req.auth.orgId)
    .eq('is_deleted', false)
    .single();
  if (error || !doc) return res.status(404).json({ error: 'Not found' });
  res.json({ ...doc, children: [] });
});

// GET /api/documents/:id/backlinks
router.get('/:id/backlinks', async (req, res) => {
  const { data: links, error: linksError } = await supabaseAdmin
    .from('backlinks')
    .select('source_doc_id')
    .eq('target_doc_id', req.params.id)
    .eq('org_id', req.auth.orgId);
  if (linksError) return res.status(500).json({ error: linksError.message });
  if (!links?.length) return res.json([]);

  const sourceIds = links.map(l => l.source_doc_id);
  const { data: docs, error: docsError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .in('id', sourceIds)
    .eq('is_deleted', false);
  if (docsError) return res.status(500).json({ error: docsError.message });
  res.json((docs || []).map(r => ({ ...r, children: [] })));
});

// POST /api/documents
router.post('/', async (req, res) => {
  const { parent_id = null, title = 'Untitled', emoji = null } = req.body;

  let posQuery = supabaseAdmin
    .from('documents')
    .select('position')
    .eq('org_id', req.auth.orgId)
    .eq('is_deleted', false)
    .order('position', { ascending: false })
    .limit(1);
  posQuery = parent_id ? posQuery.eq('parent_id', parent_id) : posQuery.is('parent_id', null);
  const { data: posRows } = await posQuery;
  const position = (posRows?.[0]?.position ?? 0) + 1;

  const id = uuidv4();
  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .insert({ id, org_id: req.auth.orgId, parent_id: parent_id || null, title, emoji, position })
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ...doc, children: [] });
});

// PATCH /api/documents/:id
router.patch('/:id', async (req, res) => {
  const allowed = ['title', 'emoji', 'cover_url', 'position', 'parent_id', 'is_favorite'];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key] ?? null;
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });

  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .update(updates)
    .eq('id', req.params.id)
    .eq('org_id', req.auth.orgId)
    .select('*')
    .single();
  if (error || !doc) return res.status(404).json({ error: error?.message || 'Not found' });
  res.json({ ...doc, children: [] });
});

// DELETE /api/documents/:id (soft delete)
router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('documents')
    .update({ is_deleted: true })
    .eq('id', req.params.id)
    .eq('org_id', req.auth.orgId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /api/documents/:id/backlinks
router.post('/:id/backlinks', async (req, res) => {
  const { target_ids = [] } = req.body;
  const sourceId = req.params.id;

  const { error: delError } = await supabaseAdmin
    .from('backlinks')
    .delete()
    .eq('source_doc_id', sourceId)
    .eq('org_id', req.auth.orgId);
  if (delError) return res.status(500).json({ error: delError.message });

  const rows = target_ids
    .filter(tid => tid !== sourceId)
    .map(tid => ({ source_doc_id: sourceId, target_doc_id: tid, org_id: req.auth.orgId }));

  if (rows.length > 0) {
    const { error: insError } = await supabaseAdmin.from('backlinks').insert(rows);
    if (insError) return res.status(500).json({ error: insError.message });
  }

  res.json({ success: true });
});

module.exports = router;
