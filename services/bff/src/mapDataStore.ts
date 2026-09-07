import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

export const mapCategorySchema = z.enum(['cultivation', 'seller', 'certified', 'tour']);
export type MapCategory = z.infer<typeof mapCategorySchema>;

export type MapDataItem = {
  id: string;
  category: MapCategory;
  title: string;
  subtitle?: string;
  address?: string;
  phone?: string;
  description?: string;
  website?: string;
  imageUrl?: string;
  details?: string[];
  tags: string[];
  metrics?: Record<string, string | number>;
  sourceFile?: string;
  updatedAt: string;
};

type MapDataFile = {
  items: MapDataItem[];
};

export const mapImportSchema = z.object({
  category: mapCategorySchema,
  fileName: z.string().min(1),
  csvText: z.string().min(1).optional(),
  csvBase64: z.string().min(1).optional(),
  encoding: z.enum(['utf8', 'euc-kr']).optional(),
  region: z.enum(['금산', '파주']).optional(),
}).refine((body) => body.csvText || body.csvBase64, {
  message: 'csvText or csvBase64 is required',
});

const dataDir = path.resolve('data');
const dataFile = path.join(dataDir, 'map-data.json');

const headersByCategory: Record<MapCategory, string[]> = {
  cultivation: ['읍면', '지역', '행정리', '소재지', '주소', '필지소재지', '경작지주소', '연근', '년근', '경작년근', '신고면적', '실제면적', '경작면적', '면적', '연근시작년도', '계약구분', '계약', '삼포'],
  seller: ['업체명', '업체전화번호', '업체주소', '취급제품', '취급제품설명'],
  certified: ['제품명', '식품구분', '제품유형', '업체명', '업체주소', '연락처', '인증일자', '인증만료일자'],
  tour: ['관광지명', '명칭', '이름', '주소', '소재지', '전화번호', '연락처', '분류', '설명', '내용'],
};

const normalize = (value: unknown) => String(value ?? '').trim();

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
}

function firstValue(row: Record<string, string>, candidates: string[]) {
  const key = candidates.find((candidate) => normalize(row[candidate]));
  return key ? normalize(row[key]) : '';
}

function formatArea(value: string) {
  if (!value) {
    return '';
  }
  const numeric = Number(value.replace(/,/g, ''));
  if (Number.isFinite(numeric) && numeric > 0) {
    return `${numeric.toLocaleString('ko-KR')}㎡`;
  }
  return value;
}

function inferCultivationRegion(row: Record<string, string>, address: string, regionHint?: '금산' | '파주') {
  if (regionHint) {
    return regionHint;
  }
  const joined = [address, firstValue(row, ['시군', '지역', '소재지'])].join(' ');
  if (joined.includes('파주')) {
    return '파주';
  }
  return '금산';
}

function normalizeCultivation(row: Record<string, string>, index: number, fileName: string, updatedAt: string, regionHint?: '금산' | '파주'): MapDataItem {
  const address = firstValue(row, ['소재지', '주소', '필지소재지', '경작지주소']).replace(/^\[\d{3}-\d{3}\]\s*/, '');
  const dataRegion = inferCultivationRegion(row, address, regionHint);
  const district = firstValue(row, ['읍면', '지역', '읍·면', '읍/면']);
  const village = firstValue(row, ['행정리', '리', '마을']);
  const pajuMatch = address.match(/파주시\s+([^\s]+)\s+([^\s]+)/);
  const region = dataRegion === '파주' ? '파주' : district || '금산군';
  const localName = dataRegion === '파주' ? [pajuMatch?.[1], pajuMatch?.[2]].filter(Boolean).join(' ') : village;
  const cropYear = firstValue(row, ['연근', '년근', '경작년근']);
  const reportedArea = firstValue(row, ['신고면적', '신고 경작면적', '경작면적']);
  const actualArea = firstValue(row, ['실제면적', '실재 경작면적', '실제 경작면적']);
  const area = firstValue(row, ['면적']);
  const plantingYear = firstValue(row, ['연근시작년도']);
  const contractType = firstValue(row, ['계약구분']);
  const contract = firstValue(row, ['계약']);
  const status = firstValue(row, ['삼포']);
  const cropYearLabel = cropYear && !cropYear.endsWith('년근') ? `${cropYear}년근` : cropYear;

  return {
    id: `cultivation-${dataRegion}-${index + 1}`,
    category: 'cultivation',
    title: localName ? `${region} ${localName}` : `${region} 인삼 경작지`,
    subtitle: cropYearLabel ? `${cropYearLabel} 경작지` : '인삼 경작지',
    address: address || `${region} 인삼 경작지`,
    description: [reportedArea ? `신고면적 ${reportedArea}` : '', actualArea ? `실제면적 ${actualArea}` : '', area ? `면적 ${formatArea(area)}` : '', plantingYear ? `연근시작년도 ${plantingYear}` : '', contract || contractType].filter(Boolean).join(' / '),
    details: [status ? `삼포: ${status}` : '', contractType ? `계약구분: ${contractType}` : '', contract ? `계약: ${contract}` : ''].filter(Boolean),
    tags: [dataRegion, region, localName, cropYearLabel, '경작지'].filter(Boolean),
    metrics: {
      region: dataRegion,
      cropYear: cropYearLabel || '-',
      reportedArea: reportedArea || '-',
      actualArea: actualArea || '-',
      area: area ? formatArea(area) : '-',
      plantingYear: plantingYear || '-',
    },
    sourceFile: fileName,
    updatedAt,
  };
}

function normalizeSeller(row: Record<string, string>, index: number, fileName: string, updatedAt: string): MapDataItem {
  const name = firstValue(row, ['업체명']) || `판매업체 ${index + 1}`;
  const product = firstValue(row, ['취급제품']);
  return {
    id: `seller-${index + 1}`,
    category: 'seller',
    title: name,
    subtitle: product || '인삼관련제품 판매업체',
    address: firstValue(row, ['업체주소']),
    phone: firstValue(row, ['업체전화번호', '연락처']),
    description: firstValue(row, ['취급제품설명']),
    tags: [name, product, '판매업체'].filter(Boolean),
    sourceFile: fileName,
    updatedAt,
  };
}

function normalizeCertified(row: Record<string, string>, index: number, fileName: string, updatedAt: string): MapDataItem {
  const product = firstValue(row, ['제품명']) || `금홍인증제품 ${index + 1}`;
  const company = firstValue(row, ['업체명']);
  return {
    id: `certified-${index + 1}`,
    category: 'certified',
    title: product,
    subtitle: company || '금홍인증제품',
    address: firstValue(row, ['업체주소']),
    phone: firstValue(row, ['연락처', '업체전화번호']),
    description: [firstValue(row, ['식품구분']), firstValue(row, ['제품유형'])].filter(Boolean).join(' / '),
    tags: [product, company, firstValue(row, ['제품유형']), '금홍인증'].filter(Boolean),
    metrics: {
      certifiedAt: firstValue(row, ['인증일자']) || '-',
      expiresAt: firstValue(row, ['인증만료일자']) || '-',
    },
    sourceFile: fileName,
    updatedAt,
  };
}

function normalizeTour(row: Record<string, string>, index: number, fileName: string, updatedAt: string): MapDataItem {
  const title = firstValue(row, ['관광지명', '명칭', '이름', '장소명']) || `관광지 ${index + 1}`;
  const tourType = firstValue(row, ['분류', '유형', '구분']);
  const description = firstValue(row, ['설명', '내용', '소개']);
  const details = firstValue(row, ['상세정보', '상세', '세부내용', '비고', 'details']);
  return {
    id: `tour-${index + 1}`,
    category: 'tour',
    title,
    subtitle: tourType || '금산 인삼 관광지',
    address: firstValue(row, ['주소', '소재지', '위치']),
    phone: firstValue(row, ['전화번호', '연락처', '문의']),
    description,
    website: firstValue(row, ['홈페이지', 'URL', 'url', 'website']),
    imageUrl: firstValue(row, ['이미지', '이미지URL', 'imageUrl', 'image']),
    details: details ? details.split(/\s*[|;]\s*/).filter(Boolean) : undefined,
    tags: [title, tourType, '관광지', '인삼관광'].filter(Boolean),
    sourceFile: fileName,
    updatedAt,
  };
}

function normalizeRows(category: MapCategory, fileName: string, rows: Record<string, string>[], regionHint?: '금산' | '파주') {
  const updatedAt = new Date().toISOString();
  return rows
    .filter((row) => headersByCategory[category].some((header) => normalize(row[header])))
    .map((row, index) => {
      if (category === 'seller') {
        return normalizeSeller(row, index, fileName, updatedAt);
      }
      if (category === 'certified') {
        return normalizeCertified(row, index, fileName, updatedAt);
      }
      if (category === 'tour') {
        return normalizeTour(row, index, fileName, updatedAt);
      }
      return normalizeCultivation(row, index, fileName, updatedAt, regionHint);
    });
}

async function readData(): Promise<MapDataFile> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

async function writeData(data: MapDataFile) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

function decodeCsvBase64(csvBase64: string, encoding?: 'utf8' | 'euc-kr') {
  const bytes = Buffer.from(csvBase64, 'base64');
  if (encoding) {
    return new TextDecoder(encoding).decode(bytes);
  }
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  return utf8.includes('�') ? new TextDecoder('euc-kr').decode(bytes) : utf8;
}


function itemRegion(item: MapDataItem) {
  const metricRegion = typeof item.metrics?.region === 'string' ? item.metrics.region : '';
  const haystack = [metricRegion, item.title, item.subtitle, item.address, item.description, ...item.tags].filter(Boolean).join(' ');
  if (haystack.includes('파주')) {
    return '파주';
  }
  if (haystack.includes('금산')) {
    return '금산';
  }
  return '';
}

export async function listMapData(options: { category?: MapCategory; q?: string; region?: '금산' | '파주'; limit?: number; offset?: number }) {
  const data = await readData();
  const query = normalize(options.q).toLowerCase();
  const filtered = data.items.filter((item) => {
    if (options.category && item.category !== options.category) {
      return false;
    }
    if (options.region && itemRegion(item) !== options.region) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [item.title, item.subtitle, item.address, item.phone, item.description, item.website, ...(item.details ?? []), ...item.tags, ...Object.values(item.metrics ?? {})]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = Math.min(Math.max(1, Math.floor(options.limit ?? 50)), 200);
  const items = filtered.slice(offset, offset + limit);
  return {
    items,
    total: filtered.length,
    limit,
    offset,
    hasMore: offset + items.length < filtered.length,
  };
}

export async function importMapData(input: z.infer<typeof mapImportSchema>) {
  const csvText = input.csvText ?? decodeCsvBase64(input.csvBase64 ?? '', input.encoding);
  const rows = parseCsv(csvText);
  const nextItems = normalizeRows(input.category, input.fileName, rows, input.region);
  const current = await readData();
  const items = input.category === 'cultivation' && input.region
    ? [...current.items.filter((item) => item.category !== input.category || itemRegion(item) !== input.region), ...nextItems]
    : [...current.items.filter((item) => item.category !== input.category), ...nextItems];
  await writeData({ items });
  return {
    category: input.category,
    imported: nextItems.length,
    total: items.length,
    region: input.region,
    fileName: input.fileName,
  };
}
