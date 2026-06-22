import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch before importing the module
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Import after mock is set up
const { sendMessage } = await import('@/lib/whatsapp/whatsappApi');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendMessage', () => {
  const TEST_PHONE = '5511999999999';
  const TEST_TEXT = 'Olá, tudo bem?';
  const TEST_TOKEN = 'test-token';
  const TEST_PHONE_ID = 'test-phone-id';

  it('sends a text message successfully with provided credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messaging_product: 'whatsapp', messages: [{ id: 'msg-1' }] }),
    });

    const result = await sendMessage(TEST_PHONE, TEST_TEXT, TEST_TOKEN, TEST_PHONE_ID);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v22.0/test-phone-id/messages',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining(TEST_PHONE),
      })
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.messaging_product).toBe('whatsapp');
    expect(callBody.to).toBe(TEST_PHONE);
    expect(callBody.text.body).toBe(TEST_TEXT);

    expect(result).toEqual({
      messaging_product: 'whatsapp',
      messages: [{ id: 'msg-1' }],
    });
  });

  it('throws on API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Invalid credentials'),
    });

    await expect(sendMessage(TEST_PHONE, TEST_TEXT, TEST_TOKEN, TEST_PHONE_ID)).rejects.toThrow(
      'WhatsApp API error (401): Invalid credentials'
    );
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    await expect(sendMessage(TEST_PHONE, TEST_TEXT, TEST_TOKEN, TEST_PHONE_ID)).rejects.toThrow('Network failure');
  });
});
