/**
 * Small helpers for browser-side fetch calls.
 *
 * Why this exists: a failed API call isn't always JSON. When a serverless
 * function crashes or a deploy is mid-swap, the response body is plain text
 * or HTML — and `res.json()` throwing used to surface as a misleading
 * "couldn't reach the server". This reads the real reason safely.
 */

/** Extract the most useful human-readable error from any failed Response. */
export async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.clone().json()) as { error?: string };
    if (data && typeof data.error === "string" && data.error) return data.error;
  } catch {
    // Body wasn't JSON — fall through to a status-based message.
  }
  if (res.status === 401) return "Your session expired — please log in again.";
  if (res.status === 404) return "That campaign wasn't found — refresh the page and try again.";
  if (res.status >= 500) {
    return `The server hit an error (code ${res.status}). Wait a few seconds and try again — if a new version was just deployed, it may still be starting up.`;
  }
  return `Something went wrong (code ${res.status}). Please try again.`;
}
