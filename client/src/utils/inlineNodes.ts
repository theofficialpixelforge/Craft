import type { InlineNode } from '../types';

// ── Serialize DOM → InlineNode[] ───────────────────────────────────────────

export function parseInlineNodes(el: HTMLElement): InlineNode[] {
  return parseNodes(el.childNodes);
}

function parseNodes(nodes: NodeList | Node[]): InlineNode[] {
  const result: InlineNode[] = [];
  for (const node of Array.from(nodes)) {
    const parsed = parseNode(node);
    if (parsed) {
      if (Array.isArray(parsed)) result.push(...parsed);
      else result.push(parsed);
    }
  }
  return result;
}

function parseNode(node: Node): InlineNode | InlineNode[] | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) return null;
    return { t: 'text', v: text };
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') return { t: 'text', v: '\n' };

    const children = parseNodes(el.childNodes);

    if (tag === 'b' || tag === 'strong') return { t: 'bold', c: children };
    if (tag === 'i' || tag === 'em') return { t: 'italic', c: children };
    if (tag === 'u') return { t: 'underline', c: children };
    if (tag === 's' || tag === 'del' || tag === 'strike') return { t: 'strike', c: children };
    if (tag === 'code') return { t: 'code', c: children };
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      return { t: 'link', href, c: children };
    }
    if (tag === 'span') {
      const style = el.getAttribute('style') || '';
      const cls = el.className || '';
      if (style.includes('font-weight') || cls.includes('bold')) return { t: 'bold', c: children };
      if (style.includes('font-style') || cls.includes('italic')) return { t: 'italic', c: children };
      return children;
    }
    // Div/p — treat as line break separator
    if (tag === 'div' || tag === 'p') {
      const inner = parseNodes(el.childNodes);
      return inner;
    }
    return children;
  }
  return null;
}

// ── Render InlineNode[] → DOM ──────────────────────────────────────────────

export function renderInlineNodes(nodes: InlineNode[], container: HTMLElement): void {
  container.innerHTML = '';
  for (const node of nodes) {
    container.appendChild(createDomNode(node));
  }
  // Ensure contenteditable has something to click into
  if (!container.childNodes.length) {
    container.appendChild(document.createTextNode(''));
  }
}

function createDomNode(node: InlineNode): Node {
  if (node.t === 'text') {
    return document.createTextNode(node.v);
  }

  let el: HTMLElement;
  switch (node.t) {
    case 'bold':      el = document.createElement('strong'); break;
    case 'italic':    el = document.createElement('em'); break;
    case 'underline': el = document.createElement('u'); break;
    case 'strike':    el = document.createElement('s'); break;
    case 'code':      el = document.createElement('code'); break;
    case 'link': {
      el = document.createElement('a');
      (el as HTMLAnchorElement).href = node.href;
      (el as HTMLAnchorElement).target = '_blank';
      (el as HTMLAnchorElement).rel = 'noopener noreferrer';
      break;
    }
  }

  if ('c' in node) {
    for (const child of node.c) el.appendChild(createDomNode(child));
  }
  return el;
}

// ── Plain text extraction ──────────────────────────────────────────────────

export function nodesToPlainText(nodes: InlineNode[]): string {
  return nodes.map(n => {
    if (n.t === 'text') return n.v;
    if ('c' in n) return nodesToPlainText(n.c);
    return '';
  }).join('');
}

// ── Caret helpers ──────────────────────────────────────────────────────────

export function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(el);
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return range.toString().length;
}

export function setCaretToEnd(el: HTMLElement): void {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function setCaretToStart(el: HTMLElement): void {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(true);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function setCaretAtOffset(el: HTMLElement, offset: number): void {
  const range = document.createRange();
  const sel = window.getSelection();
  let remaining = offset;
  let found = false;

  function walk(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length;
      if (remaining <= len) {
        range.setStart(node, remaining);
        range.collapse(true);
        found = true;
        return true;
      }
      remaining -= len;
    } else {
      for (const child of Array.from(node.childNodes)) {
        if (walk(child)) return true;
      }
    }
    return false;
  }

  walk(el);
  if (!found) {
    range.selectNodeContents(el);
    range.collapse(false);
  }
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function isCaretAtStart(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  const testRange = document.createRange();
  testRange.selectNodeContents(el);
  testRange.collapse(true);
  return range.compareBoundaryPoints(Range.START_TO_START, testRange) === 0;
}

export function isCaretAtEnd(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  const testRange = document.createRange();
  testRange.selectNodeContents(el);
  testRange.collapse(false);
  return range.compareBoundaryPoints(Range.END_TO_END, testRange) === 0;
}

export function isCaretOnFirstLine(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return true;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  // Within ~1 line height from the top
  return rect.top <= elRect.top + 24;
}

export function isCaretOnLastLine(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return true;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return rect.bottom >= elRect.bottom - 24;
}

// Split content at caret, returning [before, after] as InlineNode arrays
export function splitAtCaret(el: HTMLElement): [InlineNode[], InlineNode[]] {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return [parseInlineNodes(el), []];
  }
  const offset = getCaretOffset(el);
  const fullText = el.textContent || '';

  // Simple text-based split for now
  const beforeText = fullText.slice(0, offset);
  const afterText = fullText.slice(offset);

  const beforeNodes = parseNodes(getNodesUpToOffset(el, offset));
  const afterNodes = parseNodes(getNodesFromOffset(el, offset));

  return [beforeNodes.length ? beforeNodes : [], afterNodes.length ? afterNodes : []];
}

function getNodesUpToOffset(el: HTMLElement, offset: number): Node[] {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const cur = sel.getRangeAt(0);
    range.setEnd(cur.startContainer, cur.startOffset);
  }
  const frag = range.cloneContents();
  return Array.from(frag.childNodes);
}

function getNodesFromOffset(el: HTMLElement, offset: number): Node[] {
  const range = document.createRange();
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const cur = sel.getRangeAt(0);
    range.setStart(cur.startContainer, cur.startOffset);
  }
  range.setEnd(el, el.childNodes.length);
  const frag = range.cloneContents();
  return Array.from(frag.childNodes);
}
