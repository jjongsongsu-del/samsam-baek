export const ageGradeToPriceGradeCode: Record<string, string> = {
  '4\uB144\uADFC:\uB300': '13',
  '4\uB144\uADFC:\uC911': '14',
  '4\uB144\uADFC:\uC18C': '15',
  '5\uB144\uADFC:\uB300': '13',
  '5\uB144\uADFC:\uC911': '14',
  '5\uB144\uADFC:\uC18C': '15',
  '6\uB144\uADFC:\uB300': '13',
  '6\uB144\uADFC:\uC911': '14',
  '6\uB144\uADFC:\uC18C': '15',
};

export function getPriceGradeCode(year: string, grade: string) {
  return ageGradeToPriceGradeCode[`${year}:${grade}`];
}
