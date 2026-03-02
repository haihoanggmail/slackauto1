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
    const params = new URLSearchParams(bodyText);

    const user = params.get("user_name");
    const text = params.get("text");

    return new Response(
      JSON.stringify({
        response_type: "in_channel",
        text: `Xin chào ${user} 👋 Bạn vừa nhập: ${text}`
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
