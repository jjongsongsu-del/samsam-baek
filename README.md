# 삼삼백과

인삼 정보, AI 년근/등급 판독, 인삼 시세 정보를 제공하는 모바일 MVP입니다.

## 구성

- `src/`: Expo React Native 모바일 앱
- `services/bff/`: 모바일 API 게이트웨이, 인삼통/공공데이터 API 어댑터, AI 서버 중계
- `services/ai/`: FastAPI 기반 인삼 년근/등급 추론 서버
- `deploy/`: 운영 Docker Compose, Caddy 설정
- `model/`: AI 모델 소스와 학습 모델 파일

## 모바일 실행

```powershell
npm install
npm run start
```

## 개발 서버 실행

Docker가 준비되어 있다면:

```powershell
docker compose up
```

개별 실행:

```powershell
cd services/ai
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

```powershell
cd services/bff
npm install
npm run dev
```

## 운영 배포

운영 배포는 `deploy/docker-compose.prod.yml`을 사용합니다.

```bash
cp deploy/.env.example deploy/.env
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml up -d --build
```

AI 모델 경로는 서버 인코딩 문제를 줄이기 위해 영문 디렉터리를 사용합니다.

- `model/04_ai_model_source/yolov5.zip`
- `model/05_trained_model_files/Age_Grade_best.pt`
- `model/05_trained_model_files/Object_best.pt`

## 환경 변수

- `EXPO_PUBLIC_API_BASE_URL`
- `AI_SERVICE_URL`
- `INSAMTONG_API_KEY`
- `PUBLIC_DATA_API_KEY`
