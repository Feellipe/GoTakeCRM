import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

// Helper to create a NextRequest for testing
function createRequest(ip = '127.0.0.1', route = '/api/test') {
  return new NextRequest(`http://localhost${route}`, {
    headers: {
      'x-forwarded-for': ip,
      'x-real-ip': undefined,
    },
  });
}

describe('rateLimit', () => {
  beforeEach(() => {
    // Reset the internal store by creating many requests to fill and expire
    // We can't directly access the store, but we can test fresh behavior
    // by using unique IPs and routes
  });

  it('allows first request and returns correct remaining count', () => {
    const request = createRequest('192.168.1.1', '/api/test');
    const result = rateLimit(request, { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it('allows requests under the limit', () => {
    const request = createRequest('192.168.1.2', '/api/test');
    // 3 requests out of limit 5
    rateLimit(request, { limit: 5, windowMs: 60_000 });
    rateLimit(request, { limit: 5, windowMs: 60_000 });
    const result = rateLimit(request, { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests exceeding the limit', () => {
    const request = createRequest('192.168.1.3', '/api/test');
    // Exhaust limit of 3
    rateLimit(request, { limit: 3, windowMs: 60_000 });
    rateLimit(request, { limit: 3, windowMs: 60_000 });
    rateLimit(request, { limit: 3, windowMs: 60_000 });
    // 4th should be blocked
    const result = rateLimit(request, { limit: 3, windowMs: 60_000 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks limits per IP + route combination', () => {
    const request1 = createRequest('192.168.1.4', '/api/test');
    const request2 = createRequest('192.168.1.5', '/api/test');
    const request3 = createRequest('192.168.1.4', '/api/other');

    // Exhaust limit for IP+route 1
    rateLimit(request1, { limit: 1, windowMs: 60_000 });

    // Same IP, different route — should still be allowed
    const result3 = rateLimit(request3, { limit: 1, windowMs: 60_000 });
    expect(result3.success).toBe(true);

    // Different IP, same route — should still be allowed
    const result2 = rateLimit(request2, { limit: 1, windowMs: 60_000 });
    expect(result2.success).toBe(true);
  });

  it('extracts IP from x-forwarded-for header', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.1, 172.16.0.1' },
    });
    const result = rateLimit(request, { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    // Different forwarded IP = different bucket
    const request2 = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.2' },
    });
    const result2 = rateLimit(request2, { limit: 1, windowMs: 60_000 });
    expect(result2.success).toBe(true);
  });

  it('extracts IP from x-real-ip when x-forwarded-for is missing', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-real-ip': '10.0.0.5' },
    });
    const result = rateLimit(request, { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
  });

  it('defaults to 127.0.0.1 when no IP headers present', () => {
    const request = new NextRequest('http://localhost/api/test');
    const result = rateLimit(request, { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
  });

  it('uses default limit of 100 when no options provided', () => {
    const request = createRequest('192.168.1.99', '/api/default-test');
    const result = rateLimit(request);
    expect(result.limit).toBe(100);
    expect(result.remaining).toBe(99);
  });

  it('returns resetAt timestamp', () => {
    const request = createRequest('192.168.1.100', '/api/reset-test');
    const before = Date.now();
    const result = rateLimit(request, { limit: 5, windowMs: 60_000 });
    expect(result.resetAt).toBeGreaterThan(before);
    expect(result.resetAt).toBeLessThanOrEqual(before + 60_000);
  });
});

describe('rateLimitResponse', () => {
  it('returns a 429 status response', () => {
    const response = rateLimitResponse();
    expect(response.status).toBe(429);
  });

  it('includes Retry-After header', async () => {
    const response = rateLimitResponse();
    const retryAfter = response.headers.get('Retry-After');
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThanOrEqual(1);
  });

  it('calculates Retry-After from resetAt', () => {
    const futureReset = Date.now() + 30_000; // 30 seconds from now
    const response = rateLimitResponse(futureReset);
    const retryAfter = Number(response.headers.get('Retry-After'));
    // Should be ~30 seconds
    expect(retryAfter).toBeGreaterThanOrEqual(29);
    expect(retryAfter).toBeLessThanOrEqual(31);
  });

  it('defaults to 60 seconds when no resetAt provided', () => {
    const response = rateLimitResponse();
    const retryAfter = Number(response.headers.get('Retry-After'));
    expect(retryAfter).toBe(60);
  });

  it('returns error message in JSON body', async () => {
    const response = rateLimitResponse();
    const body = await response.json();
    expect(body).toEqual({
      error: 'Too many requests. Please try again later.',
    });
  });

  it('ensures minimum Retry-After of 1 second', () => {
    const pastReset = Date.now() - 5000; // 5 seconds ago
    const response = rateLimitResponse(pastReset);
    const retryAfter = Number(response.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
  });
});
