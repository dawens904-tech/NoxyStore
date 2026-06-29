/**
 * send-order-email Edge Function
 *
 * Sends an order confirmation email after successful payment.
 *
 * EMAIL SERVICE SETUP:
 * ─────────────────────────────────────────────────────────────
 * This function supports two providers — pick ONE:
 *
 * Option A — Resend (recommended, free tier: 3,000 emails/month)
 *   1. Sign up at https://resend.com
 *   2. Go to API Keys → Create API Key
 *   3. Add to OnSpace Secrets:
 *        RESEND_API_KEY = re_xxxxxxxxxxxx
 *        EMAIL_FROM     = noreply@noxystore.com   (must be a verified domain in Resend)
 *
 * Option B — SendGrid (free tier: 100 emails/day)
 *   1. Sign up at https://sendgrid.com
 *   2. Settings → API Keys → Create API Key (full access or "Mail Send" permission)
 *   3. Add to OnSpace Secrets:
 *        SENDGRID_API_KEY = SG.xxxxxxxxxxxx
 *        EMAIL_FROM       = noreply@noxystore.com  (must match a verified sender)
 *
 * If no email keys are found the function returns success silently
 * (non-critical path — order is already saved).
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      userEmail,
      referenceId,
      orderId,
      gameName,
      skuName,
      amount,
      extraInfo = {},
    } = await req.json();

    if (!userEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: "No email provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
    const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@noxystore.com";

    if (!resendKey && !sendgridKey) {
      console.log("[send-order-email] No email provider configured — skipping send.");
      return new Response(JSON.stringify({ skipped: true, reason: "No email keys configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── Build HTML Email ──────────────────────────────────────────────────────
    const extraRows = Object.entries(extraInfo)
      .map(([k, v]) => `
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;text-transform:capitalize;">${k}</td>
          <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;text-align:right;">${v}</td>
        </tr>`)
      .join("");

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Order Confirmation — NoxyStore</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#facc15;padding:28px 36px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px;">
                NoxyStore
              </h1>
              <p style="margin:4px 0 0;font-size:12px;color:#92400e;font-weight:600;letter-spacing:1px;">
                ORDER CONFIRMATION
              </p>
            </td>
          </tr>

          <!-- Checkmark -->
          <tr>
            <td align="center" style="padding:32px 36px 16px;">
              <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                <span style="font-size:28px;">✓</span>
              </div>
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
                Your order is confirmed!
              </h2>
              <p style="margin:0;font-size:14px;color:#6b7280;">
                Thank you for your purchase, ${userEmail.split("@")[0]}.
              </p>
            </td>
          </tr>

          <!-- Order Details -->
          <tr>
            <td style="padding:0 36px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px;">
                <tr>
                  <td colspan="2" style="padding-bottom:12px;border-bottom:1px solid #e5e7eb;margin-bottom:12px;">
                    <span style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;">
                      Order Details
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0 0;color:#6b7280;font-size:13px;">Reference ID</td>
                  <td style="padding:10px 0 0;color:#111827;font-size:12px;font-weight:600;text-align:right;font-family:monospace;">
                    ${referenceId}
                  </td>
                </tr>
                ${orderId ? `
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;">Order ID</td>
                  <td style="padding:8px 0;color:#111827;font-size:12px;font-weight:600;text-align:right;font-family:monospace;">
                    ${orderId}
                  </td>
                </tr>` : ""}
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;">Game</td>
                  <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;text-align:right;">${gameName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;">Item</td>
                  <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;text-align:right;">${skuName}</td>
                </tr>
                ${extraRows}
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 0 0;color:#111827;font-size:14px;font-weight:700;">Amount Paid</td>
                  <td style="padding:12px 0 0;color:#16a34a;font-size:16px;font-weight:800;text-align:right;">
                    USD $${Number(amount).toFixed(2)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 36px 28px;">
              <a href="https://www.noxystore.com/orders/${referenceId}"
                 style="display:inline-block;background:#facc15;color:#111827;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                Track Your Order
              </a>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="background:#f9fafb;padding:20px 36px;border-top:1px solid #f3f4f6;">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-align:center;">
                Need help? Our support team is here for you.
              </p>
              <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">
                📧 <a href="mailto:support@noxystore.com" style="color:#3b82f6;font-weight:600;">support@noxystore.com</a>
                &nbsp;·&nbsp;
                💬 <a href="https://www.noxystore.com/support" style="color:#3b82f6;font-weight:600;">Live Chat</a>
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#d1d5db;text-align:center;">
                © ${new Date().getFullYear()} NoxyStore · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textBody = `
Order Confirmed — NoxyStore

Hi ${userEmail.split("@")[0]},

Your order has been confirmed!

Reference ID : ${referenceId}
${orderId ? `Order ID     : ${orderId}\n` : ""}Game         : ${gameName}
Item         : ${skuName}
Amount Paid  : USD $${Number(amount).toFixed(2)}

Track your order: https://www.noxystore.com/orders/${referenceId}

Need help? Email us at support@noxystore.com or visit https://www.noxystore.com/support

© ${new Date().getFullYear()} NoxyStore
`.trim();

    // ── Send via Resend ────────────────────────────────────────────────────────
    if (resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `NoxyStore <${fromEmail}>`,
          to: [userEmail],
          subject: `✅ Order Confirmed — ${gameName} (${skuName})`,
          html: htmlBody,
          text: textBody,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Resend: ${res.status} ${errText}`);
      }

      const resData = await res.json();
      console.log(`[send-order-email] Sent via Resend to ${userEmail}, id=${resData.id}`);

      return new Response(JSON.stringify({ success: true, provider: "resend", emailId: resData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── Send via SendGrid ──────────────────────────────────────────────────────
    if (sendgridKey) {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendgridKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: userEmail }] }],
          from: { email: fromEmail, name: "NoxyStore" },
          subject: `✅ Order Confirmed — ${gameName} (${skuName})`,
          content: [
            { type: "text/plain", value: textBody },
            { type: "text/html", value: htmlBody },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`SendGrid: ${res.status} ${errText}`);
      }

      console.log(`[send-order-email] Sent via SendGrid to ${userEmail}`);

      return new Response(JSON.stringify({ success: true, provider: "sendgrid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[send-order-email] Error:", error.message);
    // Return 200 even on error — email is non-critical
    return new Response(JSON.stringify({ error: error.message, critical: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
