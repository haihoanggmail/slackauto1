import crypto from "crypto";

/* =========================
   Insert Log
========================= */
async function insertLog(env, data) {
  await env.DB.prepare(`
    INSERT INTO logs (
      time, raw, command, userid, username,
      channelid, channelname, action, error
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
}

/* =========================
   Main Worker
========================= */
export default {
  async fetch(request, env) {

    if (request.method !== "POST") {
      return new Response("Not allowed", { status: 405 });
    }

    const bodyText = await request.text();

    /* =========================
       INTERACTIVE BUTTON CLICK
    ========================== */
    if (bodyText.startsWith("payload=")) {

      const payload = JSON.parse(
        decodeURIComponent(bodyText.replace("payload=", ""))
      );

      const action = payload.actions[0].action_id;
      const user = payload.user.username;
      const responseUrl = payload.response_url;

      await insertLog(env, {
        raw: JSON.stringify(payload),
        userid: payload.user.id,
        username: user,
        action: action
      });

      // Cập nhật tin nhắn
      await fetch(responseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replace_original: true,
          text: `${user} đã ${action}`
        })
      });

      return new Response("", { status: 200 });
    }

    /* =========================
       SLASH COMMAND
    ========================== */

    const params = new URLSearchParams(bodyText);
    const body = Object.fromEntries(params);

    const user = body.user_name;
    const text = body.text;

    await insertLog(env, {
      raw: bodyText,
      command: text,
      userid: body.user_id,
      username: user,
      channelid: body.channel_id,
      channelname: body.channel_name,
      action: body.command
    });

    return new Response(
      JSON.stringify({
        response_type: "in_channel",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Đã nhận tin nhắn của *${user}*\nNội dung: *${text}*`
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Xác nhận" },
                style: "primary",
                action_id: "xác nhận"
              },
              {
                type: "button",
                text: { type: "plain_text", text: "Báo sai" },
                style: "danger",
                action_id: "báo sai"
              },
              {
                type: "button",
                text: { type: "plain_text", text: "Hủy" },
                action_id: "hủy"
              }
            ]
          }
        ]
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};
