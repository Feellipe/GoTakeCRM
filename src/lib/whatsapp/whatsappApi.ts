/**
 * WhatsApp Cloud API client for sending messages.
 *
 * Uses env vars:
 *   WHATSAPP_PHONE_ID — WhatsApp Business Phone Number ID
 *   WHATSAPP_TOKEN   — Permanent access token from Meta
 *
 * For tests, mock at the fetch boundary.
 */

const API_BASE = 'https://graph.facebook.com/v22.0';

/**
 * Sends a text message via WhatsApp Cloud API.
 *
 * @param phone - Recipient phone number (digits only, with country code)
 * @param text  - Message body text
 * @returns The API response JSON on success
 * @throws If env vars are missing or the API returns an error
 */
export async function sendMessage(
  phone: string,
  text: string
): Promise<Record<string, unknown>> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneId || !token) {
    throw new Error(
      'WHATSAPP_PHONE_ID and WHATSAPP_TOKEN must be set in environment'
    );
  }

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
