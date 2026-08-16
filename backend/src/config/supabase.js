/**
 * Phazon Backend — Supabase Database Client
 *
 * Responsibilities:
 *  - Load SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env
 *  - Initialize Supabase JavaScript client
 *  - Export client for backend database services
 *
 * ⚠️ NEVER import this file or expose SUPABASE_SERVICE_ROLE_KEY in frontend code.
 */

'use strict';

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase Config Warning] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment.');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

module.exports = supabase;
