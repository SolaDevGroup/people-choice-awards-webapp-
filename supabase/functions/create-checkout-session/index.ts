// Creates a Stripe Checkout Session for either the Supporter Pass OR an FC coin pack,
// and returns its URL. The browser redirects there; Stripe's hosted page shows Apple Pay,
// Google Pay and card automatically.
//
// body: { product: 'pass'|'starter'|'fan'|'ultra'|'legend'|'champion', player_id?, origin? }
//
// Secrets required (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY
//   STRIPE_SUPPORTER_PASS_ID, STRIPE_STARTER_PACK_ID, STRIPE_FAN_PACK_ID,
//   STRIPE_ULTRA_PACK_ID, STRIPE_LEGEND_PACK_ID, STRIPE_CHAMPION_PACK_ID
// Auto-provided: SUPABASE_URL, SUPABASE_ANON_KEY
//
// Deploy with "Verify JWT" ON (the caller is an authenticated user).
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno&no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: "2024-12-18.acacia",
});

// product key → { env var holding the Stripe product/price id, FC granted, kind }
const CATALOG: Record<string, { env: string; fc: number; kind: "pass" | "pack" }> = {
  pass:     { env: "STRIPE_SUPPORTER_PASS_ID", fc: 0,     kind: "pass" },
  starter:  { env: "STRIPE_STARTER_PACK_ID",   fc: 500,   kind: "pack" },
  fan:      { env: "STRIPE_FAN_PACK_ID",       fc: 1200,  kind: "pack" },
  ultra:    { env: "STRIPE_ULTRA_PACK_ID",     fc: 2500,  kind: "pack" },
  legend:   { env: "STRIPE_LEGEND_PACK_ID",    fc: 6500,  kind: "pack" },
  champion: { env: "STRIPE_CHAMPION_PACK_ID",  fc: 15000, kind: "pack" },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { product = "pass", player_id, origin: bodyOrigin } = await req.json().catch(() => ({}));
    const origin = bodyOrigin || req.headers.get("origin") || "";
    const cfg = CATALOG[product as string];
    if (!cfg) return json({ error: `Unknown product: ${product}` }, 400);

    // Identify the buyer from their Supabase JWT.
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    // Resolve a usable price id (env may hold a prod_… or a price_…).
    let priceId = Deno.env.get(cfg.env) ?? "";
    if (!priceId) return json({ error: `No Stripe id configured for "${product}" (${cfg.env})` }, 400);
    if (priceId.startsWith("prod_")) {
      const prod = await stripe.products.retrieve(priceId);
      priceId = typeof prod.default_price === "string"
        ? prod.default_price
        : (prod.default_price as Stripe.Price | null)?.id ?? "";
      if (!priceId) {
        const prices = await stripe.prices.list({ product: prod.id, active: true, limit: 1 });
        priceId = prices.data[0]?.id ?? "";
      }
    }
    if (!priceId) return json({ error: `No price on product for "${product}"` }, 400);

    const price = await stripe.prices.retrieve(priceId);
    const mode = price.recurring ? "subscription" : "payment";
    const ok = cfg.kind === "pass" ? "pass=success" : "fc=success";
    const no = cfg.kind === "pass" ? "pass=cancelled" : "fc=cancelled";

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        kind: cfg.kind,
        fc_amount: String(cfg.fc),
        pack: String(product),
        player_id: player_id ?? "",
      },
      ...(mode === "subscription" ? { subscription_data: { metadata: { user_id: user.id } } } : {}),
      success_url: `${origin}/?${ok}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?${no}`,
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
