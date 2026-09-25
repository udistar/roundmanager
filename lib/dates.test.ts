import { describe, expect, it } from 'vitest';
import { inferIsoDate, parseDateField } from './dates';
import { extractDate, normalizeInfoDate, resolveBookingDate } from './bookingParser';
import { toIsoDate } from './weather';
import { fetchOpenMeteoWeather } from '../services/weatherService';

// 한국 시간 정오로 "오늘"을 고정 (서버가 UTC여도 같은 날짜)
const kst = (iso: string) => new Date(`${iso}T12:00:00+09:00`);
const SEP25 = kst('2026-09-25');

describe('year inference for yearless dates (KST)', () => {
  it('parses "M월 D일", "M/D", "M.D" with optional weekday', () => {
    expect(toIsoDate('10월 2일 (금)', SEP25)).toBe('2026-10-02');
    expect(toIsoDate('10/2(금)', SEP25)).toBe('2026-10-02');
    expect(toIsoDate('10.2', SEP25)).toBe('2026-10-02');
    expect(toIsoDate('10.2 (금)', SEP25)).toBe('2026-10-02');
    expect(toIsoDate('10-2', SEP25)).toBe('2026-10-02');
  });

  it('keeps an explicit year', () => {
    expect(toIsoDate('2026년 10월 2일 (금)', SEP25)).toBe('2026-10-02');
    expect(toIsoDate('2027-01-05', SEP25)).toBe('2027-01-05');
    expect(toIsoDate('2025.3.1', SEP25)).toBe('2025-03-01');
    expect(toIsoDate('20261002', SEP25)).toBe('2026-10-02');
    expect(extractDate('2027년 10월 2일 07:32 베어크리크', SEP25)).toBe('2027-10-02');
  });

  it('uses next year when the date passed more than a few days ago', () => {
    expect(toIsoDate('9/23', SEP25)).toBe('2026-09-23'); // 2일 전 → 올해 (막 지난 라운드)
    expect(toIsoDate('9/20', SEP25)).toBe('2027-09-20'); // 5일 전 → 내년
    expect(toIsoDate('3/2', SEP25)).toBe('2027-03-02');
  });

  it('rolls December → January into next year, and January → late December into last year', () => {
    const dec20 = kst('2026-12-20');
    expect(inferIsoDate(1, 5, dec20)).toBe('2027-01-05');
    expect(toIsoDate('1/5(화)', dec20)).toBe('2027-01-05');
    expect(extractDate('[베어크리크] 1월 5일 07:32 티업', dec20)).toBe('2027-01-05');
    expect(toIsoDate('12/30', kst('2027-01-02'))).toBe('2026-12-30');
  });

  it('rejects impossible or missing dates', () => {
    expect(parseDateField('2/30', SEP25)).toBeNull();
    expect(parseDateField('07:32', SEP25)).toBeNull();
    expect(parseDateField('', SEP25)).toBeNull();
  });
});

describe('parse-booking date resolution (model vs local parser)', () => {
  const msg = '10/2(금) 07:32 베어크리크';

  it('prefers the local date when the model date has no year', () => {
    expect(resolveBookingDate('10월 2일 (금)', msg, SEP25)).toBe('2026-10-02');
  });

  it('prefers the local date when the model returns a past year', () => {
    expect(resolveBookingDate('2024-10-02', msg, SEP25)).toBe('2026-10-02');
  });

  it('keeps an explicit year from the text', () => {
    expect(resolveBookingDate('2027-10-02', '2027년 10월 2일 07:32 베어크리크', SEP25)).toBe('2027-10-02');
    expect(resolveBookingDate('2025-03-01', '2025년 3월 1일 라운드 기록', SEP25)).toBe('2025-03-01');
  });

  it('re-infers the year when only the model found a (past-year) date', () => {
    expect(resolveBookingDate('2024-10-02', '다음 주 금요일 07:32 베어크리크', SEP25)).toBe('2026-10-02');
  });

  it('normalizes info.date to a display date with year and returns the ISO date', () => {
    const r = normalizeInfoDate({ golfCourse: '베어크리크', date: '10/2(금)', teeOffTime: '07:32' }, SEP25);
    expect(r.isoDate).toBe('2026-10-02');
    expect(r.info.date).toBe('2026년 10월 2일 (금)');
  });
});

describe('weather card messages instead of silent empty results', () => {
  const base = { golfCourse: '베어크리크 포천', teeOffTime: '07:32', lat: 37.9675, lng: 127.2068 };

  it('explains an unparsable date', async () => {
    const cards = await fetchOpenMeteoWeather({ ...base, date: '다음 주쯤' }, SEP25);
    expect(cards).toHaveLength(1);
    expect(cards[0].error).toBe(true);
    expect(cards[0].message).toContain('날짜');
  });

  it('shows the 16-day limit message beyond the forecast range', async () => {
    const cards = await fetchOpenMeteoWeather({ ...base, date: '2026-10-11' }, SEP25); // D-16
    expect(cards[0].error).toBe(true);
    expect(cards[0].message).toContain('예보는 티업 16일 전부터 볼 수 있어요');
  });

  it('explains missing coordinates', async () => {
    const cards = await fetchOpenMeteoWeather({ golfCourse: 'x', teeOffTime: '07:32', date: '2026-10-02' }, SEP25);
    expect(cards[0].message).toContain('좌표');
  });
});
