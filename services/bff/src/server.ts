import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { config } from './config.js';
import { loginWithSocial, socialLoginSchema } from './authStore.js';
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

app.post('/v1/auth/social', async (req, res, next) => {
  try {
    const body = socialLoginSchema.parse(req.body);
    res.json(await loginWithSocial(body));
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

const diagnosisRequestSchema = z.object({
  imageBase64: z.string().min(32),
  source: z.string().optional(),
});

app.post('/v1/diagnoses/ginseng', async (req, res, next) => {
  try {
    const body = diagnosisRequestSchema.parse(req.body);
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

    res.json({
      ...prediction,
      priceGradeCode,
      disclaimer: 'AI 판독 결과는 참고용이며 공식 감정이나 거래 보증이 아닙니다.',
    });
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
