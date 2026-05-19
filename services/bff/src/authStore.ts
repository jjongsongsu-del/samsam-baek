import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { config } from './config.js';

export const socialProviderSchema = z.enum(['google', 'kakao', 'naver']);
export type SocialProvider = z.infer<typeof socialProviderSchema>;

export const socialLoginSchema = z
  .object({
    provider: socialProviderSchema,
    accessToken: z.string().min(1).optional(),
    authorizationCode: z.string().min(1).optional(),
    redirectUri: z.string().min(1).optional(),
  })
  .refine((body) => body.accessToken || body.authorizationCode, {
    message: 'accessToken or authorizationCode is required',
  });

type User = {
  id: string;
  nickname: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

type SocialAccount = {
  id: string;
  userId: string;
  provider: SocialProvider;
  providerUserId: string;
  email?: string;
  nickname?: string;
  createdAt: string;
  updatedAt: string;
};

type RefreshToken = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

type AuthData = {
  users: User[];
  socialAccounts: SocialAccount[];
  refreshTokens: RefreshToken[];
};

type VerifiedSocialUser = {
  providerUserId: string;
  email?: string;
  nickname?: string;
};

const dataDir = path.resolve('data');
const dataFile = path.join(dataDir, 'auth.json');

const emptyAuthData = (): AuthData => ({
  users: [],
  socialAccounts: [],
  refreshTokens: [],
});

async function readAuthData(): Promise<AuthData> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      socialAccounts: Array.isArray(parsed.socialAccounts) ? parsed.socialAccounts : [],
      refreshTokens: Array.isArray(parsed.refreshTokens) ? parsed.refreshTokens : [],
    };
  } catch {
    const data = emptyAuthData();
    await writeAuthData(data);
    return data;
  }
}

async function writeAuthData(data: AuthData) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

const base64Url = (input: Buffer | string) => Buffer.from(input).toString('base64url');
const randomId = (prefix: string) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

function signJwt(payload: Record<string, unknown>, expiresInSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
    iss: 'samsam-bff',
  };
  const header = { alg: 'HS256', typ: 'JWT' };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(body))}`;
  const signature = crypto.createHmac('sha256', config.jwtSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function verifyAccessToken(token: string): { userId: string; provider?: SocialProvider } | undefined {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return undefined;
  }

  const [encodedHeader, encodedBody, signature] = parts;
  const unsigned = `${encodedHeader}.${encodedBody}`;
  const expected = crypto.createHmac('sha256', config.jwtSecret).update(unsigned).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return undefined;
  }

  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
  const provider = socialProviderSchema.safeParse(payload.provider);
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return undefined;
  }
  if (typeof payload.sub !== 'string') {
    return undefined;
  }

  return {
    userId: payload.sub,
    provider: provider.success ? provider.data : undefined,
  };
}

async function verifyGoogleToken(accessToken: string): Promise<VerifiedSocialUser> {
  const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Google token verification failed');
  }
  const body: any = await response.json();
  return { providerUserId: String(body.sub), email: body.email, nickname: body.name };
}

async function verifyKakaoToken(accessToken: string): Promise<VerifiedSocialUser> {
  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Kakao token verification failed');
  }
  const body: any = await response.json();
  return {
    providerUserId: String(body.id),
    email: body.kakao_account?.email,
    nickname: body.kakao_account?.profile?.nickname,
  };
}

async function exchangeKakaoAuthorizationCode(authorizationCode: string, redirectUri?: string) {
  const resolvedRedirectUri = redirectUri || config.kakaoRedirectUri;
  if (!config.kakaoRestApiKey) {
    throw new Error('KAKAO_REST_API_KEY is not configured');
  }
  if (!resolvedRedirectUri) {
    throw new Error('KAKAO_REDIRECT_URI is not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.kakaoRestApiKey,
    redirect_uri: resolvedRedirectUri,
    code: authorizationCode,
  });
  if (config.kakaoClientSecret) {
    params.set('client_secret', config.kakaoClientSecret);
  }

  const response = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Kakao authorization code exchange failed: ${await response.text()}`);
  }

  const body: any = await response.json();
  if (!body.access_token) {
    throw new Error('Kakao token response did not include access_token');
  }
  return String(body.access_token);
}

async function exchangeGoogleAuthorizationCode(authorizationCode: string, redirectUri?: string) {
  const resolvedRedirectUri = redirectUri || config.googleRedirectUri;
  if (!config.googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }
  if (!resolvedRedirectUri) {
    throw new Error('GOOGLE_REDIRECT_URI is not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.googleClientId,
    redirect_uri: resolvedRedirectUri,
    code: authorizationCode,
  });
  if (config.googleClientSecret) {
    params.set('client_secret', config.googleClientSecret);
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Google authorization code exchange failed: ${await response.text()}`);
  }

  const body: any = await response.json();
  if (!body.access_token) {
    throw new Error('Google token response did not include access_token');
  }
  return String(body.access_token);
}

async function verifyNaverToken(accessToken: string): Promise<VerifiedSocialUser> {
  const response = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Naver token verification failed');
  }
  const body: any = await response.json();
  return {
    providerUserId: String(body.response?.id),
    email: body.response?.email,
    nickname: body.response?.nickname,
  };
}

export async function verifySocialToken(provider: SocialProvider, accessToken: string): Promise<VerifiedSocialUser> {
  if (config.socialAuthMode === 'mock' && accessToken.startsWith('mock:')) {
    const providerUserId = accessToken.slice('mock:'.length) || `${provider}-tester`;
    return {
      providerUserId,
      email: `${providerUserId}@local.samsam`,
      nickname: `${provider.toUpperCase()} 테스트 회원`,
    };
  }

  if (provider === 'google') {
    return verifyGoogleToken(accessToken);
  }
  if (provider === 'kakao') {
    return verifyKakaoToken(accessToken);
  }
  return verifyNaverToken(accessToken);
}

export async function loginWithSocial(input: z.infer<typeof socialLoginSchema>) {
  const provider = input.provider;
  let accessToken = input.accessToken;
  if (!accessToken && input.authorizationCode) {
    if (provider === 'kakao') {
      accessToken = await exchangeKakaoAuthorizationCode(input.authorizationCode, input.redirectUri);
    } else if (provider === 'google') {
      accessToken = await exchangeGoogleAuthorizationCode(input.authorizationCode, input.redirectUri);
    } else {
      throw new Error('authorizationCode login is not supported for this provider');
    }
  }
  if (!accessToken) {
    throw new Error('accessToken is required');
  }

  const verified = await verifySocialToken(provider, accessToken);
  if (!verified.providerUserId) {
    throw new Error('Social provider did not return a user id');
  }

  const data = await readAuthData();
  const now = new Date().toISOString();
  let socialAccount = data.socialAccounts.find(
    (account) => account.provider === provider && account.providerUserId === verified.providerUserId,
  );
  let user = socialAccount ? data.users.find((item) => item.id === socialAccount?.userId) : undefined;

  if (!user) {
    user = {
      id: randomId('usr'),
      nickname: verified.nickname || `${provider.toUpperCase()} 회원`,
      email: verified.email,
      createdAt: now,
      updatedAt: now,
    };
    data.users.push(user);
  } else {
    user.nickname = verified.nickname || user.nickname;
    user.email = verified.email ?? user.email;
    user.updatedAt = now;
  }

  if (!socialAccount) {
    socialAccount = {
      id: randomId('soc'),
      userId: user.id,
      provider,
      providerUserId: verified.providerUserId,
      email: verified.email,
      nickname: verified.nickname,
      createdAt: now,
      updatedAt: now,
    };
    data.socialAccounts.push(socialAccount);
  } else {
    socialAccount.email = verified.email ?? socialAccount.email;
    socialAccount.nickname = verified.nickname ?? socialAccount.nickname;
    socialAccount.updatedAt = now;
  }

  const accessJwt = signJwt({ sub: user.id, provider }, 60 * 60);
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  data.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    createdAt: now,
  });
  await writeAuthData(data);

  return {
    user,
    socialAccount: {
      provider: socialAccount.provider,
      providerUserId: socialAccount.providerUserId,
    },
    accessToken: accessJwt,
    refreshToken,
    expiresIn: 3600,
  };
}
