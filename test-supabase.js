import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const dbData = {
    first_name: 'Test',
    last_name: 'Test',
    email: '',
    phone: '',
    birth_date: null,
    city: '',
    province: '',
    status: 'active',
    payment_status: 'none',
    tags: [],
    goals: '',
    notes: '',
    medical_cert_expiry: null,
    medical_cert_notes: '',
    contact_channel: 'other',
    acquisition_source: 'other',
    assigned_coach_id: 'local-owner',
    assigned_coach_name: 'Coach Demo'
  };

  const { data, error } = await supabase.from('athletes').insert([dbData]).select().single();
  console.log('Result:', data);
  console.log('Error:', error);
}

testInsert();
