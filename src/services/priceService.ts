const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
const INSAMTONG_PRICE_URL = 'https://insamtong.kr/price/list.json';
const INSAMTONG_PRICE_REPORT_URL = 'https://insamtong.kr/priceReport.json';
const INSAMTONG_TIMEOUT_MS = 8000;
const API_TIMEOUT_MS = 10000;
const API_BASE_URLS = Array.from(new Set([API_BASE_URL, 'http://10.0.2.2:8080']));

export type CurrentMarketPrice = {
  gradeCode: string;
  name: string;
  category: string;
  grade: string;
  day: string;
  requestedDate: string;
  currentAvgPrice?: number;
  prevDayAvgPrice?: number;
  diffPrevDay?: number;
  ratePrevDay?: number;
  previousTradeDay?: string;
  previousTradePrice?: number;
  diffPreviousTradePrice?: number;
  ratePreviousTradePrice?: number;
  prevYearAvgPrice?: number;
  diffPrevYear?: number;
  ratePrevYear?: number;
  unit: string;
  sourceUrl: string;
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
  previousDayPercent?: number;
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
  previousDayPercent?: number;
  previousMonthPercent?: number;
  previousYearPercent?: number;
  quantityTon?: number;
};

export type PricePredictionQuarter = {
  quarter: string;
  avgPc: number;
};

export type PricePrediction = {
  selectedGrade: string;
  source?: string;
  quarters: PricePredictionQuarter[];
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
  {
    parentCode: '3',
    category: '삼계',
    grades: [{ gradeCode: '17', grade: '삼계', unit: '750g [1채]' }],
  },
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
  {
    parentCode: '6',
    category: '원료삼',
    grades: [{ gradeCode: '48', grade: '파삼', unit: '750g [1채]' }],
  },
] as const;

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const computeTradeComparison = (current?: number, previous?: number) => {
  if (current == null || previous == null || previous === 0) {
    return {
      diffPreviousTradePrice: undefined,
      ratePreviousTradePrice: undefined,
    };
  }

  const diff = current - previous;
  return {
    diffPreviousTradePrice: diff,
    ratePreviousTradePrice: Number(((diff / previous) * 100).toFixed(2)),
  };
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

async function fetchApiJson(path: string) {
  let lastError: unknown;
  for (const baseUrl of API_BASE_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function fetchInsamtongJson(url: string) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Referer: 'https://insamtong.kr/priceReport.do',
        },
      }),
      new Promise<Response>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error('Insamtong request timed out'));
        }, INSAMTONG_TIMEOUT_MS);
      }),
    ]);
    if (!response.ok) {
      throw new Error(`Insamtong request failed: ${response.status}`);
    }
    return response.json();
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function fetchCurrentMarketPrice(gradeInfo: (typeof simplePriceGrades)[number], requestedDate: string): Promise<CurrentMarketPrice> {
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
  const comparison = computeTradeComparison(currentAvgPrice, previousTradePrice);
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
    prevDayAvgPrice: toNumber(price.prevDayAvgPrice),
    diffPrevDay: toNumber(price.diffPrevDay),
    ratePrevDay: toNumber(price.ratePrevDay),
    previousTradeDay: previous?.day ? String(previous.day) : undefined,
    previousTradePrice,
    ...comparison,
    prevYearAvgPrice: toNumber(price.prevYearAvgPrice),
    diffPrevYear: toNumber(price.diffPrevYear),
    ratePrevYear: toNumber(price.ratePrevYear),
    unit: gradeInfo.unit,
    sourceUrl: `https://insamtong.kr/price.do?selectedGrade=${gradeInfo.gradeCode}&date=${requestedDate}`,
  };
}

export async function fetchCurrentMarketPrices(date = formatLocalDate()): Promise<CurrentMarketPrice[]> {
  try {
    const payload = await fetchApiJson(`/v1/prices/latest?date=${encodeURIComponent(date)}`);
    if (Array.isArray(payload?.items) && payload.items.length > 0) {
      return payload.items;
    }
  } catch {
    // Fall through to direct Insamtong access for development environments without BFF.
  }

  const results = await Promise.allSettled(simplePriceGrades.map((gradeInfo) => fetchCurrentMarketPrice(gradeInfo, date)));
  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}

async function fetchDetailedMarketPrice(
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
    pageSize: '12',
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
  const comparison = computeTradeComparison(latestPrice, previousTradePrice);

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
    previousDayPercent: toNumber(latest.previous_day_per),
    previousTradeDay: previous?.latest_date ? String(previous.latest_date) : undefined,
    previousTradePrice,
    ...comparison,
    previousMonthPercent: toNumber(latest.previous_month_per),
    previousYearPercent: toNumber(latest.previous_year_per),
    quantityTon: toNumber(latest.qty) == null ? undefined : Number(((Number(latest.qty) * 75) / 1000).toFixed(1)),
    unit: gradeInfo.unit,
    sourceUrl: `https://insamtong.kr/priceReport.do?parents=${parentInfo.parentCode}&grade=${gradeInfo.gradeCode}&search=1&startDate=${startDate}&endDate=${endDate}`,
  };
}

export async function fetchDetailedMarketPrices(date = new Date()): Promise<DetailedMarketPrice[]> {
  try {
    const payload = await fetchApiJson('/v1/prices/detailed');
    if (Array.isArray(payload?.items)) {
      return payload.items;
    }
  } catch {
    // Fall through to direct Insamtong access for development environments without BFF.
  }

  const items: DetailedMarketPrice[] = [];
  for (const parentInfo of detailedPriceGrades) {
    for (const gradeInfo of parentInfo.grades) {
      try {
        const item = await fetchDetailedMarketPrice(parentInfo, gradeInfo, date);
        if (item) {
          items.push(item);
        }
      } catch {
        // Keep the rest of the price report usable even if one grade request fails.
      }
    }
  }
  return items;
}

export async function fetchDetailedMarketPriceHistory(parentCode: string, gradeCode: string, date = new Date()): Promise<DetailedMarketPriceHistoryRow[]> {
  try {
    const payload = await fetchApiJson(
      `/v1/prices/detailed/history?parentCode=${encodeURIComponent(parentCode)}&gradeCode=${encodeURIComponent(gradeCode)}`,
    );
    if (Array.isArray(payload?.items)) {
      return payload.items;
    }
  } catch {
    // Fall through to direct Insamtong access for development environments without BFF.
  }

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
        previousDayPercent: toNumber(row.previous_day_per),
        previousMonthPercent: toNumber(row.previous_month_per),
        previousYearPercent: toNumber(row.previous_year_per),
        quantityTon: toNumber(row.qty) == null ? undefined : Number(((Number(row.qty) * 75) / 1000).toFixed(1)),
      };
    });
}

export async function fetchPricePrediction(selectedGrade?: string): Promise<PricePrediction | undefined> {
  if (!selectedGrade) {
    return undefined;
  }

  const response = await fetch(`${API_BASE_URL}/v1/prices/prediction?selectedGrade=${encodeURIComponent(selectedGrade)}`);
  if (!response.ok) {
    return undefined;
  }

  const payload = await response.json();
  return {
    selectedGrade: String(payload.selectedGrade ?? selectedGrade),
    source: payload.source,
    quarters: Array.isArray(payload.quarters)
      ? payload.quarters
          .map((quarter: any) => ({
            quarter: String(quarter.quarter ?? ''),
            avgPc: Number(quarter.avgPc ?? 0),
          }))
          .filter((quarter: PricePredictionQuarter) => quarter.quarter && quarter.avgPc > 0)
      : [],
  };
}
