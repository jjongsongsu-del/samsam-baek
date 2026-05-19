import crypto from 'crypto';
import { z } from 'zod';
import { config } from './config.js';

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const base64Url = (input: Buffer | string) => Buffer.from(input).toString('base64url');
const ADMIN_TOKEN_TTL_SECONDS = 60 * 60 * 8;

function sign(payload: Record<string, unknown>) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = crypto.createHmac('sha256', config.jwtSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function loginAdmin(input: z.infer<typeof adminLoginSchema>) {
  if (input.username !== config.adminUsername || input.password !== config.adminPassword) {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ADMIN_TOKEN_TTL_SECONDS;
  return {
    username: config.adminUsername,
    accessToken: sign({
      sub: config.adminUsername,
      role: 'admin',
      iat: now,
      exp: expiresAt,
      iss: 'samsam-bff',
    }),
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export function verifyAdminToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  const [header, payload, signature] = parts;
  const expected = crypto.createHmac('sha256', config.jwtSecret).update(`${header}.${payload}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return false;
  }
  try {
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return body?.role === 'admin' && body?.sub === config.adminUsername && Number(body?.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
