const express = require('express');
const { getDB } = require('../db/database');

const router = express.Router({ mergeParams: true });

function nodesToMarkdown(nodes) {
  if (!Array.isArray(nodes)) return '';
  return nodes.map(n => {
    if (n.t === 'text') return n.v || '';
    if (n.t === 'bold') return `**${nodesToMarkdown(n.c)}**`;
    if (n.t === 'italic') return `_${nodesToMarkdown(n.c)}_`;
    if (n.t === 'underline') return `<u>${nodesToMarkdown(n.c)}</u>`;
    if (n.t === 'strike') return `~~${nodesToMarkdown(n.c)}~~`;
    if (n.t === 'code') return `\`${nodesToMarkdown(n.c)}\``;
    if (n.t === 'link') return `[${nodesToMarkdown(n.c)}](${n.href})`;
    return '';
  }).join('');
}

function blockToMarkdown(block, db) {
  let content;
  try { content = JSON.parse(block.content); } catch { content = []; }
  const text = nodesToMarkdown(content);
  const indent = '  '.repeat(block.indent || 0);

  switch (block.type) {
    case 'h1': return `# ${text}`;
    case 'h2': return `## ${text}`;
    case 'h3': return `### ${text}`;
    case 'bullet': return `${indent}- ${text}`;
    case 'numbered': return `${indent}1. ${text}`;
    case 'todo': return `${indent}- [${block.checked ? 'x' : ' '}] ${text}`;
    case 'code': return `\`\`\`${block.language || ''}\n${text}\n\`\`\``;
    case 'quote': return `> ${text}`;
    case 'divider': return `---`;
    case 'callout': return `> ${block.callout_icon || 'ℹ️'} ${text}`;
    case 'image': return `![${block.image_caption || ''}](${block.image_url || ''})`;
    case 'table': {
      const td = (() => { try { return block.table_data ? JSON.parse(block.table_data) : null; } catch { return null; } })();
      if (!td || !td.rows || !td.rows.length) return '';
      const rows = td.rows;
      const colCount = rows[0].length;
      const lines = [];
      rows.forEach((row, ri) => {
        lines.push('| ' + row.map(c => String(c).replace(/\|/g, '\\|') || ' ').join(' | ') + ' |');
        if (ri === 0) lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |');
      });
      return lines.join('\n');
    }
    case 'columns2':
    case 'columns3': {
      const cols = (() => { try { return block.columns_data ? JSON.parse(block.columns_data) : null; } catch { return null; } })();
      if (!Array.isArray(cols)) return '';
      return cols.map(c => nodesToMarkdown(Array.isArray(c) ? c : [])).filter(Boolean).join(' | ');
    }
    case 'page': {
      if (block.linked_doc_id) {
        const linked = db.prepare(`SELECT title, emoji FROM documents WHERE id = ? AND is_deleted = 0`).get(block.linked_doc_id);
        if (linked) return `📄 [${linked.emoji ? linked.emoji + ' ' : ''}${linked.title}]`;
      }
      return '';
    }
    default: return text;
  }
}

// GET /api/documents/:id/export
router.get('/', (req, res) => {
  const db = getDB();
  const doc = db.prepare(`SELECT * FROM documents WHERE id = ? AND is_deleted = 0`).get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const blocks = db.prepare(`SELECT * FROM blocks WHERE document_id = ? ORDER BY position`).all(req.params.id);

  const lines = [`# ${doc.title}`, ''];
  for (const block of blocks) {
    const md = blockToMarkdown(block, db);
    if (md !== undefined) lines.push(md);
  }

  const filename = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(lines.join('\n'));
});

module.exports = router;
