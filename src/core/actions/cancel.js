export default async function cancel(body, env) {

  const user = body.user.id;

  return {
    response_type: "ephemeral",
    text: `Cancelled by <@${user}>`
  };
}
