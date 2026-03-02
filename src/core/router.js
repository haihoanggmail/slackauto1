import { handleCommand } from "./command.handler";
import { handleAction } from "./action.handler";

export async function router(body, env) {

  // Slash command
  if (body.command) {
    return await handleCommand(body, env);
  }

  // Button action
  if (body.type === "block_actions") {
    return await handleAction(body, env);
  }

  return { text: "Unknown request" };
}
