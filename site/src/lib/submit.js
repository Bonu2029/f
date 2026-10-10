/**
 * Sends a form only when an endpoint is configured. Returns
 * { status: "sent" } only on a successful HTTP response.
 */
export async function submitForm(endpoint, data) {
  if (!endpoint) return { status: "not-connected" };
  try {
    const body = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((x) => body.append(k, x));
      else if (v != null) body.append(k, v);
    });
    const res = await fetch(endpoint, { method: "POST", body, headers: { Accept: "application/json" } });
    return res.ok ? { status: "sent" } : { status: "error", message: `The server responded with ${res.status}.` };
  } catch (e) {
    return { status: "error", message: "We couldn't reach the server. Please check your connection and try again." };
  }
}

