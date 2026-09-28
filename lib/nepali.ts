import NepaliDate from "nepali-date-converter";

export const BS_MONTHS = ["Baisakh","Jestha","Ashadh","Shrawan","Bhadra","Ashwin","Kartik","Mangsir","Poush","Magh","Falgun","Chaitra"];

// Convert AD Date -> BS {year, month (1-12), day}
export function adToBs(d: Date) {
  const n = new NepaliDate(d);
  const obj = n.getBS() as any;
  return { year: obj.year as number, month: obj.month as number, day: obj.date as number };
}
export function bsToAd(year: number, month: number, day: number): Date {
  // nepali-date-converter takes 0-indexed BS month and getAD() returns a plain {year, month, date} object (0-indexed month)
  const n = new NepaliDate(year, month - 1, day);
  const ad = n.getAD() as unknown as { year: number; month: number; date: number };
  return new Date(ad.year, ad.month, ad.date);
}
// AD range covering a full BS month (handles year/month boundaries)
export function bsMonthAdRange(bsYear: number, bsMonth: number) {
  const start = bsToAd(bsYear, bsMonth, 1);
  const nextMonth = bsMonth === 12 ? { y: bsYear + 1, m: 1 } : { y: bsYear, m: bsMonth + 1 };
  const end = bsToAd(nextMonth.y, nextMonth.m, 1);
  return { start, end };
}
export function formatBs(d: Date) {
  const b = adToBs(d);
  return `${BS_MONTHS[b.month]} ${b.day}, ${b.year} BS`;
}
export function startOfDay(d: Date) {
  const c = new Date(d); c.setHours(0,0,0,0); return c;
}
