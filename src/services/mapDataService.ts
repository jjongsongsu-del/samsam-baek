const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export type MapCategory = 'cultivation' | 'seller' | 'certified';

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

export async function fetchMapData(category: MapCategory, q?: string): Promise<MapDataItem[]> {
  const params = new URLSearchParams({ category });
  if (q?.trim()) {
    params.set('q', q.trim());
  }
  const response = await fetch(`${API_BASE_URL}/v1/map-data?${params.toString()}`);
  if (!response.ok) {
    throw new Error('지도 데이터를 불러오지 못했습니다.');
  }
  const body = await response.json();
  return Array.isArray(body.items) ? body.items : [];
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
