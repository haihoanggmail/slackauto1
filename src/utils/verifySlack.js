export async function verifySlackRequest(request, signingSecret) {
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  if (!timestamp || !signature) {
    return false;
  }

  // chống replay attack (5 phút)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 60 * 5) {
    return false;
  }

  const body = await request.clone().text();

  const baseString = `v0:${timestamp}:${body}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingSecret);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureData = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(baseString)
  );

  const hashArray = Array.from(new Uint8Array(signatureData));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  const expectedSignature = `v0=${hashHex}`;

  return timingSafeEqual(expectedSignature, signature);
}

// tránh timing attack
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
