import { router } from "./core/router";
import { verifySlackRequest } from "./utils/verifySlack";
import { parseBody } from "./utils/parseBody";

export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method !== "POST") {
        return new Response("Not allowed", { status: 405 });
      }

      // Verify Slack signature
      const isValid = await verifySlackRequest(request, env);
      if (!isValid) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Parse body (Slack gửi form-urlencoded)
      const body = await parseBody(request);

      // Route request
      const result = await router(body, env);

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (err) {
      console.error(err);
      return new Response("Internal Error", { status: 500 });
    }
  }
};
