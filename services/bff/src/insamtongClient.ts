import { config } from './config.js';

const INSAMTONG_PRICE_URL = 'https://insamtong.kr/price/list.json';
const INSAMTONG_PRICE_REPORT_URL = 'https://insamtong.kr/priceReport.json';
const INSAMTONG_TIMEOUT_MS = 12000;

export type CurrentMarketPrice = {
  gradeCode: string;
  name: string;
  category: string;
  grade: string;
  day: string;
  requestedDate: string;
  currentAvgPrice?: number;
  previousTradeDay?: string;
  previousTradePrice?: number;
  diffPreviousTradePrice?: number;
  ratePreviousTradePrice?: number;
  unit: string;
  sourceUrl: string;
  source: string;
};

export type DetailedMarketPrice = {
  parentCode: string;
  category: string;
  gradeCode: string;
  grade: string;
  description?: string;
  day: string;
  latestPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  previousTradeDay?: string;
  previousTradePrice?: number;
  diffPreviousTradePrice?: number;
  ratePreviousTradePrice?: number;
  previousMonthPercent?: number;
  previousYearPercent?: number;
  quantityTon?: number;
  unit: string;
  sourceUrl: string;
};

export type DetailedMarketPriceHistoryRow = {
  day: string;
  latestPrice?: number;
  previousTradeDay?: string;
  previousTradePrice?: number;
  diffPreviousTradePrice?: number;
  ratePreviousTradePrice?: number;
  previousMonthPercent?: number;
  previousYearPercent?: number;
  quantityTon?: number;
};

const simplePriceGrades = [
  { gradeCode: '13', category: '원삼', grade: '대', unit: '750g [1채(7뿌리)]' },
  { gradeCode: '16', category: '원삼', grade: '믹서', unit: '750g [1채(12~14뿌리)]' },
  { gradeCode: '24', category: '난발삼', grade: '잔난', unit: '750g [1채(12~14뿌리)]' },
  { gradeCode: '27', category: '난발삼', grade: '콩콩콩난', unit: '750g [1채(21~25뿌리)]' },
  { gradeCode: '17', category: '삼계', grade: '삼계', unit: '750g [1채]' },
  { gradeCode: '48', category: '원료삼', grade: '파삼', unit: '750g [1채]' },
] as const;

const detailedPriceGrades = [
  {
    parentCode: '1',
    category: '원삼',
    grades: [
      { gradeCode: '9', grade: '별대', description: '3~4뿌리', unit: '750g [1채(3~4뿌리)]' },
      { gradeCode: '10', grade: '왕왕대', description: '4뿌리', unit: '750g [1채(4뿌리)]' },
      { gradeCode: '11', grade: '왕대', description: '5뿌리', unit: '750g [1채(5뿌리)]' },
      { gradeCode: '12', grade: '특대', description: '6뿌리', unit: '750g [1채(6뿌리)]' },
      { gradeCode: '13', grade: '대', description: '7뿌리', unit: '750g [1채(7뿌리)]' },
      { gradeCode: '14', grade: '중', description: '8~9뿌리', unit: '750g [1채(8~9뿌리)]' },
      { gradeCode: '15', grade: '소', description: '10~11뿌리', unit: '750g [1채(10~11뿌리)]' },
      { gradeCode: '16', grade: '믹서', description: '12~14뿌리', unit: '750g [1채(12~14뿌리)]' },
    ],
  },
  {
    parentCode: '2',
    category: '난발삼',
    grades: [
      { gradeCode: '20', grade: '특난', description: '5뿌리', unit: '750g [1채(5뿌리)]' },
      { gradeCode: '21', grade: '대난', description: '6~7뿌리', unit: '750g [1채(6~7뿌리)]' },
      { gradeCode: '22', grade: '중난', description: '8~9뿌리', unit: '750g [1채(8~9뿌리)]' },
      { gradeCode: '23', grade: '소난', description: '10~11뿌리', unit: '750g [1채(10~11뿌리)]' },
      { gradeCode: '24', grade: '잔난', description: '12~14뿌리', unit: '750g [1채(12~14뿌리)]' },
      { gradeCode: '25', grade: '콩난', description: '15~18뿌리', unit: '750g [1채(15~18뿌리)]' },
      { gradeCode: '26', grade: '콩콩난', description: '19~20뿌리', unit: '750g [1채(19~20뿌리)]' },
      { gradeCode: '27', grade: '콩콩콩난', description: '21~25뿌리', unit: '750g [1채(21~25뿌리)]' },
    ],
  },
  { parentCode: '3', category: '삼계', grades: [{ gradeCode: '17', grade: '삼계', unit: '750g [1채]' }] },
  {
    parentCode: '92',
    category: '황삼',
    grades: [
      { gradeCode: '93', grade: '황왕대', description: '5뿌리', unit: '750g [1채(5뿌리)]' },
      { gradeCode: '94', grade: '황특대', description: '6뿌리', unit: '750g [1채(6뿌리)]' },
      { gradeCode: '95', grade: '황대', description: '7뿌리', unit: '750g [1채(7뿌리)]' },
      { gradeCode: '96', grade: '황중', description: '8~9뿌리', unit: '750g [1채(8~9뿌리)]' },
      { gradeCode: '97', grade: '황소', description: '9~10뿌리', unit: '750g [1채(9~10뿌리)]' },
      { gradeCode: '98', grade: '황믹서', description: '11~13뿌리', unit: '750g [1채(11~13뿌리)]' },
      { gradeCode: '99', grade: '황삼계', description: '14뿌리 이하', unit: '750g [1채(14뿌리 이하)]' },
    ],
  },
  { parentCode: '6', category: '원료삼', grades: [{ gradeCode: '48', grade: '파삼', unit: '750g [1채]' }] },
] as const;

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const compactDate = (date: Date) => formatLocalDate(date).replace(/-/g, '');

const daysBefore = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
};

const computeTradeComparison = (current?: number, previous?: number) => {
  if (current == null || previous == null || previous === 0) {
    return {};
  }
  const diff = current - previous;
  return {
    diffPreviousTradePrice: diff,
    ratePreviousTradePrice: Number(((diff / previous) * 100).toFixed(2)),
  };
};

async function fetchInsamtongJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INSAMTONG_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Referer: 'https://insamtong.kr/priceReport.do',
        'User-Agent': 'Mozilla/5.0 samsam-baekgwa-bff',
      },
    });
    if (!response.ok) {
      throw new Error(`Insamtong request failed: ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function getLatestPrice(gradeInfo: (typeof simplePriceGrades)[number], requestedDate: string): Promise<CurrentMarketPrice> {
  const query = new URLSearchParams({
    page: '1',
    pageSize: '6',
    selectedGrade: gradeInfo.gradeCode,
    date: requestedDate,
    type: 'search',
  });
  const payload = await fetchInsamtongJson(`${INSAMTONG_PRICE_URL}?${query.toString()}`);
  const price = payload?.result?.price ?? {};
  const mainGrade = payload?.result?.mainGrade ?? {};
  const rows = Array.isArray(payload?.result?.list) ? payload.result.list.filter((row: any) => Number(row.currentAvgPrice ?? 0) > 0) : [];
  const latest = rows[0] ?? price;
  const previous = rows[1];
  const currentAvgPrice = toNumber(latest.currentAvgPrice);
  const previousTradePrice = toNumber(previous?.currentAvgPrice);
  const [category, grade] = String(mainGrade.namePath ?? `${gradeInfo.category} / ${gradeInfo.grade}`)
    .split('/')
    .map((item) => item.trim());

  return {
    gradeCode: String(price.fhsnGradCd ?? gradeInfo.gradeCode),
    name: String(mainGrade.name ?? gradeInfo.grade),
    category: category || gradeInfo.category,
    grade: grade || gradeInfo.grade,
    day: String(latest.day ?? price.day ?? requestedDate),
    requestedDate,
    currentAvgPrice,
    previousTradeDay: previous?.day ? String(previous.day) : undefined,
    previousTradePrice,
    ...computeTradeComparison(currentAvgPrice, previousTradePrice),
    unit: gradeInfo.unit,
    sourceUrl: `https://insamtong.kr/price.do?selectedGrade=${gradeInfo.gradeCode}&date=${requestedDate}`,
    source: 'insamtong',
  };
}

export async function getLatestPrices(date = formatLocalDate()): Promise<CurrentMarketPrice[]> {
  const results = await Promise.allSettled(simplePriceGrades.map((gradeInfo) => getLatestPrice(gradeInfo, date)));
  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}

async function getDetailedPrice(
  parentInfo: (typeof detailedPriceGrades)[number],
  gradeInfo: (typeof detailedPriceGrades)[number]['grades'][number],
  date: Date,
): Promise<DetailedMarketPrice | undefined> {
  const startDate = compactDate(daysBefore(date, 180));
  const endDate = compactDate(date);
  const query = new URLSearchParams({
    grade: gradeInfo.gradeCode,
    startDate,
    endDate,
    search: '1',
    parents: parentInfo.parentCode,
    page: '1',
    pageSize: '20',
  });
  const payload = await fetchInsamtongJson(`${INSAMTONG_PRICE_REPORT_URL}?${query.toString()}`);
  const rows = Array.isArray(payload?.result) ? payload.result : [];
  const validRows = rows.filter((row: any) => Number(row.latest_price ?? 0) > 0);
  const latest = validRows[0];
  const previous = validRows[1];
  if (!latest) {
    return undefined;
  }
  const latestPrice = toNumber(latest.latest_price);
  const previousTradePrice = toNumber(previous?.latest_price);

  return {
    parentCode: parentInfo.parentCode,
    category: parentInfo.category,
    gradeCode: gradeInfo.gradeCode,
    grade: gradeInfo.grade,
    description: 'description' in gradeInfo ? gradeInfo.description : undefined,
    day: String(latest.latest_date ?? formatLocalDate(date)),
    latestPrice,
    minPrice: toNumber(latest.latest_min_price),
    maxPrice: toNumber(latest.latest_max_price),
    previousTradeDay: previous?.latest_date ? String(previous.latest_date) : undefined,
    previousTradePrice,
    ...computeTradeComparison(latestPrice, previousTradePrice),
    previousMonthPercent: toNumber(latest.previous_month_per),
    previousYearPercent: toNumber(latest.previous_year_per),
    quantityTon: toNumber(latest.qty) == null ? undefined : Number(((Number(latest.qty) * 75) / 1000).toFixed(1)),
    unit: gradeInfo.unit,
    sourceUrl: `https://insamtong.kr/priceReport.do?parents=${parentInfo.parentCode}&grade=${gradeInfo.gradeCode}&search=1&startDate=${startDate}&endDate=${endDate}`,
  };
}

export async function getDetailedPrices(date = new Date()): Promise<DetailedMarketPrice[]> {
  const items: DetailedMarketPrice[] = [];
  for (const parentInfo of detailedPriceGrades) {
    for (const gradeInfo of parentInfo.grades) {
      try {
        const item = await getDetailedPrice(parentInfo, gradeInfo, date);
        if (item) {
          items.push(item);
        }
      } catch {
        // Keep the report usable even if one grade is temporarily unavailable.
      }
    }
  }
  return items;
}

export async function getDetailedPriceHistory(parentCode: string, gradeCode: string, date = new Date()): Promise<DetailedMarketPriceHistoryRow[]> {
  const startDate = compactDate(daysBefore(date, 92));
  const endDate = compactDate(date);
  const query = new URLSearchParams({
    grade: gradeCode,
    startDate,
    endDate,
    search: '1',
    parents: parentCode,
    page: '1',
    pageSize: '120',
  });
  const payload = await fetchInsamtongJson(`${INSAMTONG_PRICE_REPORT_URL}?${query.toString()}`);
  const rows = Array.isArray(payload?.result) ? payload.result : [];
  return rows
    .filter((row: any) => Number(row.latest_price ?? 0) > 0)
    .map((row: any, index: number, validRows: any[]) => {
      const latestPrice = toNumber(row.latest_price);
      const previous = validRows[index + 1];
      const previousTradePrice = toNumber(previous?.latest_price);
      return {
        day: String(row.latest_date ?? ''),
        latestPrice,
        previousTradeDay: previous?.latest_date ? String(previous.latest_date) : undefined,
        previousTradePrice,
        ...computeTradeComparison(latestPrice, previousTradePrice),
        previousMonthPercent: toNumber(row.previous_month_per),
        previousYearPercent: toNumber(row.previous_year_per),
        quantityTon: toNumber(row.qty) == null ? undefined : Number(((Number(row.qty) * 75) / 1000).toFixed(1)),
      };
    });
}

export async function getPricePrediction(selectedGrade: string) {
  if (!config.insamtongApiKey) {
    return {
      selectedGrade,
      source: 'sample',
      quarters: [
        { quarter: '2026 Q2', avgPc: 43000 },
        { quarter: '2026 Q3', avgPc: 44500 },
      ],
    };
  }

  const url = new URL(`${config.insamtongApiBaseUrl}/pricePrediction`);
  url.searchParams.set('api_key', config.insamtongApiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('selectedGrade', selectedGrade);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Insamtong pricePrediction failed: ${response.status}`);
  }
  return response.json();
}
