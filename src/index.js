import { verifySlackRequest } from "./utils/verifySlack";

async function saveLog(env, data) {
  try {
    await env.DB.prepare(`
      INSERT INTO logs 
      (time, raw, command, userid, username, channelid, channelname, action, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      new Date().toISOString(),
      data.raw || "",
      data.command || "",
      data.userid || "",
      data.username || "",
      data.channelid || "",
      data.channelname || "",
      data.action || "",
      data.error || ""
    )
    .run();
  } catch (err) {
    console.error("D1 log error:", err);
  }
}

export default {
  async fetch(request, env) {

    if (request.method === "GET") {
      return new Response("Slack Worker Running");
    }

    const rawBody = await request.clone().text();

    let logData = {
      raw: rawBody
    };

    try {

      const isValid = await verifySlackRequest(
        request,
        env.SLACK_SIGNING_SECRET
      );

      if (!isValid) {
        logData.error = "Invalid signature";
        await saveLog(env, logData);
        return new Response("Unauthorized", { status: 401 });
      }

      // Slash command
      if (rawBody.startsWith("token=")) {

        const params = new URLSearchParams(rawBody);

        logData.command = params.get("command");
        logData.userid = params.get("user_id");
        logData.username = params.get("user_name");
        logData.channelid = params.get("channel_id");
        logData.channelname = params.get("channel_name");
        logData.action = "slash_command";

        await saveLog(env, logData);

        return new Response(
          JSON.stringify({
            response_type: "in_channel",
            text: `Đã ghi log thành công`
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Interactive action
      const payload = new URLSearchParams(rawBody).get("payload");

      if (payload) {

        const data = JSON.parse(payload);
        const actionObj = data.actions[0];

        logData.userid = data.user.id;
        logData.username = data.user.username;
        logData.channelid = data.channel.id;
        logData.channelname = data.channel.name;
        logData.action = actionObj.action_id;

        await saveLog(env, logData);

        return new Response(
          JSON.stringify({
            text: `Action ${actionObj.action_id} đã được log`
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      await saveLog(env, logData);
      return new Response("OK");

    } catch (err) {
      logData.error = err.message;
      await saveLog(env, logData);
      return new Response("Internal Error", { status: 500 });
    }
  }
};
