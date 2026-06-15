const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');

const router = express.Router();

function buildTree(rows, parentId = null) {
  return rows
    .filter(r => (r.parent_id || null) === parentId)
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map(r => ({ ...r, is_favorite: !!r.is_favorite, is_deleted: !!r.is_deleted, children: buildTree(rows, r.id) }));
}

// GET /api/documents
router.get('/', (req, res) => {
  const { prepare } = getDB();
  const rows = prepare(`SELECT * FROM documents WHERE is_deleted = 0 ORDER BY position`).all();
  res.json(buildTree(rows));
});

// GET /api/documents/favorites
router.get('/favorites', (req, res) => {
  const { prepare } = getDB();
  const rows = prepare(`SELECT * FROM documents WHERE is_deleted = 0 AND is_favorite = 1 ORDER BY title`).all();
  res.json(rows.map(r => ({ ...r, is_favorite: true, children: [] })));
});

// GET /api/documents/:id
router.get('/:id', (req, res) => {
  const { prepare } = getDB();
  const doc = prepare(`SELECT * FROM documents WHERE id = ? AND is_deleted = 0`).get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ ...doc, is_favorite: !!doc.is_favorite, children: [] });
});

// GET /api/documents/:id/backlinks
router.get('/:id/backlinks', (req, res) => {
  const { prepare } = getDB();
  const rows = prepare(`
    SELECT d.* FROM documents d
    JOIN backlinks b ON b.source_doc_id = d.id
    WHERE b.target_doc_id = ? AND d.is_deleted = 0
  `).all(req.params.id);
  res.json(rows.map(r => ({ ...r, is_favorite: !!r.is_favorite, children: [] })));
});

// POST /api/documents
router.post('/', (req, res) => {
  const { prepare } = getDB();
  const { parent_id = null, title = 'Untitled', emoji = null } = req.body;

  const maxPos = prepare(
    `SELECT MAX(position) as mp FROM documents WHERE parent_id IS ? AND is_deleted = 0`
  ).get(parent_id);
  const position = ((maxPos?.mp) ?? 0) + 1;

  const id = uuidv4();
  prepare(`
    INSERT INTO documents (id, parent_id, title, emoji, position)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, parent_id, title, emoji, position);

  const doc = prepare(`SELECT * FROM documents WHERE id = ?`).get(id);
  res.status(201).json({ ...doc, is_favorite: !!doc.is_favorite, children: [] });
});

// PATCH /api/documents/:id
router.patch('/:id', (req, res) => {
  const { prepare } = getDB();
  const allowed = ['title', 'emoji', 'cover_url', 'position', 'parent_id', 'is_favorite'];
  const updates = [];
  const values = [];

  for (const key of allowed) {
    if (key in req.body) {
      updates.push(`${key} = ?`);
      values.push(req.body[key] ?? null);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.push(`updated_at = datetime('now')`);
  values.push(req.params.id);

  prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const doc = prepare(`SELECT * FROM documents WHERE id = ?`).get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ ...doc, is_favorite: !!doc.is_favorite, children: [] });
});

// DELETE /api/documents/:id (soft delete)
router.delete('/:id', (req, res) => {
  const { prepare } = getDB();
  prepare(`UPDATE documents SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

// POST /api/documents/:id/backlinks
router.post('/:id/backlinks', (req, res) => {
  const { prepare, transaction } = getDB();
  const { target_ids = [] } = req.body;
  const sourceId = req.params.id;

  const del = prepare(`DELETE FROM backlinks WHERE source_doc_id = ?`);
  const ins = prepare(`INSERT OR IGNORE INTO backlinks (source_doc_id, target_doc_id) VALUES (?, ?)`);

  transaction(() => {
    del.run(sourceId);
    for (const tid of target_ids) {
      if (tid !== sourceId) ins.run(sourceId, tid);
    }
  })();

  res.json({ success: true });
});

module.exports = router;
