import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { config } from './config.js';
import { adminLoginSchema, loginAdmin, verifyAdminToken } from './adminAuth.js';
import { loginWithSocial, socialLoginSchema, verifyAccessToken } from './authStore.js';
import {
  createEncyclopediaEntry,
  deleteEncyclopediaEntry,
  encyclopediaEntrySchema,
  explainWithSambaksa,
  listEncyclopediaEntries,
  readEncyclopediaEntries,
  updateEncyclopediaEntry,
} from './encyclopediaStore.js';
import { getPriceGradeCode } from './ginsengPriceMap.js';
import { getDetailedPriceHistory, getDetailedPrices, getLatestPrices, getPricePrediction } from './insamtongClient.js';
import { importMapData, listMapData, mapCategorySchema, mapImportSchema } from './mapDataStore.js';
import { getUserDailyUsage, listAllDiagnoses, listUserDiagnoses, recordDiagnosis } from './diagnosisStore.js';

const app = express();
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 120000);

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

app.use(cors());
app.use(express.json({ limit: '12mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'samsam-bff' });
});

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

app.get('/privacy', (_req, res) => {
  const effectiveDate = '2026년 8월 6일';
  const contactEmail = escapeHtml(config.privacyContactEmail);
  const operatorName = escapeHtml(config.serviceOperatorName);

  res.type('html').send(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>삼삼백과 개인정보처리방침</title>
  <style>
    :root {
      color-scheme: light;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #17231f;
      background: #f7f7f3;
    }
    body {
      margin: 0;
      line-height: 1.7;
    }
    main {
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 20px 56px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 32px;
      line-height: 1.25;
    }
    h2 {
      margin: 34px 0 10px;
      font-size: 20px;
      line-height: 1.35;
    }
    p, li {
      font-size: 16px;
    }
    .meta {
      color: #5f6f68;
      margin: 0 0 28px;
    }
    section {
      border-top: 1px solid #d9ded8;
      padding-top: 4px;
    }
    a {
      color: #1d6b4f;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <main>
    <h1>삼삼백과 개인정보처리방침</h1>
    <p class="meta">시행일: ${effectiveDate}</p>

    <p>삼삼백과는 인삼 사진 기반 AI 판독, 인삼 시세, 백과, 인삼정보 서비스를 제공하는 앱입니다. 본 개인정보처리방침은 삼삼백과 서비스 이용 과정에서 처리되는 개인정보와 데이터의 항목, 이용 목적, 보관 및 문의 방법을 안내합니다.</p>

    <section>
      <h2>1. 처리하는 정보</h2>
      <p>삼삼백과는 서비스 제공을 위해 다음 정보를 처리할 수 있습니다.</p>
      <ul>
        <li>사용자가 촬영하거나 선택한 인삼 사진 또는 사용자가 지정한 이미지 영역</li>
        <li>AI 판독 결과: 연근, 등급, 신뢰도, 가격 등급 코드 등</li>
        <li>앱 내 저장 목록: 사용자가 기기에 저장한 판독 결과와 이미지 경로</li>
        <li>관리자 기능 사용 시 관리자 ID 및 인증 토큰</li>
      </ul>
      <p>삼삼백과는 일반 사용자를 위한 소셜 로그인 또는 회원가입 기능을 사용하지 않습니다.</p>
    </section>

    <section>
      <h2>2. 정보 이용 목적</h2>
      <ul>
        <li>인삼 사진 AI 판독 및 결과 제공</li>
        <li>판독 결과 화면 표시 및 사용자가 저장한 이력 표시</li>
        <li>인삼 시세, 백과, 인삼정보 제공</li>
        <li>지도 데이터 CSV 반영을 위한 관리자 인증</li>
        <li>서비스 오류 확인 및 품질 개선</li>
      </ul>
    </section>

    <section>
      <h2>3. 사진 데이터 처리</h2>
      <p>사용자가 AI 판독을 실행하면 사진 또는 선택한 이미지 영역이 서버로 전송되어 AI 판독에 사용됩니다. 서버는 기본적으로 원본 사진을 영구 저장하지 않는 것을 원칙으로 합니다.</p>
      <p>앱에 저장한 판독 목록은 사용 중인 기기 내부에 저장됩니다.</p>
    </section>

    <section>
      <h2>4. 제3자 제공</h2>
      <p>삼삼백과는 사용자의 개인정보를 법령에 따른 경우를 제외하고 제3자에게 판매하거나 제공하지 않습니다.</p>
    </section>

    <section>
      <h2>5. 보관 및 삭제</h2>
      <p>앱 내부에 저장된 판독 결과는 사용자가 앱에서 삭제할 수 있습니다. 서버 로그와 관리자 처리 기록은 서비스 운영, 보안, 오류 확인에 필요한 기간 동안 보관될 수 있습니다.</p>
    </section>

    <section>
      <h2>6. 권한 안내</h2>
      <ul>
        <li>카메라: 인삼 사진 촬영</li>
        <li>사진/이미지 접근: 사용자가 선택한 사진으로 AI 판독</li>
        <li>인터넷: 서버 AI 판독, 시세, 백과, 인삼정보 조회</li>
      </ul>
    </section>

    <section>
      <h2>7. 보안</h2>
      <p>삼삼백과는 서비스 제공 과정에서 전송되는 데이터를 보호하기 위해 HTTPS 통신 적용을 기준으로 운영합니다.</p>
    </section>

    <section>
      <h2>8. 문의</h2>
      <p>운영자: ${operatorName}</p>
      <p>문의 이메일: <a href="mailto:${contactEmail}">${contactEmail}</a></p>
    </section>
  </main>
</body>
</html>`);
});

app.post('/v1/auth/social', async (req, res, next) => {
  try {
    const body = socialLoginSchema.parse(req.body);
    res.json(await loginWithSocial(body));
  } catch (error) {
    next(error);
  }
});

app.post('/v1/admin/auth/login', async (req, res, next) => {
  try {
    const body = adminLoginSchema.parse(req.body);
    const session = loginAdmin(body);
    if (!session) {
      throw new HttpError(401, 'Invalid admin credentials');
    }
    res.json(session);
  } catch (error) {
    next(error);
  }
});

function readBearer(req: express.Request) {
  const authHeader = String(req.headers.authorization ?? '');
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
}

function requireUser(req: express.Request) {
  const token = readBearer(req);
  const auth = token ? verifyAccessToken(token) : undefined;
  if (!auth) {
    throw new HttpError(401, 'Login is required');
  }
  return auth;
}

app.get('/v1/me/usage', async (req, res, next) => {
  try {
    const auth = requireUser(req);
    const usage = await getUserDailyUsage(auth.userId);
    res.json({
      usage,
      limit: 100,
      remaining: Math.max(100 - usage.count, 0),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/me/diagnoses', async (req, res, next) => {
  try {
    const auth = requireUser(req);
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    res.json({ items: await listUserDiagnoses(auth.userId, limit) });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/admin/diagnoses', async (req, res, next) => {
  try {
    const token = readBearer(req);
    if (!verifyAdminToken(token)) {
      throw new HttpError(401, 'Admin login is required');
    }
    const limit = Math.min(Number(req.query.limit ?? 200), 1000);
    res.json({ items: await listAllDiagnoses(limit) });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/prices/latest', async (req, res, next) => {
  try {
    const date = req.query.date ? String(req.query.date) : undefined;
    res.json({ items: await getLatestPrices(date) });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/prices/detailed', async (_req, res, next) => {
  try {
    res.json({ items: await getDetailedPrices() });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/prices/detailed/history', async (req, res, next) => {
  try {
    const parentCode = String(req.query.parentCode ?? '');
    const gradeCode = String(req.query.gradeCode ?? '');
    if (!parentCode || !gradeCode) {
      throw new HttpError(400, 'parentCode and gradeCode are required');
    }
    res.json({ items: await getDetailedPriceHistory(parentCode, gradeCode) });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/prices/prediction', async (req, res, next) => {
  try {
    const selectedGrade = String(req.query.selectedGrade ?? '13');
    res.json(await getPricePrediction(selectedGrade));
  } catch (error) {
    next(error);
  }
});

app.get('/v1/encyclopedia', async (req, res, next) => {
  try {
    const category = req.query.category ? String(req.query.category) : undefined;
    const q = req.query.q ? String(req.query.q) : undefined;
    const items = await listEncyclopediaEntries({ category, q });
    const categories = Array.from(new Set((await readEncyclopediaEntries()).map((entry) => entry.category)));
    res.json({ items, categories });
  } catch (error) {
    next(error);
  }
});

app.post('/v1/admin/encyclopedia', async (req, res, next) => {
  try {
    const body = encyclopediaEntrySchema.parse(req.body);
    res.status(201).json(await createEncyclopediaEntry(body));
  } catch (error) {
    next(error);
  }
});

app.put('/v1/admin/encyclopedia/:id', async (req, res, next) => {
  try {
    const body = encyclopediaEntrySchema.parse(req.body);
    const updated = await updateEncyclopediaEntry(req.params.id, body);
    if (!updated) {
      res.status(404).json({ message: 'Encyclopedia entry not found' });
      return;
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/v1/admin/encyclopedia/:id', async (req, res, next) => {
  try {
    const deleted = await deleteEncyclopediaEntry(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: 'Encyclopedia entry not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post('/v1/encyclopedia/assistant', async (req, res, next) => {
  try {
    const body = z.object({ question: z.string().min(1), entryId: z.string().optional() }).parse(req.body);
    const entries = await readEncyclopediaEntries();
    const scopedEntries = body.entryId ? entries.filter((entry) => entry.id === body.entryId) : entries;
    res.json({ answer: explainWithSambaksa(body.question, scopedEntries.length ? scopedEntries : entries) });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/map-data', async (req, res, next) => {
  try {
    const category = req.query.category ? mapCategorySchema.parse(req.query.category) : undefined;
    const q = req.query.q ? String(req.query.q) : undefined;
    const limit = req.query.limit == null ? undefined : Number(req.query.limit);
    const offset = req.query.offset == null ? undefined : Number(req.query.offset);
    res.json(await listMapData({ category, q, limit, offset }));
  } catch (error) {
    next(error);
  }
});

app.post('/v1/admin/map-data/import', async (req, res, next) => {
  try {
    const authHeader = String(req.headers.authorization ?? '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!verifyAdminToken(token)) {
      throw new HttpError(401, 'Admin login is required');
    }
    const body = mapImportSchema.parse(req.body);
    res.json(await importMapData(body));
  } catch (error) {
    next(error);
  }
});

const diagnosisRequestSchema = z.object({
  imageBase64: z.string().min(32),
  source: z.string().optional(),
});

app.post('/v1/diagnoses/ginseng', async (req, res, next) => {
  try {
    const body = diagnosisRequestSchema.parse(req.body);
    const auth = readBearer(req) ? verifyAccessToken(readBearer(req)) : undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    let aiResponse: Response;

    try {
      aiResponse = await fetch(`${config.aiServiceUrl}/v1/models/ginseng-age-grade:predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new HttpError(503, 'AI service timeout');
      }
      throw new HttpError(503, 'AI service unavailable');
    } finally {
      clearTimeout(timeout);
    }

    if (!aiResponse.ok) {
      const message = await aiResponse.text();
      if (aiResponse.status === 422) {
        throw new HttpError(422, message || 'Image cannot be diagnosed');
      }
      if (aiResponse.status === 429) {
        throw new HttpError(429, message || 'Diagnosis limit exceeded');
      }
      if (aiResponse.status === 503) {
        throw new HttpError(503, message || 'AI service unavailable');
      }
      throw new HttpError(500, message || `AI service failed: ${aiResponse.status}`);
    }

    const prediction = await aiResponse.json();
    const priceGradeCode = getPriceGradeCode(prediction.year, prediction.grade);
    const result = {
      ...prediction,
      priceGradeCode,
      disclaimer: 'AI 판독 결과는 참고용이며 공식 감정이나 거래 보증이 아닙니다.',
    };

    if (auth) {
      await recordDiagnosis({
        userId: auth.userId,
        provider: auth.provider,
        source: body.source,
        result: {
          year: String(result.year ?? result.age ?? '판독 불가'),
          grade: String(result.grade ?? '판독 불가'),
          confidence: typeof result.confidence === 'number' ? result.confidence : undefined,
          priceGradeCode,
        },
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json({ message: 'Invalid request payload', issues: error.issues });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  res.status(500).json({ message });
});

app.listen(config.port, () => {
  console.log(`Samsam BFF listening on http://localhost:${config.port}`);
});
