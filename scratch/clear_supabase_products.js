import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nqqunwugowitlcyfqmau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcXVud3Vnb3dpdGxjeWZxbWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDAyNjQ4NywiZXhwIjoyMDk1NjAyNDg3fQ._KVaHroZUC5ljBPpLuGujKvGZMaWN-sBv14Oyb2qnBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Clearing products table in Supabase...');
  const { error: pErr } = await supabase
    .from('products')
    .delete()
    .neq('id', '');
    
  if (pErr) {
    console.error('Failed to clear products:', pErr);
  } else {
    console.log('Successfully cleared products table!');
  }

  console.log('Clearing settings table in Supabase...');
  const { error: sErr } = await supabase
    .from('settings')
    .delete()
    .eq('key', 'config');
    
  if (sErr) {
    console.error('Failed to clear settings:', sErr);
  } else {
    console.log('Successfully cleared settings table!');
  }
}

run();
