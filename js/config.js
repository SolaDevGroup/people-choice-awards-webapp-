  const SUPABASE_URL  = 'https://laypjrtpnvpubzqwnvnt.supabase.co';  // ← YOUR URL
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxheXBqcnRwbnZwdWJ6cXdudm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNzc3MTEsImV4cCI6MjA5Njk1MzcxMX0.OaNkuXnYSkhjKoPa7E8Bt2DWDv74zIo9OdcXLDvq8bs';  // ← YOUR ANON KEY
  const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  });
