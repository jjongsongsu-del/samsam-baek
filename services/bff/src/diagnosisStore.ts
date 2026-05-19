import { promises as fs } from 'fs';
import path from 'path';

export type DiagnosisResult = {
  year: string;
  grade: string;
  confidence?: number;
  priceGradeCode?: string;
};

export type DiagnosisRecord = {
  id: string;
  userId: string;
  provider?: string;
  createdAt: string;
  source?: string;
  result: DiagnosisResult;
};

type DiagnosisData = {
  records: DiagnosisRecord[];
};

const dataDir = path.resolve('data');
const dataFile = path.join(dataDir, 'diagnoses.json');

const emptyData = (): DiagnosisData => ({ records: [] });

async function readData(): Promise<DiagnosisData> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    return { records: Array.isArray(parsed.records) ? parsed.records : [] };
  } catch {
    const data = emptyData();
    await writeData(data);
    return data;
  }
}

async function writeData(data: DiagnosisData) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

const randomId = () => `dia_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
const localDateKey = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
};

export async function recordDiagnosis(input: {
  userId: string;
  provider?: string;
  source?: string;
  result: DiagnosisResult;
}) {
  const data = await readData();
  const record: DiagnosisRecord = {
    id: randomId(),
    userId: input.userId,
    provider: input.provider,
    createdAt: new Date().toISOString(),
    source: input.source,
    result: input.result,
  };
  data.records.unshift(record);
  await writeData(data);
  return record;
}

export async function getUserDailyUsage(userId: string, date = localDateKey()) {
  const data = await readData();
  const count = data.records.filter((record) => record.userId === userId && localDateKey(new Date(record.createdAt)) === date).length;
  return { date, count };
}

export async function listUserDiagnoses(userId: string, limit = 50) {
  const data = await readData();
  return data.records.filter((record) => record.userId === userId).slice(0, limit);
}

export async function listAllDiagnoses(limit = 200) {
  const data = await readData();
  return data.records.slice(0, limit);
}
