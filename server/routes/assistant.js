const express = require('express');

const router = express.Router();

function buildReply(lastMessage, context) {
  const msg = (lastMessage || '').toLowerCase();
  const title = context?.docTitle || 'your document';
  const count = context?.blockCount ?? 0;

  if ((msg.includes('summarize') || msg.includes('summary')) && context?.docTitle) {
    return `Here's a summary of **${title}**:\n\nThis document contains ${count} block${count !== 1 ? 's' : ''} of content. It covers the key topics introduced in its opening sections, building toward a coherent narrative. The main ideas are well-structured and easy to follow.\n\nWould you like me to expand on any particular section?`;
  }

  if (msg.includes('overview')) {
    return `Here's an overview of your workspace:\n\nYou have a growing collection of documents organized hierarchically. Your content spans multiple topics and is linked through backlinks and page references. The most recently active documents appear to be the focus of your current work.\n\nWant me to highlight any particular area?`;
  }

  if (msg.includes('find') || msg.includes('related')) {
    return `Searching for documents related to **${title}**...\n\nI found several documents that share themes, keywords, or linked references with this one. Related documents often explore complementary ideas — you may want to check your backlinks section for direct connections.\n\nShall I look for something more specific?`;
  }

  if (msg.includes('research')) {
    return `I can help you research that topic. Here's what I'd suggest:\n\n1. Start by searching your existing documents for relevant notes\n2. Look for backlinks that connect related ideas\n3. Use the search bar to find specific keywords across all your docs\n\nWhat aspect would you like to dig into first?`;
  }

  if (msg.includes('search')) {
    return `I can help you find what you're looking for. Try using the search bar (Cmd+K) for a quick full-text search across all your documents.\n\nIf you're looking for something more specific, describe it to me and I'll help you narrow it down.`;
  }

  return `I'm your document assistant. I can help you:\n\n• **Summarize** the current document\n• **Research** topics across your notes\n• **Find** related documents\n• Get an **overview** of your workspace\n\nWhat would you like to explore?`;
}

// POST /api/assistant/chat
router.post('/chat', (req, res) => {
  const { messages = [], context } = req.body;
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const reply = buildReply(lastUserMessage, context);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Stream word by word
  const words = reply.split(' ');
  let i = 0;

  const interval = setInterval(() => {
    if (i < words.length) {
      const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      i++;
    } else {
      res.write(`data: [DONE]\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 45);

  req.on('close', () => clearInterval(interval));
});

module.exports = router;
