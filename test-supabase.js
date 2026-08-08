import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const env = readFileSync(resolve('.env'), 'utf8');
const envUrl = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const envKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(envUrl, envKey);

async function checkTables() {
  const { data, error } = await supabase.from('athlete_metrics').select('*').limit(1);
  if (error) {
    console.error("Error checking athlete_metrics:", error);
  } else {
    console.log("athlete_metrics exists, data:", data);
  }
}
checkTables();
