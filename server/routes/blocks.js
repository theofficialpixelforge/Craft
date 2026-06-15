const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');

const router = express.Router({ mergeParams: true });

// GET /api/documents/:id/blocks
router.get('/', (req, res) => {
  const { prepare } = getDB();
  const blocks = prepare(`SELECT * FROM blocks WHERE document_id = ? ORDER BY position`).all(req.params.id);
  res.json(blocks.map(normalizeBlock));
});

// POST /api/documents/:id/blocks
router.post('/', (req, res) => {
  const { prepare } = getDB();
  const docId = req.params.id;
  const {
    type = 'text',
    content = '[]',
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
    const max = prepare(`SELECT MAX(position) as mp FROM blocks WHERE document_id = ?`).get(docId);
    pos = ((max?.mp) ?? 0) + 1;
  }

  const id = uuidv4();
  const contentStr     = typeof content      === 'string' ? content      : JSON.stringify(content);
  const tableDataStr   = typeof table_data   === 'string' ? table_data   : table_data   ? JSON.stringify(table_data)   : null;
  const columnsDataStr = typeof columns_data === 'string' ? columns_data : columns_data ? JSON.stringify(columns_data) : null;

  prepare(`
    INSERT INTO blocks (id, document_id, type, content, indent, position, checked, language, callout_icon, image_url, image_caption, linked_doc_id, table_data, columns_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, docId, type, contentStr, indent, pos, checked, language, callout_icon, image_url, image_caption, linked_doc_id, tableDataStr, columnsDataStr);

  const block = prepare(`SELECT * FROM blocks WHERE id = ?`).get(id);
  res.status(201).json(normalizeBlock(block));
});

// PATCH /api/blocks/:blockId
router.patch('/:blockId', (req, res) => {
  const { prepare } = getDB();
  const allowed = ['type', 'content', 'indent', 'position', 'checked', 'language', 'callout_icon', 'image_url', 'image_caption', 'linked_doc_id', 'table_data', 'columns_data'];
  const jsonFields = new Set(['content', 'table_data', 'columns_data']);
  const updates = [];
  const values = [];

  for (const key of allowed) {
    if (key in req.body) {
      updates.push(`${key} = ?`);
      const raw = req.body[key];
      const val = jsonFields.has(key) && raw !== null && typeof raw !== 'string'
        ? JSON.stringify(raw)
        : raw;
      values.push(val);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.push(`updated_at = datetime('now')`);
  values.push(req.params.blockId);

  prepare(`UPDATE blocks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const block = prepare(`SELECT * FROM blocks WHERE id = ?`).get(req.params.blockId);
  if (!block) return res.status(404).json({ error: 'Not found' });
  res.json(normalizeBlock(block));
});

// DELETE /api/blocks/:blockId
router.delete('/:blockId', (req, res) => {
  const { prepare } = getDB();
  prepare(`DELETE FROM blocks WHERE id = ?`).run(req.params.blockId);
  res.json({ success: true });
});

// POST /api/documents/:id/blocks/reorder
router.post('/reorder', (req, res) => {
  const { prepare, transaction } = getDB();
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });

  const update = prepare(`UPDATE blocks SET position = ?, updated_at = datetime('now') WHERE id = ?`);
  transaction(() => {
    ids.forEach((id, i) => update.run(i + 1, id));
  })();

  res.json({ success: true });
});

function normalizeBlock(b) {
  if (!b) return null;
  return {
    ...b,
    content: (() => { try { return JSON.parse(b.content); } catch { return []; } })(),
    checked: b.checked === null || b.checked === undefined ? null : !!b.checked,
    indent: Number(b.indent) || 0,
    position: Number(b.position) || 0,
    linked_doc_id: b.linked_doc_id || null,
    table_data:   (() => { try { return b.table_data   ? JSON.parse(b.table_data)   : null; } catch { return null; } })(),
    columns_data: (() => { try { return b.columns_data ? JSON.parse(b.columns_data) : null; } catch { return null; } })(),
    is_favorite: undefined,
  };
}

module.exports = router;
