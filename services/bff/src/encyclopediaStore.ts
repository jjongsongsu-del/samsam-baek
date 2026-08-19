import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

export const encyclopediaEntrySchema = z.object({
  id: z.string().min(1).optional(),
  category: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().min(1),
  tags: z.array(z.string()).default([]),
  sourceName: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  caution: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type EncyclopediaEntry = z.infer<typeof encyclopediaEntrySchema> & {
  id: string;
  updatedAt: string;
};

const dataDir = path.resolve('data');
const dataFile = path.join(dataDir, 'encyclopedia.json');
const seedFiles = [path.resolve('seed-data', 'encyclopedia.json'), path.resolve('data', 'encyclopedia.json')];

const emergencyDefaultEntries: EncyclopediaEntry[] = [
  {
    id: 'ginseng-basics',
    category: '기초',
    title: '인삼 기본 정보',
    summary: '인삼의 종류, 재배, 품질, 섭취 정보를 백과 형태로 제공합니다.',
    body: '서버의 백과 데이터 파일을 읽을 수 없을 때 표시되는 최소 기본 항목입니다. 운영 환경에서는 services/bff/data/encyclopedia.json 시드 파일을 기준으로 초기화됩니다.',
    tags: ['인삼', '백과', '기초'],
    sourceName: '삼삼백과',
    caution: '백과 정보는 일반 정보이며 공식 감정이나 의료 조언을 대체하지 않습니다.',
    updatedAt: new Date(0).toISOString(),
  },
];

function normalizeEntry(input: unknown, index: number): EncyclopediaEntry | undefined {
  const parsed = encyclopediaEntrySchema.safeParse(input);
  if (!parsed.success) {
    return undefined;
  }

  return {
    ...parsed.data,
    id: parsed.data.id ?? `encyclopedia-${index + 1}`,
    updatedAt: parsed.data.updatedAt ?? new Date(0).toISOString(),
  };
}

async function readEntriesFromFile(filePath: string): Promise<EncyclopediaEntry[] | undefined> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return undefined;
    }

    const entries = parsed
      .map((entry, index) => normalizeEntry(entry, index))
      .filter((entry): entry is EncyclopediaEntry => Boolean(entry));

    return entries.length ? entries : undefined;
  } catch {
    return undefined;
  }
}

async function readDefaultEntries() {
  for (const filePath of seedFiles) {
    const entries = await readEntriesFromFile(filePath);
    if (entries) {
      return entries;
    }
  }

  return emergencyDefaultEntries;
}

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    const defaults = await readDefaultEntries();
    await fs.writeFile(dataFile, JSON.stringify(defaults, null, 2), 'utf8');
  }
}

export async function readEncyclopediaEntries(): Promise<EncyclopediaEntry[]> {
  await ensureDataFile();
  return (await readEntriesFromFile(dataFile)) ?? (await readDefaultEntries());
}

async function writeEncyclopediaEntries(entries: EncyclopediaEntry[]) {
  await ensureDataFile();
  await fs.writeFile(dataFile, JSON.stringify(entries, null, 2), 'utf8');
}

export async function listEncyclopediaEntries(options: { category?: string; q?: string }) {
  const entries = await readEncyclopediaEntries();
  const category = options.category?.trim();
  const query = options.q?.trim().toLowerCase();

  return entries.filter((entry) => {
    const categoryMatch = !category || category === '전체' || entry.category === category;
    const queryMatch =
      !query ||
      [entry.title, entry.summary, entry.body, entry.category, ...entry.tags].some((value) =>
        value.toLowerCase().includes(query),
      );
    return categoryMatch && queryMatch;
  });
}

export async function createEncyclopediaEntry(input: z.infer<typeof encyclopediaEntrySchema>) {
  const entries = await readEncyclopediaEntries();
  const now = new Date().toISOString();
  const entry: EncyclopediaEntry = {
    ...input,
    tags: input.tags ?? [],
    id: input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    updatedAt: now,
  };
  await writeEncyclopediaEntries([entry, ...entries]);
  return entry;
}

export async function updateEncyclopediaEntry(id: string, input: z.infer<typeof encyclopediaEntrySchema>) {
  const entries = await readEncyclopediaEntries();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) {
    return undefined;
  }

  const updated: EncyclopediaEntry = {
    ...entries[index],
    ...input,
    tags: input.tags ?? entries[index].tags,
    id,
    updatedAt: new Date().toISOString(),
  };
  entries[index] = updated;
  await writeEncyclopediaEntries(entries);
  return updated;
}

export async function deleteEncyclopediaEntry(id: string) {
  const entries = await readEncyclopediaEntries();
  const nextEntries = entries.filter((entry) => entry.id !== id);
  if (nextEntries.length === entries.length) {
    return false;
  }
  await writeEncyclopediaEntries(nextEntries);
  return true;
}

export function explainWithSambaksa(question: string, entries: EncyclopediaEntry[]) {
  const normalized = question.trim().toLowerCase();
  const matched =
    entries.find((entry) => [entry.title, entry.category, ...entry.tags].some((value) => normalized.includes(value.toLowerCase()))) ??
    entries[0];

  if (!matched) {
    return '삼박사가 답할 백과 내용이 아직 없습니다. 서버에 백과 항목을 먼저 등록해 주세요.';
  }

  const caution = matched.caution ? ` 다만 ${matched.caution}` : '';
  return `삼박사 설명: ${matched.title} 항목을 기준으로 보면, ${matched.summary} ${matched.body}${caution}`;
}
