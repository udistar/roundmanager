import { RoundingInfo } from '../types';
import { findKnownCourse } from './knownCourses';

export interface ManualBookingFields {
  golfCourse?: string;
  date?: string;
  teeOffTime?: string;
  address?: string;
  greenFee?: string;
}

export class BookingParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingParseError';
  }
}

const COURSE_LABEL = /(?:골프장|코스|course|location|장소|클럽)\s*[:：]\s*(.+)/i;
const DATE_LABEL = /(?:날짜|일자|라운딩일|date|tee)\s*[:：]\s*(.+)/i;
const TIME_LABEL = /(?:티업|티오프|tee(?:\s*off)?|시간)\s*[:：]\s*(.+)/i;
const FEE_LABEL = /(?:그린피|green\s*fee|요금)\s*[:：]?\s*([0-9]+(?:\.\d+)?\s*만?원)/i;

function normalizeWhitespace(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

export function extractDate(text: string): string | undefined {
  const iso = text.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})일?/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }

  const compact = text.match(/(20\d{2})(\d{2})(\d{2})/);
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}`;
  }

  return undefined;
}

export function extractTeeOffTime(text: string): string | undefined {
  const labeled = text.match(TIME_LABEL);
  const target = labeled ? labeled[1] : text;

  const koreanAmPm = target.match(/(오전|오후|am|pm)\s*(\d{1,2})\s*시\s*(\d{1,2})?/i);
  if (koreanAmPm) {
    let hour = parseInt(koreanAmPm[2], 10);
    const minute = koreanAmPm[3] ? parseInt(koreanAmPm[3], 10) : 0;
    const meridiem = koreanAmPm[1].toLowerCase();
    if (meridiem === '오후' || meridiem === 'pm') {
      if (hour < 12) hour += 12;
    } else if (hour === 12) {
      hour = 0;
    }
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  const koreanClock = target.match(/(\d{1,2})\s*시\s*(\d{1,2})?\s*분?/);
  if (koreanClock && !/20\d{2}/.test(koreanClock[0])) {
    return `${koreanClock[1].padStart(2, '0')}:${(koreanClock[2] || '00').padStart(2, '0')}`;
  }

  const range = target.match(/(\d{1,2}):(\d{2})\s*[~\-–—]\s*\d{1,2}:\d{2}/);
  if (range) {
    return `${range[1].padStart(2, '0')}:${range[2]}`;
  }

  const clock = target.match(/(?:^|[^\d])(\d{1,2}):(\d{2})(?:[^\d]|$)/);
  if (clock) {
    return `${clock[1].padStart(2, '0')}:${clock[2]}`;
  }

  return undefined;
}

export function extractCourseName(text: string): string | undefined {
  const known = findKnownCourse(text);
  if (known) {
    const lake = /lake|레이크/i.test(text) ? ' Lake' : '';
    return `${known.golfCourse}${lake}`.trim();
  }

  const labeled = text.match(COURSE_LABEL);
  if (labeled) {
    return labeled[1].replace(/["'\[\]]/g, '').split(/[\n,]/)[0].trim();
  }

  const bracket = text.match(/\[([^\]\n]{2,40})\]/);
  if (bracket) return bracket[1].trim();

  const cc = text.match(/([가-힣A-Za-z0-9\s]{2,30}(?:CC|GC|컨트리\s*클럽|골프장|클럽))/i);
  if (cc) return cc[1].replace(/\s+/g, ' ').trim();

  return undefined;
}

export function extractGreenFee(text: string): string | undefined {
  const labeled = text.match(FEE_LABEL);
  if (labeled) return labeled[1].replace(/\s+/g, '');

  const fee = text.match(/(\d+)\s*만원/);
  if (fee) return `${fee[1]}만원`;
  return undefined;
}

export function extractMembers(text: string): number | undefined {
  const match = text.match(/(\d+)\s*인/);
  if (match) return parseInt(match[1], 10);
  return undefined;
}

export function extractArrivalBuffer(text: string): number | undefined {
  const korean = text.match(/(\d+)\s*분\s*전/);
  if (korean) return parseInt(korean[1], 10);

  const english = text.match(/arrive\s+(\d+)\s+minutes?\s+early/i);
  if (english) return parseInt(english[1], 10);

  return undefined;
}

export function extractBooker(text: string): string | undefined {
  const labeled = text.match(/(?:예약자|booker|성명|이름)\s*[:：]\s*([가-힣A-Za-z]{2,20})/i);
  if (labeled) return labeled[1].trim();
  return undefined;
}

export function formatDisplayDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일 (${weekday})`;
}

export function enrichWithKnownCourse(info: RoundingInfo): RoundingInfo {
  const known = findKnownCourse(`${info.golfCourse} ${info.address || ''}`);
  if (!known) return info;
  return {
    ...info,
    golfCourse: info.golfCourse || known.golfCourse,
    address: info.address || known.address,
    lat: info.lat || known.lat,
    lng: info.lng || known.lng,
    phoneNumber: info.phoneNumber || known.phoneNumber,
    homepage: info.homepage || known.homepage,
  };
}

export function mergeManualOverrides(info: RoundingInfo, manual?: ManualBookingFields): RoundingInfo {
  if (!manual) return info;
  return {
    ...info,
    golfCourse: manual.golfCourse?.trim() || info.golfCourse,
    date: manual.date?.trim() || info.date,
    teeOffTime: manual.teeOffTime?.trim() || info.teeOffTime,
    address: manual.address?.trim() || info.address,
    greenFee: manual.greenFee?.trim() || info.greenFee,
  };
}

export function parseBookingLocally(message: string, manual?: ManualBookingFields): RoundingInfo {
  const text = normalizeWhitespace(message || '');
  const known = findKnownCourse(`${text} ${manual?.golfCourse || ''}`);

  const golfCourse = manual?.golfCourse?.trim() || extractCourseName(text) || known?.golfCourse;
  const rawDate = manual?.date?.trim() || extractDate(text);
  const teeOffTime = normalizeTime(manual?.teeOffTime?.trim() || extractTeeOffTime(text));
  const greenFee = manual?.greenFee?.trim() || extractGreenFee(text);
  const members = extractMembers(text);
  const booker = extractBooker(text);
  const arrivalBuffer = extractArrivalBuffer(text);

  if (!golfCourse) {
    throw new BookingParseError('골프장 이름을 찾지 못했습니다. 예약 문구를 다시 붙이거나 직접 입력해 주세요.');
  }
  if (!rawDate) {
    throw new BookingParseError('라운딩 날짜를 찾지 못했습니다. 날짜를 직접 입력해 주세요.');
  }
  if (!teeOffTime) {
    throw new BookingParseError('티업 시간을 찾지 못했습니다. 티업 시간을 직접 입력해 주세요.');
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? formatDisplayDate(rawDate) : rawDate;

  const info: RoundingInfo = {
    golfCourse,
    date,
    teeOffTime,
    address: manual?.address || known?.address,
    lat: known?.lat,
    lng: known?.lng,
    greenFee,
    phoneNumber: known?.phoneNumber,
    homepage: known?.homepage,
    members,
    booker,
    arrivalBuffer,
  };

  return enrichWithKnownCourse(info);
}

function normalizeTime(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  const korean = value.match(/(\d{1,2})\s*시\s*(\d{1,2})?/);
  if (korean) return `${korean[1].padStart(2, '0')}:${(korean[2] || '00').padStart(2, '0')}`;
  return value;
}

export function reconstructRoundingInfo(partial: {
  golfCourse?: string;
  date?: string;
  time?: string;
  location?: string;
  fullInfo?: RoundingInfo;
}): RoundingInfo {
  if (partial.fullInfo?.golfCourse && partial.fullInfo.date && partial.fullInfo.teeOffTime) {
    return enrichWithKnownCourse(partial.fullInfo);
  }

  return parseBookingLocally('', {
    golfCourse: partial.golfCourse || partial.fullInfo?.golfCourse,
    date: partial.date || partial.fullInfo?.date,
    teeOffTime: partial.time || partial.fullInfo?.teeOffTime,
    address: partial.location || partial.fullInfo?.address,
  });
}
