import crypto from "crypto";

/* =========================
   Verify Slack Signature
========================= */
async function verifySlackSignature(request, signingSecret) {
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  if (!timestamp || !signature) return false;

  const body = await request.clone().text();
  const baseString = `v0:${timestamp}:${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const hash = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(baseString)
  );

  const computed =
    "v0=" +
    Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
}

/* =========================
   Insert Log to D1
========================= */
async function insertLog(env, data) {
  try {
    await env.DB.prepare(`
      INSERT INTO logs (
        time,
        raw,
        command,
        userid,
        username,
        channelid,
        channelname,
        action,
        error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      new Date().toISOString(),
      data.raw || "",
      data.command || "",
      data.userid || "",
      data.username || "",
      data.channelid || "",
      data.channelname || "",
      data.action || "",
      data.error || ""
    ).run();
  } catch (e) {
    console.log("D1 insert error:", e);
  }
}

/* =========================
   Main Worker
========================= */
export default {
  async fetch(request, env) {

    if (request.method !== "POST") {
      return new Response("Not allowed", { status: 405 });
    }

    try {
      /* ===== Verify Slack ===== */
      const isValid = await verifySlackSignature(
        request,
        env.SLACK_SIGNING_SECRET
      );

      if (!isValid) {
        await insertLog(env, {
          raw: await request.clone().text(),
          action: "invalid_signature",
          error: "Slack signature invalid"
        });

        return new Response("Invalid signature", { status: 401 });
      }

      /* ===== Parse Body ===== */
      const bodyText = await request.text();
      const params = new URLSearchParams(bodyText);

      const body = Object.fromEntries(params);

      /* ===== Always Log Raw First ===== */
      await insertLog(env, {
        raw: JSON.stringify(body),
        command: body.text,
        userid: body.user_id,
        username: body.user_name,
        channelid: body.channel_id,
        channelname: body.channel_name,
        action: body.command || "unknown",
        error: ""
      });

      /* ===== Handle Slash Command ===== */
      if (body.command === "/hello") {
        return new Response(
          JSON.stringify({
            response_type: "in_channel",
            text: `Xin chào ${body.user_name} 👋 Bạn vừa nhập: ${body.text}`
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          response_type: "ephemeral",
          text: "Command không hợp lệ."
        }),
        { headers: { "Content-Type": "application/json" } }
      );

    } catch (err) {

      await insertLog(env, {
        raw: "",
        action: "system_error",
        error: err.message
      });

      return new Response("Server error", { status: 500 });
    }
  }
};
