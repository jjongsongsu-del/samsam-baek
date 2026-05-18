# 삼삼백과 초기 아키텍처

## 목표

삼삼백과는 인삼 정보 제공, 사진 기반 년근/등급 판독, 인삼통/공공데이터 기반 가격과 통계 제공을 목표로 한다.

## 현재 기술 스택

- Mobile: Expo React Native, TypeScript
- BFF: Node.js Express, TypeScript
- AI Inference: FastAPI, Python
- External data: 인삼통 OpenAPI, 공공데이터포털 API

> 장기적으로 Android 전용 성능 최적화가 필요하면 Kotlin/Jetpack Compose 앱으로 전환할 수 있다. 현재 저장소에는 Expo 앱이 이미 있어 MVP 검증 속도를 우선한다.

## 서비스 경계

- App: 화면, 카메라 촬영, 사용자 동의, 판독 결과 표시
- BFF: API 키 보호, 인삼통/공공데이터 어댑터, AI 서버 중계, 응답 표준화
- AI: YOLOv5 기반 인삼 부위 탐지 및 년근/등급 판독
- Admin: 모델 버전, 콘텐츠, 공지, 신고/피드백 관리

## 주요 API

- `GET /v1/prices/latest`
- `GET /v1/prices/prediction?selectedGrade=13`
- `POST /v1/diagnoses/ginseng`

## 모델 운영 계획

1. Stub API로 앱/BFF 계약 검증
2. `Age_Grade_best.pt`, `Object_best.pt` 확보
3. 서버 추론으로 MVP 출시
4. ONNX 변환 및 성능 측정
5. 필요 시 TFLite/온디바이스 추론 병행

## 주의 사항

- AI 판독은 참고용으로 표시한다.
- 사용자 이미지 저장과 모델 개선 활용은 별도 동의를 받는다.
- 인삼통 API 키는 앱에 포함하지 않고 BFF 서버 환경변수로만 관리한다.
