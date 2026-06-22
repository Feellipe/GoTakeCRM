import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the flow orchestrator before any imports
vi.mock('@/lib/whatsapp/flowOrchestrator', () => ({
  handleMessage: vi.fn(),
}));

// Mock the WhatsApp API client — matches new 4-param signature
vi.mock('@/lib/whatsapp/whatsappApi', () => ({
  sendMessage: vi.fn(),
}));

// Mock the org lookup utility
vi.mock('@/lib/whatsapp/orgLookup', () => ({
  getOrgByPhoneNumberId: vi.fn(),
}));

// Proper mock for next/server — supports both NextResponse.json() and new NextResponse()
vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      super(body, init);
    }

    static json(body: unknown, init?: ResponseInit): MockNextResponse {
      const response = new MockNextResponse(JSON.stringify(body), init);
      return response;
    }
  }

  class MockNextRequest {
    public nextUrl: URL;
    public url: string;
    public method: string;
    public body: string | null;
    public headers: Headers;

    constructor(input: string | URL, init?: RequestInit & { nextUrl?: URL }) {
      this.url = typeof input === 'string' ? input : input.href;
      this.nextUrl = init?.nextUrl || new URL(this.url, 'http://localhost');
      this.method = init?.method || 'GET';
      this.body = (init?.body as string) || null;
      this.headers = new Headers(init?.headers);
    }

    async json() {
      if (!this.body) throw new SyntaxError('Unexpected end of JSON input');
      return JSON.parse(this.body);
    }

    async text() {
      return this.body || '';
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

import { handleMessage } from '@/lib/whatsapp/flowOrchestrator';
import { sendMessage } from '@/lib/whatsapp/whatsappApi';
import { getOrgByPhoneNumberId } from '@/lib/whatsapp/orgLookup';
import { GET, POST } from '@/app/api/whatsapp/route';

const VALID_TOKEN='my_verify_token_123';
const FAKE_PHONE = '5511999999999';
const FAKE_PHONE_NUMBER_ID = 'whatsapp-phone-id-456';
const FAKE_ORG_CONFIG = {
  id: 'org-1',
  token: 'org-token-abc',
  phoneId: FAKE_PHONE_NUMBER_ID,
};

function makeNextRequest(
  url: string,
  init?: RequestInit & { nextUrl?: URL }
): any {
  const { NextRequest } = require('next/server');
  return new NextRequest(url, init);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('WHATSAPP_VERIFY_TOKEN', VALID_TOKEN);
});

// ─── GET — Webhook Verification ─────────────────────────────────

describe('GET /api/whatsapp — Webhook verification', () => {
  it('returns 200 with hub.challenge when verify_token matches', async () => {
    const url = `https://graph.facebook.com/api/whatsapp?hub.mode=subscribe&hub.challenge=123456&hub.verify_token=${VALID_TOKEN}`;
    const req = makeNextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('123456');
  });

  it('returns 403 when verify_token does not match', async () => {
    const url = 'https://graph.facebook.com/api/whatsapp?hub.mode=subscribe&hub.challenge=123456&hub.verify_token=wrong-token';
    const req = makeNextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(403);
    const text = await res.text();
    expect(text).toContain('Invalid verification token');
  });

  it('returns 403 when verify_token is missing', async () => {
    const url = 'https://graph.facebook.com/api/whatsapp?hub.mode=subscribe&hub.challenge=123456';
    const req = makeNextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(403);
  });
});

// ─── POST — Incoming Messages ────────────────────────────────────

describe('POST /api/whatsapp — Incoming messages', () => {
  it('processes a text message using org credentials and sends response', async () => {
    vi.mocked(getOrgByPhoneNumberId).mockResolvedValue(FAKE_ORG_CONFIG);
    vi.mocked(handleMessage).mockResolvedValue('Qual o nome do cliente?');
    vi.mocked(sendMessage).mockResolvedValue({});

    const body = JSON.stringify({
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: FAKE_PHONE,
              text: { body: '/novodeal' },
              type: 'text',
            }],
            metadata: { phone_number_id: FAKE_PHONE_NUMBER_ID },
          },
        }],
      }],
    });

    const req = makeNextRequest('https://graph.facebook.com/api/whatsapp', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' } as any,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(getOrgByPhoneNumberId)).toHaveBeenCalledWith(FAKE_PHONE_NUMBER_ID);
    expect(vi.mocked(handleMessage)).toHaveBeenCalledWith(FAKE_PHONE, '/novodeal');
    expect(vi.mocked(sendMessage)).toHaveBeenCalledWith(FAKE_PHONE, 'Qual o nome do cliente?', FAKE_ORG_CONFIG.token, FAKE_ORG_CONFIG.phoneId);
  });

  it('does not process message when org lookup returns null', async () => {
    vi.mocked(getOrgByPhoneNumberId).mockResolvedValue(null);

    const body = JSON.stringify({
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: FAKE_PHONE,
              text: { body: '/novodeal' },
              type: 'text',
            }],
            metadata: { phone_number_id: 'unknown-phone-id' },
          },
        }],
      }],
    });

    const req = makeNextRequest('https://graph.facebook.com/api/whatsapp', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' } as any,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(getOrgByPhoneNumberId)).toHaveBeenCalledWith('unknown-phone-id');
    expect(vi.mocked(handleMessage)).not.toHaveBeenCalled();
    expect(vi.mocked(sendMessage)).not.toHaveBeenCalled();
  });

  it('does not send response when handleMessage returns empty string', async () => {
    vi.mocked(getOrgByPhoneNumberId).mockResolvedValue(FAKE_ORG_CONFIG);
    vi.mocked(handleMessage).mockResolvedValue('');

    const body = JSON.stringify({
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: FAKE_PHONE,
              text: { body: 'mensagem qualquer' },
              type: 'text',
            }],
            metadata: { phone_number_id: FAKE_PHONE_NUMBER_ID },
          },
        }],
      }],
    });

    const req = makeNextRequest('https://graph.facebook.com/api/whatsapp', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' } as any,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(getOrgByPhoneNumberId)).toHaveBeenCalled();
    expect(vi.mocked(handleMessage)).toHaveBeenCalled();
    expect(vi.mocked(sendMessage)).not.toHaveBeenCalled();
  });

  it('still returns 200 when sendMessage fails', async () => {
    vi.mocked(getOrgByPhoneNumberId).mockResolvedValue(FAKE_ORG_CONFIG);
    vi.mocked(handleMessage).mockResolvedValue('Qual o nome do cliente?');
    vi.mocked(sendMessage).mockRejectedValue(new Error('API error'));

    const body = JSON.stringify({
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: FAKE_PHONE,
              text: { body: '/novodeal' },
              type: 'text',
            }],
            metadata: { phone_number_id: FAKE_PHONE_NUMBER_ID },
          },
        }],
      }],
    });

    const req = makeNextRequest('https://graph.facebook.com/api/whatsapp', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' } as any,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(getOrgByPhoneNumberId)).toHaveBeenCalled();
    expect(vi.mocked(handleMessage)).toHaveBeenCalled();
    expect(vi.mocked(sendMessage)).toHaveBeenCalled();
  });

  it('returns 200 for non-text messages without processing', async () => {
    const body = JSON.stringify({
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: FAKE_PHONE,
              type: 'image',
              image: { id: 'img-123' },
            }],
          },
        }],
      }],
    });

    const req = makeNextRequest('https://graph.facebook.com/api/whatsapp', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' } as any,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(getOrgByPhoneNumberId)).not.toHaveBeenCalled();
    expect(vi.mocked(handleMessage)).not.toHaveBeenCalled();
    expect(vi.mocked(sendMessage)).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON body', async () => {
    const req = makeNextRequest('https://graph.facebook.com/api/whatsapp', {
      method: 'POST',
      body: 'not-json-at-all',
      headers: { 'Content-Type': 'application/json' } as any,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(vi.mocked(getOrgByPhoneNumberId)).not.toHaveBeenCalled();
    expect(vi.mocked(handleMessage)).not.toHaveBeenCalled();
    expect(vi.mocked(sendMessage)).not.toHaveBeenCalled();
  });

  it('returns 400 for empty body', async () => {
    const req = makeNextRequest('https://graph.facebook.com/api/whatsapp', {
      method: 'POST',
      body: '',
      headers: { 'Content-Type': 'application/json' } as any,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 for status updates without processing', async () => {
    const body = JSON.stringify({
      entry: [{
        changes: [{
          value: {
            statuses: [{
              id: 'status-123',
              status: 'read',
            }],
          },
        }],
      }],
    });

    const req = makeNextRequest('https://graph.facebook.com/api/whatsapp', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' } as any,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(getOrgByPhoneNumberId)).not.toHaveBeenCalled();
    expect(vi.mocked(handleMessage)).not.toHaveBeenCalled();
    expect(vi.mocked(sendMessage)).not.toHaveBeenCalled();
  });

  it('returns 200 when payload has no messages array', async () => {
    const body = JSON.stringify({
      entry: [{
        changes: [{
          value: {
            statuses: [{ status: 'sent', id: 'wamid-123' }],
          },
        }],
      }],
    });

    const req = makeNextRequest('https://graph.facebook.com/api/whatsapp', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' } as any,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(getOrgByPhoneNumberId)).not.toHaveBeenCalled();
    expect(vi.mocked(handleMessage)).not.toHaveBeenCalled();
    expect(vi.mocked(sendMessage)).not.toHaveBeenCalled();
  });
});
