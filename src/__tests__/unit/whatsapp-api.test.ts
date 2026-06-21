import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch before importing the module
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Import after mock is set up
const { sendMessage } = await import('@/lib/whatsapp/whatsappApi');

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WHATSAPP_PHONE_ID = 'test-phone-id';
  process.env.WHATSAPP_TOKEN = 'test-token';
});

describe('sendMessage', () => {
  it('sends a text message successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messaging_product: 'whatsapp', messages: [{ id: 'msg-1' }] }),
    });

    const result = await sendMessage('5511999999999', 'Olá, tudo bem?');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v22.0/test-phone-id/messages',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('5511999999999'),
      })
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.messaging_product).toBe('whatsapp');
    expect(callBody.to).toBe('5511999999999');
    expect(callBody.text.body).toBe('Olá, tudo bem?');

    expect(result).toEqual({
      messaging_product: 'whatsapp',
      messages: [{ id: 'msg-1' }],
    });
  });

  it('throws when WHATSAPP_PHONE_ID is missing', async () => {
    delete process.env.WHATSAPP_PHONE_ID;

    await expect(sendMessage('5511999999999', 'teste')).rejects.toThrow(
      'WHATSAPP_PHONE_ID and WHATSAPP_TOKEN must be set'
    );
  });

  it('throws when WHATSAPP_TOKEN is missing', async () => {
    delete process.env.WHATSAPP_TOKEN;

    await expect(sendMessage('5511999999999', 'teste')).rejects.toThrow(
      'WHATSAPP_PHONE_ID and WHATSAPP_TOKEN must be set'
    );
  });

  it('throws on API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Invalid credentials'),
    });

    await expect(sendMessage('5511999999999', 'teste')).rejects.toThrow(
      'WhatsApp API error (401): Invalid credentials'
    );
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    await expect(sendMessage('5511999999999', 'teste')).rejects.toThrow('Network failure');
  });
});
