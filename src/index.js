import { verifySlackRequest } from "./utils/verifySlack";

export default {
  async fetch(request, env) {

    if (request.method === "GET") {
      return new Response("Slack Worker Running");
    }

    const isValid = await verifySlackRequest(
      request,
      env.SLACK_SIGNING_SECRET
    );

    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const bodyText = await request.text();

    // Slash command
    if (bodyText.startsWith("token=")) {

      const params = new URLSearchParams(bodyText);
      const user = params.get("user_name");
      const text = params.get("text");

      return new Response(
        JSON.stringify({
          response_type: "in_channel",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*${user}* yêu cầu: ${text}`
              }
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: "✅ Confirm"
                  },
                  style: "primary",
                  value: text,
                  action_id: "confirm_action"
                },
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: "❌ Cancel"
                  },
                  style: "danger",
                  value: text,
                  action_id: "cancel_action"
                }
              ]
            }
          ]
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Interactive button click
    const payload = new URLSearchParams(bodyText).get("payload");

    if (payload) {
      const data = JSON.parse(payload);
      const action = data.actions[0];

      if (action.action_id === "confirm_action") {
        return new Response(
          JSON.stringify({
            text: `✅ Đã xác nhận: ${action.value}`
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      if (action.action_id === "cancel_action") {
        return new Response(
          JSON.stringify({
            text: `❌ Đã hủy: ${action.value}`
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response("OK");
  }
};
