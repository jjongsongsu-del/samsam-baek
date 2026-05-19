import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
export const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
export const KAKAO_REDIRECT_SCHEME = 'kr.samsambaekgwa.app';
export const KAKAO_REDIRECT_PATH = 'oauth/kakao';
export const GOOGLE_REDIRECT_PATH = 'oauth/google';
const PROFILE_KEY = 'samsam.account.profile.v1';
const USAGE_KEY = 'samsam.inspection.usage.v1';
const AUTH_TOKEN_KEY = 'samsam.account.tokens.v1';

export type SocialProvider = 'google' | 'kakao' | 'naver';

export type AccountProfile = {
  mode: 'guest' | 'member';
  id?: string;
  provider?: SocialProvider;
  providerUserId?: string;
  nickname: string;
  email?: string;
  joinedAt?: string;
};

export type DailyUsage = {
  date: string;
  count: number;
};

export type AccountState = {
  profile: AccountProfile;
  usage: DailyUsage;
  limit: number;
  remaining: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const defaultProfile = (): AccountProfile => ({
  mode: 'guest',
  nickname: '비회원',
});

const limitForProfile = (profile: AccountProfile) => (profile.mode === 'member' ? 100 : 10);

const usageKeyForProfile = (profile: AccountProfile) => {
  if (profile.mode === 'member' && profile.provider && profile.providerUserId) {
    return `${USAGE_KEY}.${profile.provider}.${profile.providerUserId}`;
  }

  return `${USAGE_KEY}.guest`;
};

export async function loadAccountState(): Promise<AccountState> {
  const today = getTodayKey();
  const rawProfile = await AsyncStorage.getItem(PROFILE_KEY);

  let profile = defaultProfile();
  let usage: DailyUsage = { date: today, count: 0 };

  try {
    if (rawProfile) {
      const parsed = JSON.parse(rawProfile);
      if (parsed?.mode === 'member' || parsed?.mode === 'guest') {
        profile = { ...profile, ...parsed };
      }
    }
  } catch {
    profile = defaultProfile();
  }

  const usageKey = usageKeyForProfile(profile);
  const [rawUsage, legacyRawUsage] = await Promise.all([
    AsyncStorage.getItem(usageKey),
    usageKey === `${USAGE_KEY}.guest` ? AsyncStorage.getItem(USAGE_KEY) : Promise.resolve(null),
  ]);

  try {
    const raw = rawUsage ?? legacyRawUsage;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.date === today && typeof parsed?.count === 'number') {
        usage = { date: today, count: parsed.count };
      }
    }
  } catch {
    usage = { date: today, count: 0 };
  }

  if (usage.date !== today) {
    usage = { date: today, count: 0 };
    await AsyncStorage.setItem(usageKey, JSON.stringify(usage));
  } else if (!rawUsage && legacyRawUsage) {
    await AsyncStorage.setItem(usageKey, JSON.stringify(usage));
  }

  const limit = limitForProfile(profile);
  return {
    profile,
    usage,
    limit,
    remaining: Math.max(limit - usage.count, 0),
  };
}

export async function consumeInspectionUse() {
  const state = await loadAccountState();
  if (state.usage.count >= state.limit) {
    return { allowed: false, state };
  }

  const usage = { ...state.usage, count: state.usage.count + 1 };
  await AsyncStorage.setItem(usageKeyForProfile(state.profile), JSON.stringify(usage));
  const nextState = await loadAccountState();
  return { allowed: true, state: nextState };
}

export async function loadAuthTokens(): Promise<AuthTokens | undefined> {
  const raw = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.accessToken === 'string') {
      return parsed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function refreshServerAccountUsage(): Promise<AccountState> {
  const state = await loadAccountState();
  if (state.profile.mode !== 'member') {
    return state;
  }

  const tokens = await loadAuthTokens();
  if (!tokens?.accessToken) {
    return state;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/v1/me/usage`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) {
      return state;
    }
    const body = await response.json();
    const usage = {
      date: String(body.usage?.date ?? state.usage.date),
      count: Number(body.usage?.count ?? state.usage.count),
    };
    await AsyncStorage.setItem(usageKeyForProfile(state.profile), JSON.stringify(usage));
    return loadAccountState();
  } catch {
    return state;
  }
}

async function persistSocialLogin(provider: SocialProvider, body: any): Promise<AccountState> {
  const profile: AccountProfile = {
    mode: 'member',
    id: body.user.id,
    provider,
    providerUserId: body.socialAccount.providerUserId,
    nickname: body.user.nickname,
    email: body.user.email ?? '',
    joinedAt: body.user.createdAt,
  };
  await Promise.all([
    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)),
    AsyncStorage.setItem(
      AUTH_TOKEN_KEY,
      JSON.stringify({
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        expiresIn: body.expiresIn,
      } satisfies AuthTokens),
    ),
  ]);
  return loadAccountState();
}

export async function signInWithSocial(provider: SocialProvider, socialAccessToken = `mock:${provider}-tester`): Promise<AccountState> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, accessToken: socialAccessToken }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '로그인에 실패했습니다.');
  }

  const body = await response.json();
  return persistSocialLogin(provider, body);
}

export async function signInWithKakaoAuthorizationCode(authorizationCode: string, redirectUri: string): Promise<AccountState> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'kakao',
      authorizationCode,
      redirectUri,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Kakao login failed.');
  }

  const body = await response.json();
  return persistSocialLogin('kakao', body);
}

export async function signInWithGoogleAuthorizationCode(authorizationCode: string, redirectUri: string): Promise<AccountState> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'google',
      authorizationCode,
      redirectUri,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Google login failed.');
  }

  const body = await response.json();
  return persistSocialLogin('google', body);
}

export async function updateAccountProfile(patch: Pick<AccountProfile, 'nickname' | 'email'>): Promise<AccountState> {
  const state = await loadAccountState();
  const profile = {
    ...state.profile,
    nickname: patch.nickname.trim() || state.profile.nickname,
    email: patch.email?.trim(),
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return loadAccountState();
}

export async function signOutAccount(): Promise<AccountState> {
  await Promise.all([AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(defaultProfile())), AsyncStorage.removeItem(AUTH_TOKEN_KEY)]);
  return loadAccountState();
}
