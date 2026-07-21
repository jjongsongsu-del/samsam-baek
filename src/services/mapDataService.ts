const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export type MapCategory = 'cultivation' | 'seller' | 'certified' | 'tour';

export type MapDataItem = {
  id: string;
  category: MapCategory;
  title: string;
  subtitle?: string;
  address?: string;
  phone?: string;
  description?: string;
  tags: string[];
  metrics?: Record<string, string | number>;
  sourceFile?: string;
  updatedAt: string;
};

export type MapImportResult = {
  category: MapCategory;
  imported: number;
  total: number;
  fileName: string;
};

export type MapDataPage = {
  items: MapDataItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export async function fetchMapData(category: MapCategory, q?: string, limit = 50, offset = 0): Promise<MapDataPage> {
  const params = new URLSearchParams({ category });
  if (q?.trim()) {
    params.set('q', q.trim());
  }
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  const response = await fetch(`${API_BASE_URL}/v1/map-data?${params.toString()}`);
  if (!response.ok) {
    throw new Error('지도 데이터를 불러오지 못했습니다.');
  }
  const body = await response.json();
  const items = Array.isArray(body.items) ? body.items : [];
  return {
    items,
    total: Number(body.total ?? items.length),
    limit: Number(body.limit ?? limit),
    offset: Number(body.offset ?? offset),
    hasMore: Boolean(body.hasMore),
  };
}

export async function importMapCsv(category: MapCategory, fileName: string, csvBase64: string, adminToken: string): Promise<MapImportResult> {
  const response = await fetch(`${API_BASE_URL}/v1/admin/map-data/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ category, fileName, csvBase64 }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'CSV 반영에 실패했습니다.');
  }
  return response.json();
}
