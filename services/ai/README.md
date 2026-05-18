# Samsam AI Inference API

AI허브 71426 인삼 년근/등급 모델을 서비스 API로 감싸는 추론 서버입니다.

현재는 앱과 BFF 연동을 먼저 검증하기 위한 stub 응답을 반환합니다. 다음 단계에서 `Age_Grade_best.pt`, `Object_best.pt` 또는 변환된 ONNX/TFLite 모델을 로드합니다.

## Run

```powershell
cd services/ai
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

## Endpoint

`POST /v1/models/ginseng-age-grade:predict`

```json
{
  "imageBase64": "...",
  "source": "mobile-camera"
}
```
