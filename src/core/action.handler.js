import confirm from "./actions/confirm";
import cancel from "./actions/cancel";

export async function handleAction(body, env) {

  const actionId = body.actions?.[0]?.action_id;

  switch (actionId) {

    case "confirm":
      return await confirm(body, env);

    case "cancel":
      return await cancel(body, env);

    default:
      return { text: "Unknown action" };
  }
}
