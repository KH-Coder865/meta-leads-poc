const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const supabase = require("../services/supabase");

// Verify Meta's webhook subscription
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.META_VERIFY_TOKEN &&
    challenge
  ) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Verify the Meta signature using the raw request body
function verifyMetaSignature(req, res, next) {
  const signature = req.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET;

  if (!signature || !appSecret || !req.rawBody) {
    console.error("Signature verification failed: Missing required parameters", {
      hasSignature: !!signature,
      hasAppSecret: !!appSecret,
      hasRawBody: !!req.rawBody,
    });
    return res.sendStatus(401);
  }

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", appSecret)
      .update(req.rawBody)
      .digest("hex");

  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    console.error("Signature mismatch error:", { expected, actual: signature });
    return res.sendStatus(401);
  }

  next();
}

router.post("/", verifyMetaSignature, async (req, res) => {
  // Acknowledge Meta immediately with 200 OK
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== "page" || !Array.isArray(body.entry)) {
      return;
    }

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;

        const leadId = change.value?.leadgen_id;
        if (!leadId) continue;

        console.log("Received lead notification:", leadId);

        const graphResponse = await fetch(
          `https://graph.facebook.com/v26.0/${encodeURIComponent(leadId)}?fields=id,created_time,field_data,form_id,ad_id`,
          {
            headers: {
              Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
            },
          }
        );

        const lead = await graphResponse.json();

        if (!graphResponse.ok) {
          console.error("Meta Graph API error:", lead);
          continue;
        }

        const fields = {};
        for (const item of lead.field_data || []) {
          fields[item.name] = item.values?.[0] ?? null;
        }

        const { error } = await supabase.from("leads").upsert(
          {
            meta_lead_id: lead.id,
            full_name: fields.full_name || fields.name || null,
            email: fields.email || null,
            phone_number: fields.phone_number || fields.phone || null,
            form_id: lead.form_id || null,
            page_id: entry.id || null,
            created_time: lead.created_time || null,
            raw_data: lead,
          },
          { onConflict: "meta_lead_id", ignoreDuplicates: true }
        );

        if (error) {
          console.error("Supabase insert error:", error.message);
          continue;
        }

        console.log("Lead processed & saved successfully:", lead.id);
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error.message);
  }
});

module.exports = router;