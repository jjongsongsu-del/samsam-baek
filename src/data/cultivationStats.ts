export type CultivationStat = {
  region: string;
  parcels: number;
  cultivatedAreaHa: number;
  actualAreaHa: number;
  baseYear: number;
  mainCropYear: number;
};

export const cultivationDataSource = {
  fileName: 'docs/인삼_경작지_현황.csv',
  totalRows: 9923,
  baseYear: 2022,
};

export const cultivationStats: CultivationStat[] = [
  { region: '남일면', parcels: 1600, cultivatedAreaHa: 229.2, actualAreaHa: 688.5, baseYear: 2022, mainCropYear: 2020 },
  { region: '부리면', parcels: 1694, cultivatedAreaHa: 211.6, actualAreaHa: 707.6, baseYear: 2022, mainCropYear: 2020 },
  { region: '제원면', parcels: 1495, cultivatedAreaHa: 200.7, actualAreaHa: 1051.2, baseYear: 2022, mainCropYear: 2020 },
  { region: '금성면', parcels: 1265, cultivatedAreaHa: 185.8, actualAreaHa: 387.5, baseYear: 2022, mainCropYear: 2020 },
  { region: '군북면', parcels: 826, cultivatedAreaHa: 101.3, actualAreaHa: 370.4, baseYear: 2022, mainCropYear: 2020 },
  { region: '남이면', parcels: 1005, cultivatedAreaHa: 100.2, actualAreaHa: 2982.8, baseYear: 2022, mainCropYear: 2020 },
  { region: '금산읍', parcels: 869, cultivatedAreaHa: 88.5, actualAreaHa: 491.4, baseYear: 2022, mainCropYear: 2020 },
  { region: '진산면', parcels: 694, cultivatedAreaHa: 73.1, actualAreaHa: 426.6, baseYear: 2022, mainCropYear: 2022 },
  { region: '복수면', parcels: 281, cultivatedAreaHa: 32, actualAreaHa: 294.6, baseYear: 2022, mainCropYear: 2020 },
  { region: '추부면', parcels: 179, cultivatedAreaHa: 22.4, actualAreaHa: 143.1, baseYear: 2022, mainCropYear: 2020 },
];

export const cultivationSummary = cultivationStats.reduce(
  (summary, item) => ({
    parcels: summary.parcels + item.parcels,
    cultivatedAreaHa: summary.cultivatedAreaHa + item.cultivatedAreaHa,
    actualAreaHa: summary.actualAreaHa + item.actualAreaHa,
  }),
  { parcels: 0, cultivatedAreaHa: 0, actualAreaHa: 0 },
);
