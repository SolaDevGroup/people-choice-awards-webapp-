// Returns the LIVE Supporter Pass details (name, price, currency, interval, description)
// straight from Stripe, so the modal never hard-codes the title or price.
//
// Secrets required: STRIPE_SECRET_KEY, STRIPE_SUPPORTER_PASS_ID
// Deploy with "Verify JWT" OFF (it's public, read-only product info).
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno&no-check";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: "2024-12-18.acacia",
});
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const fmt = (amount: number | null, currency: string) =>
  amount == null ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const id = Deno.env.get("STRIPE_SUPPORTER_PASS_ID") ?? "";
    let price: Stripe.Price;
    let product: Stripe.Product;
    if (id.startsWith("prod_")) {
      product = await stripe.products.retrieve(id, { expand: ["default_price"] });
      price = (product.default_price as Stripe.Price) ??
        (await stripe.prices.list({ product: id, active: true, limit: 1 })).data[0];
    } else {
      price = await stripe.prices.retrieve(id, { expand: ["product"] });
      product = price.product as Stripe.Product;
    }
    const interval = price.recurring?.interval ?? null; // null = one-time
    return json({
      name: product.name,
      description: product.description ?? "",
      price: fmt(price.unit_amount, price.currency),
      per: interval ? `/${interval}` : "/one-time",
      currency: price.currency.toUpperCase(),
      recurring: !!interval,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
