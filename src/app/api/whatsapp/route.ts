import { NextRequest, NextResponse } from 'next/server';
import { handleMessage } from '@/lib/whatsapp/flowOrchestrator';
import { getOrgByPhoneNumberId } from '@/lib/whatsapp/orgLookup';
import { sendMessage } from '@/lib/whatsapp/whatsappApi';

/**
 * GET /api/whatsapp — Webhook verification (required by WhatsApp Cloud API).
 *
 * WhatsApp sends a verification request with:
 *   hub.mode         = "subscribe"
 *   hub.challenge    = random string to echo back
 *   hub.verify_token = token we configured in Meta Dashboard
 *
 * Respond with 200 + challenge body if verify_token matches,
 * otherwise 403 Forbidden.
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token');

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    mode === 'subscribe' &&
    challenge &&
    verifyToken &&
    expectedToken &&
    verifyToken === expectedToken
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Invalid verification token', { status: 403 });
}

/**
 * POST /api/whatsapp — Receive incoming WhatsApp messages.
 *
 * Multi-tenant: looks up the Organization by the webhook payload's
 * metadata.phone_number_id, then uses that org's WhatsApp credentials
 * to respond.
 *
 * Always returns 200 OK — WhatsApp requires a 2xx for all deliveries.
 */
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Empty or invalid body' },
      { status: 400 }
    );
  }

  // Extract the first text message from the WhatsApp payload
  const payload = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            from?: string;
            type?: string;
            text?: { body?: string };
          }>;
          metadata?: {
            phone_number_id?: string;
          };
        };
      }>;
    }>;
  };

  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  // Non-text messages (image, audio, video, etc.) — acknowledge but don't process
  if (!message || message.type !== 'text' || !message.text?.body) {
    return new NextResponse('OK', { status: 200 });
  }

  const phone = message.from;
  const text = message.text.body;

  if (!phone || !text) {
    return new NextResponse('OK', { status: 200 });
  }

  // Look up the organization by phone_number_id (multi-tenant)
  const phoneNumberId =
    payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

  if (!phoneNumberId) {
    return new NextResponse('OK', { status: 200 });
  }

  const org = await getOrgByPhoneNumberId(phoneNumberId);

  if (!org) {
    return new NextResponse('OK', { status: 200 });
  }

  // Process the message through the flow orchestrator
  const responseText = await handleMessage(phone, text, org.id);

  // Send response back via WhatsApp API (if there's something to say)
  if (responseText) {
    try {
      await sendMessage(phone, responseText, org.token, org.phoneId);
    } catch (error) {
      console.error('Failed to send WhatsApp response:', error);
    }
  }

  return new NextResponse('OK', { status: 200 });
}
