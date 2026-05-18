export type MarketPrice = {
  gradeCode: string;
  category: string;
  grade: string;
  price: number;
  changeRate: number;
  unit: string;
};

export type RegionStat = {
  region: string;
  farms: number;
  areaHa: number;
  productionTon: number;
};

export type EncyclopediaEntry = {
  title: string;
  description: string;
  tag: string;
};

export type GuideItem = {
  title: string;
  description: string;
};

export const latestPrices: MarketPrice[] = [
  { gradeCode: '13', category: '원삼', grade: '대', price: 45000, changeRate: 0, unit: '750g 1채' },
  { gradeCode: '16', category: '원삼', grade: '믹서', price: 37000, changeRate: 0, unit: '750g 1채' },
  { gradeCode: '24', category: '난발삼', grade: '잔난', price: 33250, changeRate: 1, unit: '750g 1채' },
  { gradeCode: '27', category: '난발삼', grade: '콩콩콩난', price: 29125, changeRate: 0, unit: '750g 1채' },
  { gradeCode: '17', category: '삼계', grade: '삼계', price: 36000, changeRate: 0, unit: '750g 1채' },
  { gradeCode: '48', category: '원료삼', grade: '파삼', price: 12750, changeRate: 0, unit: '750g 1채' },
];

export const regionStats: RegionStat[] = [
  { region: '전국', farms: 15877, areaHa: 10584, productionTon: 18274 },
  { region: '금산', farms: 1240, areaHa: 860, productionTon: 1200 },
  { region: '경북', farms: 870, areaHa: 610, productionTon: 920 },
  { region: '전북', farms: 710, areaHa: 530, productionTon: 780 },
  { region: '충남', farms: 580, areaHa: 430, productionTon: 640 },
];

export const encyclopediaEntries: EncyclopediaEntry[] = [
  {
    title: '고려인삼이란',
    tag: '기초',
    description:
      '고려인삼은 뿌리 형태와 약효 성분을 기준으로 국내외에서 구분되는 대표적인 인삼입니다. 삼삼백과는 소비자가 이해하기 쉬운 언어로 품종, 제품 유형, 보관법을 정리합니다.',
  },
  {
    title: '수삼 표준 선별 기준',
    tag: '등급',
    description:
      '수삼은 모양, 굵기, 상처, 뿌리 발달 상태에 따라 시장 등급이 달라집니다. AI 판독 결과는 대/중/소 등급의 참고 정보로 제공하고, 최종 거래 판단은 전문가 확인을 권장합니다.',
  },
  {
    title: '인삼의 효능과 주의',
    tag: '건강',
    description:
      '인삼의 사포닌 성분은 피로 회복과 면역 조절 관련 연구가 많습니다. 다만 복용 목적, 체질, 의약품 복용 여부에 따라 주의가 필요하므로 의학적 판단을 대신하지 않습니다.',
  },
  {
    title: '구매와 보관 요령',
    tag: '생활',
    description:
      '수삼은 신선도와 습도 관리가 중요합니다. 구매 후에는 흙과 수분 상태를 확인하고, 장기 보관 시에는 세척 여부와 포장 방식을 분리해 관리하는 것이 좋습니다.',
  },
];

export const guideItems: GuideItem[] = [
  {
    title: '한 뿌리씩 촬영',
    description: '여러 뿌리를 한 번에 촬영하면 AI가 개체를 구분하기 어렵습니다. 판독용 사진은 한 뿌리씩 촬영하세요.',
  },
  {
    title: '전체 뿌리 노출',
    description: '머리, 몸통, 다리가 잘리지 않도록 화면 안에 전체가 들어오게 배치합니다.',
  },
  {
    title: '단순한 배경',
    description: '흰색 또는 어두운 무늬 없는 배경이 좋습니다. 흙, 봉투, 다른 물건이 같이 보이면 정확도가 떨어질 수 있습니다.',
  },
  {
    title: '조명과 초점',
    description: '그림자와 반사를 줄이고 초점을 맞춘 뒤 촬영합니다. 흐린 이미지는 다시 촬영하도록 안내합니다.',
  },
];
