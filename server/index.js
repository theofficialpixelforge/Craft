const express = require('express');
const cors = require('cors');
const { initDB, getDB } = require('./db/database');
const { seedIfEmpty } = require('./db/seed');
const documentsRouter = require('./routes/documents');
const blocksRouter = require('./routes/blocks');
const searchRouter = require('./routes/search');
const exportRouter = require('./routes/export');
const assistantRouter = require('./routes/assistant');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/documents', documentsRouter);
// Block routes — must come before /api/documents/:id so /reorder is matched correctly
app.use('/api/documents/:id/blocks', (req, res, next) => {
  req.params = { ...req.params, id: req.params.id };
  next();
}, blocksRouter);
app.use('/api/blocks', blocksRouter);
app.use('/api/search', searchRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/documents/:id/export', (req, res, next) => {
  req.params = { ...req.params, id: req.params.id };
  next();
}, exportRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Wait for async DB init before starting
initDB().then(() => {
  seedIfEmpty(getDB());
  app.listen(PORT, () => {
    console.log(`Craft server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
