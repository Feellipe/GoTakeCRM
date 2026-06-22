/**
 * WhatsApp Cloud API client for sending messages.
 *
 * Multi-tenant: credentials (token & phoneId) are passed explicitly
 * by the caller — no env var dependency.
 *
 * For tests, mock at the fetch boundary.
 */

const API_BASE = 'https://graph.facebook.com/v22.0';

/**
 * Sends a text message via WhatsApp Cloud API.
 *
 * @param phone   - Recipient phone number (digits only, with country code)
 * @param text    - Message body text
 * @param token   - WhatsApp permanent access token (per-org credential)
 * @param phoneId - WhatsApp Business Phone Number ID (per-org credential)
 * @returns The API response JSON on success
 * @throws If the API returns an error
 */
export async function sendMessage(
  phone: string,
  text: string,
  token: string,
  phoneId: string
): Promise<Record<string, unknown>> {
  const url = `${API_BASE}/${phoneId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { preview_url: false, body: text },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `WhatsApp API error (${response.status}): ${errorBody}`
    );
  }

  return response.json() as Promise<Record<string, unknown>>;
}
