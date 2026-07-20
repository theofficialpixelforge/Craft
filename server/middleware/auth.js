'use strict';

const { supabaseAdmin } = require('../supabase');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const token = header.slice(7);
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const [{ data: memberships }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from('memberships')
        .select('org_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1),
      supabaseAdmin
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single(),
    ]);

    const membership = memberships?.[0] ?? null;
    req.auth = {
      userId: user.id,
      orgId: membership?.org_id ?? null,
      role: membership?.role ?? null,
      userName: profile?.name ?? user.email ?? null,
    };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

function requireOrg(req, res, next) {
  if (!req.auth?.orgId) {
    return res.status(403).json({ error: 'No organization found. Create one first.' });
  }
  next();
}

module.exports = { requireAuth, requireOrg };
