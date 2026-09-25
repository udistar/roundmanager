// 날짜 해석 공용 유틸 (브라우저 / Netlify Function 공용, 순수 함수).
// 기준 "오늘"은 항상 한국 시간(Asia/Seoul)이다.

/** 한국 시간 기준 오늘 날짜 YYYY-MM-DD */
export function seoulToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** 두 ISO 날짜 사이 일수 (to - from) */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86400000);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 실제 존재하는 날짜면 YYYY-MM-DD, 아니면 null (예: 2월 30일) */
export function makeIsoDate(year: number, month: number, day: number): string | null {
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 이 일수 이상 지난 날짜는 "다음 해"로 본다 (예약 문자는 보통 앞으로의 라운드) */
export const PAST_GRACE_DAYS = 3;

/**
 * 연도 없는 월/일의 연도 추정 (한국 시간 기준).
 * 작년·올해·내년 중 "오늘 - PAST_GRACE_DAYS" 이후인 가장 이른 날짜를 고른다.
 *  - 9/25 기준 10/2 → 올해, 3/2 → 내년
 *  - 12/20 기준 1/5 → 내년 (연말 → 연초 넘어감)
 *  - 1/2 기준 12/30 → 작년 (며칠 전 라운드)
 */
export function inferIsoDate(month: number, day: number, now: Date = new Date(), graceDays = PAST_GRACE_DAYS): string | null {
  const today = seoulToday(now);
  const year = Number(today.slice(0, 4));
  for (const y of [year - 1, year, year + 1]) {
    const iso = makeIsoDate(y, month, day);
    if (iso && daysBetween(today, iso) >= -graceDays) return iso;
  }
  return makeIsoDate(year + 1, month, day);
}

/** 문자열에 4자리 연도(20xx)가 들어 있는지 */
export function hasExplicitYear(text: string | undefined): boolean {
  return /20\d{2}/.test(text || '');
}

/**
 * 날짜 입력칸 문자열 → YYYY-MM-DD.
 * 지원: "2026-10-02", "2026년 10월 2일 (금)", "2026.10.2", "20261002",
 *       연도 없는 "10월 2일", "10/2", "10.2", "10-2" (+ 요일 "(금)") → 연도 추정.
 */
export function parseDateField(text: string | undefined, now: Date = new Date()): string | null {
  const s = (text || '').trim();
  if (!s) return null;

  const full = s.match(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if (full) return makeIsoDate(Number(full[1]), Number(full[2]), Number(full[3]));

  const compact = s.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?!\d)/);
  if (compact) return makeIsoDate(Number(compact[1]), Number(compact[2]), Number(compact[3]));

  const md =
    s.match(/(?:^|[^\d])(\d{1,2})\s*월\s*(\d{1,2})\s*일?/) ||
    s.match(/(?:^|[^\d:])(\d{1,2})\s*[/.\-]\s*(\d{1,2})(?![\d:])/);
  if (md) return inferIsoDate(Number(md[1]), Number(md[2]), now);

  return null;
}
