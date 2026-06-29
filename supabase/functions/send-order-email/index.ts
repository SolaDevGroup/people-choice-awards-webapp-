// Emails a placed jersey order to the fulfilment inbox (danishgoheer17@gmail.com for now)
// with the People's Choice logo + full product / add-on / shipping details. NO prices.
//
// Secrets required (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY      = re_…              (from resend.com)
// Optional:
//   ORDER_TO_EMAIL      = where orders are sent   (default danishgoheer17@gmail.com)
//   ORDER_FROM_EMAIL    = verified-domain sender   (default orders@peoplechoiceaward.com)
//   ORDER_LOGO_URL      = hosted PNG of the logo   (falls back to a text wordmark)
//
// Deploy with "Verify JWT" ON (the caller is an authenticated user). Failure to send
// must NOT block the order — the frontend fires this and ignores the result.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (v: unknown) =>
  String(v ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));

const TO = Deno.env.get("ORDER_TO_EMAIL") || "danishgoheer17@gmail.com";
const FROM = Deno.env.get("ORDER_FROM_EMAIL") || "People Choice Award <no-reply@peoplechoiceaward.com>";
const LOGO = Deno.env.get("ORDER_LOGO_URL") || "";

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INK = "#121212", MUT = "#6b6b6b", LINE = "#ececec", ACCENT = "#4000FF";

function row(label: string, value: string, strong = true) {
  return `<tr>
    <td style="padding:9px 0;color:${MUT};font:400 13px ${FONT};width:44%;vertical-align:top;border-bottom:1px solid ${LINE};">${esc(label)}</td>
    <td style="padding:9px 0;color:${INK};font:${strong ? 600 : 400} 14px ${FONT};text-align:right;border-bottom:1px solid ${LINE};">${esc(value) || "—"}</td>
  </tr>`;
}
function section(title: string, rows: string) {
  return `<tr><td style="padding:22px 0 8px;font:700 12px ${FONT};letter-spacing:.06em;text-transform:uppercase;color:${ACCENT};">${esc(title)}</td></tr>
    <tr><td><table width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>`;
}

function addressBlock(s: any) {
  const name = [s.firstname, s.lastname].filter(Boolean).join(" ");
  const l2 = [s.street, s.street_number].filter(Boolean).join(" ");
  const l3 = [s.building_number ? "Bldg " + s.building_number : "", s.floor ? "Floor " + s.floor : ""].filter(Boolean).join(" · ");
  const l4 = [s.zip, s.city].filter(Boolean).join(" ");
  const l5 = [s.state, s.country].filter(Boolean).join(", ");
  const line = (t: string) => (t ? `<div style="font:400 14px ${FONT};color:${INK};line-height:1.6;">${esc(t)}</div>` : "");
  return `<tr><td style="padding:6px 0 0;">
    <div style="font:600 15px ${FONT};color:${INK};line-height:1.6;">${esc(name) || "—"}</div>
    ${line(l2)}${line(l3)}${line(l4)}${line(l5)}
  </td></tr>`;
}

function buildHtml(o: any) {
  const a = o.addons || {}, s = o.shipping || {}, c = o.contact || {};
  const header = LOGO
    ? `<img src="${esc(LOGO)}" alt="People Choice Award" height="40" style="height:40px;display:block;">`
    : `<div style="font:800 20px ${FONT};color:${INK};letter-spacing:-.4px;">PCA WC26 · <span style="color:${ACCENT};">People Choice Award</span></div>`;
  const heroImg = o.image
    ? `<td width="92" style="padding-right:16px;vertical-align:top;"><img src="${esc(o.image)}" alt="" width="84" style="width:84px;height:84px;object-fit:contain;background:#f4f4f6;border-radius:12px;display:block;"></td>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f4f4f6;padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${LINE};border-radius:18px;overflow:hidden;max-width:600px;">
      <tr><td style="height:4px;background:${ACCENT};font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:22px 32px;border-bottom:1px solid ${LINE};">${header}</td></tr>
      <tr><td style="padding:28px 32px 8px;">
        <div style="font:700 22px ${FONT};color:${INK};letter-spacing:-.3px;">New order received</div>
        <div style="font:400 13px ${FONT};color:${MUT};margin-top:6px;">Order reference <span style="color:${INK};font-weight:600;">${esc(o.order_id || "—")}</span></div>
      </td></tr>
      <tr><td style="padding:18px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafb;border:1px solid ${LINE};border-radius:14px;">
          <tr><td style="padding:16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            ${heroImg}
            <td style="vertical-align:top;">
              <div style="font:700 17px ${FONT};color:${INK};line-height:1.35;">${esc(o.product_name || "Jersey")}</div>
              <div style="font:400 13px ${FONT};color:${MUT};margin-top:6px;">Product ID&nbsp;·&nbsp;<span style="color:${INK};font-weight:600;">${esc(o.product_id || "—")}</span></div>
              <div style="font:400 13px ${FONT};color:${MUT};margin-top:3px;">Size&nbsp;·&nbsp;<span style="color:${INK};font-weight:600;">${esc(o.size || "—")}</span>&nbsp;&nbsp;|&nbsp;&nbsp;${esc(o.team || "")} ${esc(o.jersey_type || "")}</div>
            </td>
          </tr></table></td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:4px 32px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${section("Customization", row("Tournament badges", a.badges ? "Yes" : "No") + row("Custom name", a.name || "—") + row("Custom number", a.number || "—"))}
        ${section("Shipping options", row("Express delivery", o.express ? "Yes" : "No") + row("Insurance", o.insurance ? "Yes" : "No"))}
        ${section("Contact", row("Email", c.email) + row("Phone", c.phone))}
        ${section("Delivery address", addressBlock(s))}
      </table></td></tr>
      <tr><td style="padding:24px 32px 28px;">
        <div style="border-top:1px solid ${LINE};padding-top:16px;font:400 12px ${FONT};color:#9a9a9a;line-height:1.6;">
          This is an automated order notification from <strong style="color:${MUT};">PCA WC26 · People Choice Award</strong>. Please prepare this order for fulfilment.
        </div>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

// plain-text alternative — improves deliverability (multipart) and renders in text-only clients
function buildText(o: any) {
  const a = o.addons || {}, s = o.shipping || {}, c = o.contact || {};
  const L = (k: string, v: unknown) => `${k}: ${v || "—"}`;
  return [
    "PCA WC26 · People Choice Award — New order received",
    `Order reference: ${o.order_id || "—"}`, "",
    `Product: ${o.product_name || "Jersey"}`,
    L("Product ID", o.product_id), L("Team / Kit", `${o.team || ""} ${o.jersey_type || ""}`.trim()), L("Size", o.size), "",
    "CUSTOMIZATION", L("Tournament badges", a.badges ? "Yes" : "No"), L("Custom name", a.name), L("Custom number", a.number), "",
    "SHIPPING OPTIONS", L("Express delivery", o.express ? "Yes" : "No"), L("Insurance", o.insurance ? "Yes" : "No"), "",
    "CONTACT", L("Email", c.email), L("Phone", c.phone), "",
    "DELIVERY ADDRESS",
    `${s.firstname || ""} ${s.lastname || ""}`.trim(),
    [s.street, s.street_number].filter(Boolean).join(" "),
    [s.building_number ? "Bldg " + s.building_number : "", s.floor ? "Floor " + s.floor : ""].filter(Boolean).join(" · "),
    [s.zip, s.city].filter(Boolean).join(" "),
    [s.state, s.country].filter(Boolean).join(", "),
  ].filter((l) => l !== undefined).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return json({ error: "RESEND_API_KEY not set" }, 500);
  try {
    const body = await req.json().catch(() => ({}));
    const o = body.order || {};
    const subject = `New order — ${o.product_name || "Jersey"}${o.size ? " (" + o.size + ")" : ""}`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], subject, html: buildHtml(o), text: buildText(o) }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.status >= 300) return json({ error: data?.message || "send failed", detail: data }, 502);
    return json({ ok: true, id: data?.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
