import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
const ADMIN_SESSION_KEY = 'samsam.admin.session.v1';

export type AdminSession = {
  username: string;
  accessToken: string;
  expiresAt: string;
};

export async function loadAdminSession(): Promise<AdminSession | null> {
  const raw = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const session = JSON.parse(raw) as AdminSession;
    if (!session.accessToken || new Date(session.expiresAt).getTime() <= Date.now()) {
      await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

export async function signInAdmin(username: string, password: string): Promise<AdminSession> {
  const response = await fetch(`${API_BASE_URL}/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error('관리자 계정 정보를 확인해 주세요.');
  }
  const session = (await response.json()) as AdminSession;
  await AsyncStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function signOutAdmin() {
  await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
}
