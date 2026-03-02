import crypto from "crypto";

/* =========================
   Insert Log
========================= */
async function insertLog(env, data) {
  await env.DB.prepare(`
    INSERT INTO logs (
         time,userid,username,command,action,text,channelid,channelname,raw,error,request_id,status,message_ts,trigger_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)
  `).bind(
    new Date().toISOString(),
   data.userid|| "",data.username|| "",data.command|| "",
     data.action|| "",data.text|| "",data.channelid|| "",data.channelname|| "",
     data.raw|| "",data.error|| "",data.request_id|| "",data.status|| "",
     data.message_ts|| "",data.trigger_id|| ""
  ).run();
}

/* =========================
   Update Status
========================= */
async function updateStatus(env, request_id, status) {
  await env.DB.prepare(`
    UPDATE logs
    SET status = ?
    WHERE request_id = ?
  `).bind(status, request_id).run();
}

/* =========================
   MAIN WORKER
========================= */
export default {
  async fetch(request, env) {

    if (request.method !== "POST") {
      return new Response("Not allowed", { status: 405 });
    }

    const bodyText = await request.text();

    /* =====================================================
       INTERACTIVE BUTTON CLICK
    ===================================================== */
    if (bodyText.startsWith("payload=")) {

      const payload = JSON.parse(
        decodeURIComponent(bodyText.replace("payload=", ""))
      );

      const action = payload.actions[0].action_id;
      const request_id = payload.actions[0].value;
      const user = payload.user.username;
      const message_ts = payload.message.ts;
      const responseUrl = payload.response_url;

      await updateStatus(env, request_id, action);

      await insertLog(env, {
        raw: JSON.stringify(payload),
        userid: payload.user.id,
        username: user,
        action: action,
        request_id: request_id,
        status: action,
        message_ts: message_ts
      });

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

    /* =====================================================
       SLASH COMMAND
    ===================================================== */

    const params = new URLSearchParams(bodyText);
    const body = Object.fromEntries(params);

    const request_id = crypto.randomUUID();

    const user = body.user_name;
    const text = body.text;

    await insertLog(env, {
      raw: bodyText,
      command: body.command,
      userid: body.user_id,
      username: user,
      channelid: body.channel_id,
      channelname: body.channel_name,
      action: "slash_command",
      trigger_id: body.trigger_id,
      request_id: request_id,
      status: "pending"
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
                action_id: "confirmed",
                value: request_id
              },
              {
                type: "button",
                text: { type: "plain_text", text: "Báo sai" },
                style: "danger",
                action_id: "rejected",
                value: request_id
              },
              {
                type: "button",
                text: { type: "plain_text", text: "Hủy" },
                action_id: "cancelled",
                value: request_id
              }
            ]
          }
        ]
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};
