// server/supabase.js
// Server-side Supabase admin client using the service role key.
// Service role bypasses RLS — use only for admin ops (migrations,
// invite redemption, the /migrate/localStorage endpoint).
// For user-scoped queries, create a client with the user's JWT instead.
//
// NOT imported by any route yet. Session 2b wires it into the routes.

const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set. Add it to your .env file (see .env.example).');
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Add it to your .env file (see .env.example).');
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = { supabaseAdmin };
