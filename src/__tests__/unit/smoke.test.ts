// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('jsdom smoke test', () => {
  it('window exists', () => {
    expect(window).toBeDefined();
  });
});
