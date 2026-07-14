// server/scripts/run_migrations.js
// Applies 001_initial_schema.sql and 002_rls_policies.sql to the live
// Supabase Postgres database, then verifies all 16 tables exist with RLS enabled.
//
// Usage:
//   1. Fill in SUPABASE_DB_URL in craft-clone/.env (see .env.example)
//   2. node server/scripts/run_migrations.js

'use strict';

const path = require('path');
const fs   = require('fs');

// Load .env from the project root (craft-clone/)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const MIGRATION_FILES = [
  '001_initial_schema.sql',
  '002_rls_policies.sql',
];

const EXPECTED_TABLES = [
  'backlinks', 'calendar_events', 'daily_updates', 'databases',
  'db_properties', 'db_property_values', 'db_views', 'documents',
  'employees', 'invites', 'leave_records', 'memberships',
  'monthly_reports', 'organizations', 'profiles',
];

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error('❌  SUPABASE_DB_URL is not set.');
    console.error('    Add it to craft-clone/.env (see .env.example).');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅  Connected to Supabase Postgres\n');

    // Run each migration file
    for (const file of MIGRATION_FILES) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`▶   Running ${file} ...`);
      await client.query(sql);
      console.log(`✅  ${file} complete\n`);
    }

    // Verify: all expected tables exist
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    const actualTables = tablesResult.rows.map(r => r.table_name);
    console.log('📋  Tables in public schema:', actualTables.join(', '));

    const missing = EXPECTED_TABLES.filter(t => !actualTables.includes(t));
    if (missing.length > 0) {
      console.error('\n❌  Missing tables:', missing.join(', '));
      process.exit(1);
    }
    console.log(`✅  All ${EXPECTED_TABLES.length} expected tables present\n`);

    // Verify: RLS enabled on all tables
    const rlsResult = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    console.log('🔒  RLS status:');
    let allEnabled = true;
    for (const row of rlsResult.rows) {
      const icon = row.rowsecurity ? '✅' : '❌';
      if (!row.rowsecurity) allEnabled = false;
      console.log(`    ${icon}  ${row.tablename}: RLS ${row.rowsecurity ? 'enabled' : 'DISABLED'}`);
    }

    if (!allEnabled) {
      console.error('\n❌  Some tables are missing RLS. Check 002_rls_policies.sql.');
      process.exit(1);
    }

    console.log('\n✅  RLS enabled on all tables.');
    console.log('\n🎉  Schema migration complete. The live Supabase database is ready.');
    console.log('    Next: configure Supabase Auth in the dashboard, then Session 2b.');

  } catch (err) {
    console.error('\n❌  Migration error:', err.message);
    if (err.detail) console.error('    Detail:', err.detail);
    if (err.hint)   console.error('    Hint:  ', err.hint);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(() => process.exit(1));
