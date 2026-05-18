const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export type EncyclopediaEntry = {
  id: string;
  category: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  updatedAt: string;
};

export type EncyclopediaResponse = {
  items: EncyclopediaEntry[];
  categories: string[];
  fromFallback: boolean;
};

export async function fetchEncyclopediaEntries(options: { category?: string; q?: string }) {
  const params = new URLSearchParams();
  if (options.category && options.category !== '전체') {
    params.set('category', options.category);
  }
  if (options.q?.trim()) {
    params.set('q', options.q.trim());
  }

  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/v1/encyclopedia${query ? `?${query}` : ''}`);
  if (!response.ok) {
    throw new Error('백과사전 서버 응답을 확인할 수 없습니다.');
  }

  const payload = await response.json();
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    fromFallback: false,
  } satisfies EncyclopediaResponse;
}

export async function askEncyclopediaAssistant(question: string, entryId?: string) {
  const response = await fetch(`${API_BASE_URL}/v1/encyclopedia/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, entryId }),
  });
  if (!response.ok) {
    throw new Error('삼박사 설명 서버에 연결할 수 없습니다.');
  }

  const payload = await response.json();
  return String(payload.answer ?? '');
}

export async function fetchGoogleAiSearchAnswer(query: string) {
  const response = await fetch(`${API_BASE_URL}/v1/search/google-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    throw new Error('Google AI 검색 결과를 불러올 수 없습니다.');
  }

  const payload = await response.json();
  return String(payload.answer ?? payload.summary ?? '');
}

export function makeGoogleAiSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
