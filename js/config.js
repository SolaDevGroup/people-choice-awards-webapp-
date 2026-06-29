  const SUPABASE_URL  = 'https://laypjrtpnvpubzqwnvnt.supabase.co';  // ← YOUR URL
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxheXBqcnRwbnZwdWJ6cXdudm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNzc3MTEsImV4cCI6MjA5Njk1MzcxMX0.OaNkuXnYSkhjKoPa7E8Bt2DWDv74zIo9OdcXLDvq8bs';  // ← YOUR ANON KEY
  const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  });
  const MAP_KEY = "AIzaSyB3Tj9fWzywtOncQ7vNjcErxRM5E--WlDA";
  const YOUTUBE_KEY = "AIzaSyAnmXYBHwIgGWh1Sz_o0f6EtBVuBG1cBLw";

  /* ═══════════ STRIPE (Supporter Pass / voting access) ═══════════
     Put your PUBLISHABLE key + the Stripe PRICE id of the pass here — these are
     safe to ship in the browser. The Checkout title/price/description are pulled
     LIVE from Stripe (the Edge Function reads them from this price), so you don't
     hard-code them anywhere.

     ⚠️ DO NOT put the SECRET key or the WEBHOOK SIGNING secret here — they must
     never reach the browser. Those two go in Supabase → Edge Functions → Secrets:
        STRIPE_SECRET_KEY        = sk_test_… / sk_live_…
        STRIPE_WEBHOOK_SECRET    = whsec_…
     (I'll set those when we deploy the functions.) */
  const STRIPE_PUBLISHABLE_KEY   = "pk_live_51PNjntRrXj8bYHvWFTclT0OyxHcVD3Umsj5k0Cadrb4KsvwRBFBkUlwl9VH1bxcNBu11EynogKUDSLNdBe9gUJze00OxEK6LY3"; // browser-safe
  const STRIPE_SUPPORTER_PASS_ID = "prod_Ui8qolJhD4Az8I"; // Stripe product id (server resolves its price) — not secret
  // ⚠️ STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are intentionally NOT here — they would be
  
  // exposed to every visitor. They live in Supabase → Edge Functions → Secrets (set on deploy).
