export async function handleCommand(body, env) {
  const { command, text, user_id } = body;

  switch (command) {

    case "/invoice":
      return {
        response_type: "ephemeral",
        text: `Invoice command received from <@${user_id}>`
      };

    default:
      return {
        response_type: "ephemeral",
        text: "Unknown command"
      };
  }
}
