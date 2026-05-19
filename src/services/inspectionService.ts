import { loadAuthTokens } from './accountService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export type DetectionBox = {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type InspectionResult = {
  year: string;
  grade: string;
  confidence?: number;
  boxes?: DetectionBox[];
  priceGradeCode?: string;
};

export class InspectionServiceError extends Error {
  status?: number;
  code: 'network' | 'timeout' | 'limit' | 'invalid-image' | 'server' | 'unavailable' | 'unknown';

  constructor(message: string, code: InspectionServiceError['code'], status?: number) {
    super(message);
    this.name = 'InspectionServiceError';
    this.code = code;
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 30000;

const makeServiceError = async (response: Response) => {
  const message = await response.text();
  if (response.status === 429) {
    return new InspectionServiceError(message || '오늘 판독 가능 횟수를 모두 사용했습니다.', 'limit', response.status);
  }
  if (response.status === 422) {
    return new InspectionServiceError(message || '사진에서 인삼을 판독하기 어렵습니다. 범위를 다시 지정해 주세요.', 'invalid-image', response.status);
  }
  if (response.status === 503) {
    return new InspectionServiceError(message || 'AI 서버가 잠시 혼잡합니다. 잠시 후 다시 시도해 주세요.', 'unavailable', response.status);
  }
  if (response.status >= 500) {
    return new InspectionServiceError(message || 'AI 서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'server', response.status);
  }
  return new InspectionServiceError(message || 'AI 서버 응답을 확인할 수 없습니다.', 'unknown', response.status);
};

export async function inspectGinsengImage(base64Image: string, source = 'mobile-camera'): Promise<InspectionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    const tokens = await loadAuthTokens();
    response = await fetch(`${API_BASE_URL}/v1/diagnoses/ginseng`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        imageBase64: base64Image,
        source,
      }),
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new InspectionServiceError('AI 서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.', 'timeout');
    }
    throw new InspectionServiceError('AI 서버에 연결할 수 없습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.', 'network');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw await makeServiceError(response);
  }

  const payload = await response.json();
  return {
    year: payload.year ?? payload.age ?? '판독 불가',
    grade: payload.grade ?? '판독 불가',
    confidence: typeof payload.confidence === 'number' ? payload.confidence : undefined,
    boxes: Array.isArray(payload.boxes) ? payload.boxes : undefined,
    priceGradeCode: payload.priceGradeCode,
  };
}
