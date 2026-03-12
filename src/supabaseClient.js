import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://tbtphtphrkiiruppgvyv.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidHBodHBocmtpaXJ1cHBndnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODE2NjgsImV4cCI6MjA4NzE1NzY2OH0.pXjgIm6HChVU7wt9LxGcRiizcwjARVAvdRaHC0qch9E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
