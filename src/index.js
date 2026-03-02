import { verifySlackRequest } from "./utils/verifySlack";

export default {
  async fetch(request, env) {
    // chỉ cho phép POST (Slack webhook)
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // verify chữ ký Slack
    const isValid = await verifySlackRequest(
      request,
      env.SLACK_SIGNING_SECRET
    );

    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }

    // đọc body sau khi verify
    const bodyText = await request.text();

    return new Response(
      JSON.stringify({
        ok: true,
        received: bodyText
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
