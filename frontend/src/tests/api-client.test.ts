import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAccessToken,
  setAccessToken,
  CustomApiError,
} from '@/lib/api-client';

describe('API Client & Token Management', () => {
  beforeEach(() => {
    setAccessToken(null);
  });

  it('keeps access token safely in-memory and rotates correctly', () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken('mock-jwt-access-token');
    expect(getAccessToken()).toBe('mock-jwt-access-token');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it('normalizes API errors into CustomApiError instances with HTTP status code and message', () => {
    const error = new CustomApiError(
      'Session window has expired',
      409,
      'WINDOW_EXPIRED',
      [{ field: 'windowMinutes', message: 'Window closed 5 minutes ago' }],
      'req-xyz-123',
    );

    expect(error.name).toBe('CustomApiError');
    expect(error.message).toBe('Session window has expired');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('WINDOW_EXPIRED');
    expect(error.errors?.[0].field).toBe('windowMinutes');
    expect(error.requestId).toBe('req-xyz-123');
  });
});
