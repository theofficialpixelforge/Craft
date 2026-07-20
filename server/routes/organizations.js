'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../supabase');

const router = express.Router();

// POST /api/organizations — create org + initial manager membership
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Organization name is required' });

  const orgId = uuidv4();
  const userId = req.auth.userId;

  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({ id: orgId, name: name.trim(), owner_user_id: userId })
    .select('id, name')
    .single();

  if (orgError) {
    console.error('Create org error:', orgError);
    return res.status(500).json({ error: orgError.message });
  }

  const { error: memberError } = await supabaseAdmin
    .from('memberships')
    .insert({ org_id: orgId, user_id: userId, role: 'manager', status: 'active' });

  if (memberError) {
    console.error('Create membership error:', memberError);
    await supabaseAdmin.from('organizations').delete().eq('id', orgId);
    return res.status(500).json({ error: memberError.message });
  }

  res.status(201).json({
    orgId: org.id,
    orgName: org.name,
    userId,
    role: 'manager',
    userName: req.auth.userName,
  });
});

// GET /api/organizations/current
router.get('/current', async (req, res) => {
  if (!req.auth.orgId) return res.status(404).json({ error: 'No organization' });
  const { data: org, error } = await supabaseAdmin
    .from('organizations')
    .select('id, name')
    .eq('id', req.auth.orgId)
    .single();
  if (error || !org) return res.status(404).json({ error: 'Organization not found' });
  res.json(org);
});

module.exports = router;
