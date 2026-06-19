// Stripe → us. Fires when a Checkout payment completes; grants the Supporter Pass.
// This is the SOURCE OF TRUTH for "paid → access granted" (never trust the browser redirect).
//
// Secrets required (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Auto-provided by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// ⚠️ Deploy this function with "Verify JWT" OFF — Stripe does not send a Supabase JWT.
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno&no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    // constructEventAsync — Deno's crypto is async.
    event = await stripe.webhooks.constructEventAsync(body, sig!, whSecret);
  } catch (e) {
    return new Response(`Webhook signature verification failed: ${(e as Error).message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const userId = s.metadata?.user_id || s.client_reference_id;
    const kind = s.metadata?.kind || "pass";
    const fcAmount = parseInt(s.metadata?.fc_amount || "0", 10);
    const pack = s.metadata?.pack || "";
    const playerId = s.metadata?.player_id || "";
    if (userId) {
      if (kind === "pack" && fcAmount > 0) {
        // FC coin-pack purchase → credit the balance (idempotent on session id).
        const { error } = await admin.rpc("credit_fc_purchase", {
          p_session: s.id, p_user: userId, p_fc: fcAmount, p_pack: pack,
        });
        if (error) return new Response(`DB error: ${error.message}`, { status: 500 });
      } else {
        // Supporter Pass: grant the pass + cast the initial vote.
        const { error } = await admin.from("supporter_pass").upsert({
          user_id: userId,
          active: true,
          stripe_session_id: s.id,
          stripe_customer_id: typeof s.customer === "string" ? s.customer : null,
          granted_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (error) return new Response(`DB error: ${error.message}`, { status: 500 });
        if (playerId) {
          const { error: vErr } = await admin.rpc("grant_initial_vote", {
            p_user: userId, p_player: playerId,
          });
          if (vErr) console.error("grant_initial_vote failed:", vErr.message);
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
