# 삼삼백과 Google Play 등록 준비 체크리스트

## 현재 확인된 상태

- 앱 이름: 삼삼백과
- 패키지명: `kr.samsambaekgwa.app`
- 버전: `1.0.0`
- versionCode: `2`
- API 서버: `https://samsam.aodata.co.kr`
- 서버 상태: `/health` 응답 정상
- targetSdkVersion: `35`
- 주요 권한: 카메라, 인터넷, 이미지 읽기
- 일반 사용자 로그인: 제거됨
- 관리자 CSV 반영: 지도 화면에서 관리자 로그인 후 사용

## Google Play 제출 전 필수 작업

1. 업로드 키 생성 및 보관
   - 업로드 키 생성 완료: `android/keystores/samsam-upload-key.jks`
   - 키 설정 파일 생성 완료: `android/keystores/samsam-upload-key.properties`
   - 두 파일은 Git에 올리지 않고 별도 보관해야 합니다.
   - SHA-1: `F4:C0:F6:2E:04:63:9F:20:8C:1C:46:B3:BC:81:ED:28:60:5A:68:7A`
   - SHA-256: `02:29:9D:DA:B0:87:75:F7:9A:3C:95:4D:08:D1:C3:92:0F:31:21:56:3E:BF:AC:6F:B1:B4:1A:9B:BB:1B:8F:71`

2. AAB 생성
   - Google Play 신규 앱은 Android App Bundle 형식이 기본 제출물입니다.
   - 생성 완료: `samsam-baekgwa-play-release.aab`
   - 재생성 명령: `powershell -ExecutionPolicy Bypass -File scripts/build-play-aab.ps1`

3. 개인정보처리방침 공개 URL 준비
   - 앱은 사진을 서버로 전송해 AI 판독을 수행합니다.
   - Play Console의 개인정보처리방침 URL과 데이터 보안 섹션에 동일하게 반영해야 합니다.
   - 공개 URL: `https://samsam.aodata.co.kr/privacy`
   - 문의 이메일: `aodata.ljk@gmail.com`

4. HTTPS 적용
   - API 주소는 `https://samsam.aodata.co.kr` 기준으로 설정합니다.
   - 외부 HTTPS 프록시가 기존 8091 서비스로 요청을 전달합니다.

5. 스토어 등록 이미지 준비
   - 앱 아이콘: 준비됨
   - 스크린샷: 홈, AI 판독, 시세, 지도, 이용 안내 화면 필요
   - 피처 그래픽: 1024 x 500 이미지 필요

6. targetSdkVersion 일정 확인
   - 현재 targetSdkVersion은 35입니다.
   - 2026년 8월 31일부터 Google Play 신규 앱/업데이트는 Android 16, API 36 이상을 요구합니다.
   - 등록 일정이 그 이후라면 targetSdkVersion 36 대응이 필요합니다.

## 권장 Play Console 입력 초안

앱 설명:

삼삼백과는 인삼 사진을 기반으로 AI 판독을 제공하고, 인삼 시세와 백과 정보, 금산 인삼 지도 데이터를 함께 확인할 수 있는 인삼 정보 앱입니다.

짧은 설명:

AI 인삼 판독, 시세, 백과, 지도를 한 번에 확인합니다.

데이터 보안 요약:

- 수집/처리 데이터: 사용자가 선택하거나 촬영한 사진, 앱 사용 중 생성되는 판독 결과
- 사용 목적: AI 인삼 판독 결과 제공
- 계정 정보: 일반 사용자 로그인 기능 없음
- 저장 방식: 앱의 저장 목록은 사용 중인 기기 내부에 저장
- 서버 저장: 기본적으로 원본 사진을 영구 저장하지 않음
