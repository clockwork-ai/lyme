// Sends each quote form enquiry on to Clockwork Jobs, so it lands in the app as a new enquiry
// and Callum gets a text. The email still goes first and is the backup: if the app is slow or
// down, the visitor still gets the thank-you page and nothing is lost.
// Needs JOBS_ENQUIRY_KEY (a secret, made in Clockwork Jobs set-up). JOBS_APP_URL is optional.
// Photos stay in the email only.

export const JOBS_DEFAULT_URL = "https://clockwork-ai-jobflow.vercel.app";

export function enquiryPayload(fields) {
  return {
    name: fields.name,
    phone: fields.phone,
    email: fields.email || "",
    postcode: fields.postcode,
    job: fields.job,
    message: fields.message,
    bestTime: fields.bestTime,
    source: "Website form",
  };
}

/** Returns "sent", "off" (no key set) or "failed: <why>". Never throws. */
export async function sendToJobs(fields, env, fetchImpl = fetch) {
  const key = env && env.JOBS_ENQUIRY_KEY;
  if (!key) return "off";
  const base = (env.JOBS_APP_URL || JOBS_DEFAULT_URL).replace(/\/+$/, "");
  try {
    const res = await fetchImpl(base + "/api/enquiries", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify(enquiryPayload(fields)),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "failed: " + res.status;
    return "sent";
  } catch (err) {
    return "failed: " + (err && err.name ? err.name : "network");
  }
}
