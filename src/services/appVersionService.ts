const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
const APP_VERSION_TIMEOUT_MS = 5000;

export type AppVersionPolicy = {
  latestVersion: string;
  latestVersionCode: number;
  minimumVersionCode: number;
  updateRequired: boolean;
  forceUpdate: boolean;
  storeUrl: string;
  message: string;
};

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

export async function fetchAppVersionPolicy(currentVersionCode: number, currentVersion?: string) {
  const params = new URLSearchParams({
    platform: 'android',
    currentVersionCode: String(currentVersionCode || 0),
  });
  if (currentVersion) {
    params.set('currentVersion', currentVersion);
  }

  const { controller, timeout } = withTimeout(APP_VERSION_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/v1/app-version?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error('앱 버전 정보를 확인할 수 없습니다.');
    }

    const payload = await response.json();
    return {
      latestVersion: String(payload.latestVersion ?? ''),
      latestVersionCode: Number(payload.latestVersionCode ?? 0),
      minimumVersionCode: Number(payload.minimumVersionCode ?? 0),
      updateRequired: Boolean(payload.updateRequired),
      forceUpdate: Boolean(payload.forceUpdate),
      storeUrl: String(payload.storeUrl ?? ''),
      message: String(payload.message ?? '새 버전이 있습니다. 업데이트 후 이용해 주세요.'),
    } satisfies AppVersionPolicy;
  } finally {
    clearTimeout(timeout);
  }
}