export const config = {
  port: Number(process.env.PORT ?? 8080),
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  insamtongApiBaseUrl: process.env.INSAMTONG_API_BASE_URL ?? 'https://insamtong.kr/openapi',
  insamtongApiKey: process.env.INSAMTONG_API_KEY ?? '',
  publicDataApiKey: process.env.PUBLIC_DATA_API_KEY ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  socialAuthMode: process.env.SOCIAL_AUTH_MODE === 'production' ? 'production' : 'mock',
  kakaoRestApiKey: process.env.KAKAO_REST_API_KEY ?? '',
  kakaoRedirectUri: process.env.KAKAO_REDIRECT_URI ?? '',
  kakaoClientSecret: process.env.KAKAO_CLIENT_SECRET ?? '',
};
