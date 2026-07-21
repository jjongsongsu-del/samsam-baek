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
  updatedAt: z.string().optional(),
});

export type EncyclopediaEntry = z.infer<typeof encyclopediaEntrySchema> & {
  id: string;
  updatedAt: string;
};

const dataDir = path.resolve('data');
const dataFile = path.join(dataDir, 'encyclopedia.json');

const defaultEntries: EncyclopediaEntry[] = [
  {
    id: 'ginseng-basics',
    category: '기초',
    title: '고려인삼이란',
    summary: '고려인삼의 형태와 기본 구분을 이해합니다.',
    body:
      '고려인삼은 뿌리 형태와 주요 성분을 기준으로 구분하는 대표적인 인삼입니다. 소비자는 년근, 크기, 손상 여부, 보관 상태를 함께 살펴보면 품질을 더 쉽게 이해할 수 있습니다.',
    tags: ['기초', '고려인삼', '품질'],
    updatedAt: '2026-05-15T00:00:00.000Z',
  },
  {
    id: 'grade-standard',
    category: '등급',
    title: '수삼 표준 선별 기준',
    summary: '크기와 뿌리 상태에 따른 등급 차이를 봅니다.',
    body:
      '수삼 등급은 무게, 크기, 상처, 뿌리 발달 상태에 따라 달라집니다. AI 판독 결과는 대, 중, 소 등급 판단을 돕는 참고 정보이며 최종 거래 판단은 현장 품질 확인이 필요합니다.',
    tags: ['등급', '선별', '수삼'],
    updatedAt: '2026-05-15T00:00:00.000Z',
  },
  {
    id: 'storage-guide',
    category: '보관',
    title: '구매 후 보관 요령',
    summary: '신선도를 지키는 보관 방법입니다.',
    body:
      '수삼은 수분과 온도 관리가 중요합니다. 구매 후 흙과 수분 상태를 확인하고, 장기 보관 시에는 통풍과 냉장 상태를 관리해 품질 저하를 줄이는 것이 좋습니다.',
    tags: ['보관', '구매', '신선도'],
    updatedAt: '2026-05-15T00:00:00.000Z',
  },
  {
    id: 'health-note',
    category: '효능',
    title: '인삼의 효능과 주의',
    summary: '건강 정보는 참고용으로 살펴봅니다.',
    body:
      '인삼의 사포닌 성분은 피로 회복과 면역 조절 관련 연구가 많습니다. 다만 체질, 복용 목적, 복용 중인 약에 따라 주의가 필요하므로 의학적 판단을 대체하지 않습니다.',
    tags: ['효능', '주의', '건강'],
    updatedAt: '2026-05-15T00:00:00.000Z',
  },
  {
    id: 'ginseng-pharmacological-effects',
    category: '효능',
    title: '고려인삼의 약리효능',
    summary: '현대 연구에서 다뤄지는 고려인삼의 대표 효능을 살펴봅니다.',
    body:
      '고려인삼은 강장 소재로 알려져 있으며, 신체의 균형과 항상성 유지에 도움을 줄 수 있는지 다양한 연구가 이어져 왔습니다. 대표적으로 면역력 증진, 피로 개선, 항산화, 혈액 흐름, 기억력, 간 건강, 스트레스 대응 등과 관련된 연구 주제가 소개됩니다. 다만 백과의 효능 정보는 학습용 참고이며 질병의 진단이나 치료 판단은 의료 전문가와 상의해야 합니다.',
    tags: ['효능', '약리', '고려인삼', '건강정보'],
    updatedAt: '2026-07-21T00:00:00.000Z',
  },
  {
    id: 'ginseng-immune-fatigue',
    category: '효능',
    title: '면역력과 피로 개선',
    summary: '면역세포 활성, 항체 생성, 피로 회복과 관련된 내용을 정리합니다.',
    body:
      '고려인삼은 면역세포 활성, 자연살해세포 활성, 인터페론 및 항체 생성 등 면역 반응과 관련된 연구가 소개되어 있습니다. 또한 운동이나 스트레스 상황에서 피로 회복과 적응력을 돕는 소재로 다뤄져 왔습니다. 앱에서는 이러한 내용을 효능 이해를 위한 배경 정보로 제공하며, 개인의 건강 상태와 복용량은 별도로 확인하는 것이 좋습니다.',
    tags: ['면역력', '피로', '스트레스', '진세노사이드'],
    updatedAt: '2026-07-21T00:00:00.000Z',
  },
  {
    id: 'ginseng-traditional-effects',
    category: '한방',
    title: '한방에서 본 인삼',
    summary: '전통 문헌에서 말하는 인삼의 쓰임을 쉽게 풀어봅니다.',
    body:
      '한방에서는 인삼을 원기를 보하고 허약한 몸을 회복시키며, 폐와 비장 등 장부 기능을 돕는 약재로 설명해 왔습니다. 오래된 문헌에는 갈증, 구토, 허약, 불안 등과 관련한 쓰임도 언급됩니다. 전통적 설명은 현대 의학의 진단명과 일대일로 대응하지 않으므로, 건강 문제 해결을 위해서는 전문가 상담이 필요합니다.',
    tags: ['한방', '원기', '본초강목', '신농본초경'],
    updatedAt: '2026-07-21T00:00:00.000Z',
  },
  {
    id: 'ginseng-active-components',
    category: '성분',
    title: '사포닌과 진세노사이드',
    summary: '고려인삼의 대표 약효 성분을 이해합니다.',
    body:
      '고려인삼의 대표 활성 성분은 사포닌 계열의 진세노사이드입니다. 진세노사이드는 종류에 따라 서로 다른 생리활성을 보일 수 있어 인삼 품질과 기능성을 설명할 때 자주 언급됩니다. 이 밖에도 다당체, 폴리아세틸렌, 페놀계 성분, 산성 펩타이드, 아데노신 등 다양한 성분이 연구되어 왔습니다.',
    tags: ['성분', '사포닌', '진세노사이드', '다당체'],
    updatedAt: '2026-07-21T00:00:00.000Z',
  },
];

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(defaultEntries, null, 2), 'utf8');
  }
}

export async function readEncyclopediaEntries(): Promise<EncyclopediaEntry[]> {
  await ensureDataFile();
  const raw = await fs.readFile(dataFile, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : defaultEntries;
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
      [entry.title, entry.summary, entry.body, entry.category, ...entry.tags].some((value) => value.toLowerCase().includes(query));
    return categoryMatch && queryMatch;
  });
}

export async function createEncyclopediaEntry(input: z.infer<typeof encyclopediaEntrySchema>) {
  const entries = await readEncyclopediaEntries();
  const now = new Date().toISOString();
  const entry: EncyclopediaEntry = {
    ...input,
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

  return `삼박사 설명: ${matched.title} 항목을 기준으로 보면, ${matched.summary} ${matched.body} 더 궁금한 점은 구체적인 사진 상태나 거래 상황과 함께 질문해 주세요.`;
}
