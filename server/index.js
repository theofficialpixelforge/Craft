'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), override: true });


const express = require('express');
const cors = require('cors');
const { requireAuth, requireOrg } = require('./middleware/auth');
const documentsRouter = require('./routes/documents');
const blocksRouter = require('./routes/blocks');
const searchRouter = require('./routes/search');
const exportRouter = require('./routes/export');
const assistantRouter = require('./routes/assistant');
const organizationsRouter = require('./routes/organizations');
const { supabaseAdmin } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://theofficialcraft.netlify.app',
    ];
    // Allow Netlify deploy-preview URLs: https://*--theofficialcraft.netlify.app
    const isNetlifyPreview = origin && /^https:\/\/[a-z0-9-]+--theofficialcraft\.netlify\.app$/.test(origin);
    if (!origin || allowed.includes(origin) || isNetlifyPreview) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(express.json({ limit: '10mb' }));

// Public — no auth required
app.use('/api/assistant', assistantRouter);

// All routes below require a valid Supabase JWT
app.use(requireAuth);

app.get('/api/me', (req, res) => res.json(req.auth));
app.use('/api/organizations', organizationsRouter);

// Routes below also require an existing org membership
app.use('/api/search', requireOrg, searchRouter);
app.use('/api/documents', requireOrg, documentsRouter);
app.use(
  '/api/documents/:id/blocks',
  requireOrg,
  (req, res, next) => { req.params = { ...req.params, id: req.params.id }; next(); },
  blocksRouter,
);
app.use('/api/blocks', requireOrg, blocksRouter);
app.use(
  '/api/documents/:id/export',
  requireOrg,
  (req, res, next) => { req.params = { ...req.params, id: req.params.id }; next(); },
  exportRouter,
);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

supabaseAdmin
  .from('organizations')
  .select('id')
  .limit(1)
  .then(({ error }) => {
    if (error) { console.error('Supabase connection failed:', error.message); process.exit(1); }
    console.log('Supabase connected');
    app.listen(PORT, () => console.log(`Craft server running on http://localhost:${PORT}`));
  })
  .catch(err => { console.error('Startup error:', err); process.exit(1); });
