import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

export const mapCategorySchema = z.enum(['cultivation', 'seller', 'certified']);
export type MapCategory = z.infer<typeof mapCategorySchema>;

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

type MapDataFile = {
  items: MapDataItem[];
};

export const mapImportSchema = z.object({
  category: mapCategorySchema,
  fileName: z.string().min(1),
  csvText: z.string().min(1).optional(),
  csvBase64: z.string().min(1).optional(),
  encoding: z.enum(['utf8', 'euc-kr']).optional(),
}).refine((body) => body.csvText || body.csvBase64, {
  message: 'csvText or csvBase64 is required',
});

const dataDir = path.resolve('data');
const dataFile = path.join(dataDir, 'map-data.json');

const headersByCategory: Record<MapCategory, string[]> = {
  cultivation: ['읍면', '지역', '행정리', '소재지', '주소', '연근', '년근', '신고면적', '실제면적', '경작면적'],
  seller: ['업체명', '업체전화번호', '업체주소', '취급제품', '취급제품설명'],
  certified: ['제품명', '식품구분', '제품유형', '업체명', '업체주소', '연락처', '인증일자', '인증만료일자'],
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

function normalizeCultivation(row: Record<string, string>, index: number, fileName: string, updatedAt: string): MapDataItem {
  const region = firstValue(row, ['읍면', '지역', '읍·면', '읍/면']) || '금산군';
  const village = firstValue(row, ['행정리', '리', '마을']);
  const address = firstValue(row, ['소재지', '주소', '필지소재지']);
  const cropYear = firstValue(row, ['연근', '년근', '경작년근']);
  const reportedArea = firstValue(row, ['신고면적', '신고 경작면적', '경작면적']);
  const actualArea = firstValue(row, ['실제면적', '실재 경작면적', '실제 경작면적']);

  return {
    id: `cultivation-${index + 1}`,
    category: 'cultivation',
    title: village ? `${region} ${village}` : region,
    subtitle: cropYear ? `${cropYear}년근 경작지` : '인삼 경작지',
    address: address || `${region} 인삼 경작지`,
    description: [reportedArea ? `신고면적 ${reportedArea}` : '', actualArea ? `실제면적 ${actualArea}` : ''].filter(Boolean).join(' / '),
    tags: [region, cropYear ? `${cropYear}년근` : '', '경작지'].filter(Boolean),
    metrics: {
      cropYear: cropYear || '-',
      reportedArea: reportedArea || '-',
      actualArea: actualArea || '-',
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

function normalizeRows(category: MapCategory, fileName: string, rows: Record<string, string>[]) {
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
      return normalizeCultivation(row, index, fileName, updatedAt);
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

export async function listMapData(options: { category?: MapCategory; q?: string }) {
  const data = await readData();
  const query = normalize(options.q).toLowerCase();
  return data.items.filter((item) => {
    if (options.category && item.category !== options.category) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [item.title, item.subtitle, item.address, item.phone, item.description, ...item.tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
}

export async function importMapData(input: z.infer<typeof mapImportSchema>) {
  const csvText = input.csvText ?? decodeCsvBase64(input.csvBase64 ?? '', input.encoding);
  const rows = parseCsv(csvText);
  const nextItems = normalizeRows(input.category, input.fileName, rows);
  const current = await readData();
  const items = [...current.items.filter((item) => item.category !== input.category), ...nextItems];
  await writeData({ items });
  return {
    category: input.category,
    imported: nextItems.length,
    total: items.length,
    fileName: input.fileName,
  };
}
