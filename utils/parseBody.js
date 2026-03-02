export async function parseBody(request) {
  const contentType = request.headers.get("content-type");

  if (contentType.includes("application/json")) {
    return await request.json();
  }

  const formData = await request.formData();

  if (formData.get("payload")) {
    return JSON.parse(formData.get("payload"));
  }

  return Object.fromEntries(formData);
}
