import type { SessionCookieOptions } from './session.types.js';

export function createSessionCookie(options: SessionCookieOptions): string {
  const segments = [
    `${options.name}=${encodeURIComponent(options.value)}`,
    'HttpOnly',
    `SameSite=${options.sameSite ?? 'Lax'}`,
    `Path=${options.path ?? '/'}`,
    `Expires=${options.expiresAt.toUTCString()}`,
  ];

  if (options.secure) {
    segments.push('Secure');
  }

  return segments.join('; ');
}

export function createExpiredSessionCookie(name: string, secure: boolean): string {
  return createSessionCookie({
    name,
    value: '',
    expiresAt: new Date(0),
    secure,
  });
}
