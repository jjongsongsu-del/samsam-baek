import AsyncStorage from '@react-native-async-storage/async-storage';

const USAGE_KEY = 'samsam.inspection.usage.v1';
const UNLIMITED_DAILY_LIMIT = Number.MAX_SAFE_INTEGER;

export type AccountProfile = {
  mode: 'guest';
  nickname: string;
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
  nickname: '사용자',
});

export async function loadAccountState(): Promise<AccountState> {
  const today = getTodayKey();
  let usage: DailyUsage = { date: today, count: 0 };

  try {
    const rawUsage = await AsyncStorage.getItem(USAGE_KEY);
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

  return {
    profile: defaultProfile(),
    usage,
    limit: UNLIMITED_DAILY_LIMIT,
    remaining: UNLIMITED_DAILY_LIMIT,
  };
}

export async function consumeInspectionUse() {
  const state = await loadAccountState();
  const usage = { ...state.usage, count: state.usage.count + 1 };
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  const nextState = await loadAccountState();
  return { allowed: true, state: nextState };
}
