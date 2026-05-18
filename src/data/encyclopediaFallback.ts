import type { EncyclopediaEntry } from '../services/encyclopediaService';

export const fallbackEncyclopediaEntries: EncyclopediaEntry[] = [
  {
    id: 'ginseng-basics',
    category: '기초',
    title: '고려인삼이란',
    summary: '고려인삼의 형태와 기본 구분을 이해합니다.',
    body:
      '고려인삼은 뿌리 형태와 주요 성분을 기준으로 구분하는 대표적인 인삼입니다. 소비자는 년근, 크기, 손상 여부, 보관 상태를 함께 살펴보면 품질을 더 쉽게 이해할 수 있습니다.',
    tags: ['기초', '고려인삼', '품질'],
    updatedAt: '2026-05-15T00:00:00.000Z',
  },
  {
    id: 'grade-standard',
    category: '등급',
    title: '수삼 표준 선별 기준',
    summary: '크기와 뿌리 상태에 따른 등급 차이를 봅니다.',
    body:
      '수삼 등급은 무게, 크기, 상처, 뿌리 발달 상태에 따라 달라집니다. AI 판독 결과는 대, 중, 소 등급 판단을 돕는 참고 정보이며 최종 거래 판단은 현장 품질 확인이 필요합니다.',
    tags: ['등급', '선별', '수삼'],
    updatedAt: '2026-05-15T00:00:00.000Z',
  },
  {
    id: 'storage-guide',
    category: '보관',
    title: '구매 후 보관 요령',
    summary: '신선도를 지키는 보관 방법입니다.',
    body:
      '수삼은 수분과 온도 관리가 중요합니다. 구매 후 흙과 수분 상태를 확인하고, 장기 보관 시에는 통풍과 냉장 상태를 관리해 품질 저하를 줄이는 것이 좋습니다.',
    tags: ['보관', '구매', '신선도'],
    updatedAt: '2026-05-15T00:00:00.000Z',
  },
  {
    id: 'health-note',
    category: '효능',
    title: '인삼의 효능과 주의',
    summary: '건강 정보는 참고용으로 살펴봅니다.',
    body:
      '인삼의 사포닌 성분은 피로 회복과 면역 조절 관련 연구가 많습니다. 다만 체질, 복용 목적, 복용 중인 약에 따라 주의가 필요하므로 의학적 판단을 대체하지 않습니다.',
    tags: ['효능', '주의', '건강'],
    updatedAt: '2026-05-15T00:00:00.000Z',
  },
];
