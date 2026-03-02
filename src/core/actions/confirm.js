export default async function confirm(body, env) {

  const user = body.user.id;

  return {
    response_type: "ephemeral",
    text: `Confirmed by <@${user}>`
  };
}
