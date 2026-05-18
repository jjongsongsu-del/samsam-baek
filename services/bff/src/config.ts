export const config = {
  port: Number(process.env.PORT ?? 8080),
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  insamtongApiBaseUrl: process.env.INSAMTONG_API_BASE_URL ?? 'https://insamtong.kr/openapi',
  insamtongApiKey: process.env.INSAMTONG_API_KEY ?? '',
  publicDataApiKey: process.env.PUBLIC_DATA_API_KEY ?? '',
};
