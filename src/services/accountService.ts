import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'samsam.account.profile.v1';
const USAGE_KEY = 'samsam.inspection.usage.v1';

export type SocialProvider = 'google' | 'kakao' | 'naver';

export type AccountProfile = {
  mode: 'guest' | 'member';
  provider?: SocialProvider;
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

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const defaultProfile = (): AccountProfile => ({
  mode: 'guest',
  nickname: '비회원',
});

const limitForProfile = (profile: AccountProfile) => (profile.mode === 'member' ? 100 : 10);

export async function loadAccountState(): Promise<AccountState> {
  const today = getTodayKey();
  const [rawProfile, rawUsage] = await Promise.all([AsyncStorage.getItem(PROFILE_KEY), AsyncStorage.getItem(USAGE_KEY)]);

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

  try {
    if (rawUsage) {
      const parsed = JSON.parse(rawUsage);
      if (parsed?.date === today && typeof parsed?.count === 'number') {
        usage = { date: today, count: parsed.count };
      }
    }
  } catch {
    usage = { date: today, count: 0 };
  }

  if (usage.date !== today) {
    usage = { date: today, count: 0 };
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(usage));
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
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  const nextState = await loadAccountState();
  return { allowed: true, state: nextState };
}

export async function signInWithSocial(provider: SocialProvider): Promise<AccountState> {
  const providerNames: Record<SocialProvider, string> = {
    google: 'Google',
    kakao: 'Kakao',
    naver: 'Naver',
  };
  const profile: AccountProfile = {
    mode: 'member',
    provider,
    nickname: `${providerNames[provider]} 회원`,
    email: '',
    joinedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return loadAccountState();
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
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(defaultProfile()));
  return loadAccountState();
}
