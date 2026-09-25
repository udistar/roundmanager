// 전국 골프장 디렉터리 (data/golfCourses.json, 약 640곳).
// - 번들 크기를 위해 JSON은 필요할 때 동적 import로 별도 청크에서 불러온다.
// - 좌표는 없으므로 주소 → 네이버 지오코딩(서버 함수)으로 좌표를 구한다.
// - 좌표가 확인된 대표 골프장은 lib/knownCourses.ts 가 우선한다.

export interface CourseDirectoryEntry {
  /** 이름 */
  n: string;
  /** 주소 */
  a: string;
  /** 홀 수 */
  h?: number;
  /** 대중제 / 회원제 */
  t?: string;
  /** 홈페이지 */
  u?: string;
}

let cache: CourseDirectoryEntry[] | null = null;
let pending: Promise<CourseDirectoryEntry[]> | null = null;

export function loadCourseDirectory(): Promise<CourseDirectoryEntry[]> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = import('../data/golfCourses.json')
      .then((mod) => {
        cache = ((mod as { default: CourseDirectoryEntry[] }).default || []) as CourseDirectoryEntry[];
        return cache;
      })
      .catch((error) => {
        pending = null;
        console.warn('[courseDirectory] load failed', error);
        return [];
      });
  }
  return pending;
}

export function getLoadedCourseDirectory(): CourseDirectoryEntry[] | null {
  return cache;
}

/** 이름 비교용 키: 공백/기호/흔한 접미사(CC, GC, 컨트리클럽, 골프클럽 등) 제거 */
export function courseNameKey(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/비영리|대한민국\s*(육군|해군|공군)|주식회사|\(주\)/g, '')
    .replace(/country\s*club|golf\s*club|golf\s*&\s*resort|golf\s*resort/g, '')
    .replace(/컨트리\s*클럽|컨트리|골프\s*앤\s*리조트|골프\s*&\s*리조트|골프\s*리조트|골프\s*클럽|골프\s*장|골프\s*링크스|골프|클럽|리조트|퍼블릭/g, '')
    .replace(/\b(cc|gc|g\.c|c\.c)\b/g, '')
    .replace(/cc$|gc$/g, '')
    .replace(/[^0-9a-z가-힣]/g, '');
}

function compact(text: string): string {
  return String(text || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
}

/**
 * 자유 텍스트(예약 문자, 골프장 이름)에서 디렉터리 골프장을 찾는다.
 * 1) 이름 키가 완전히 같으면 우선, 2) 텍스트 안에 이름 키가 포함되면 가장 긴 이름을 채택.
 */
export function matchCourse(entries: CourseDirectoryEntry[], text: string): CourseDirectoryEntry | null {
  if (!text || !entries.length) return null;
  const key = courseNameKey(text);
  const haystack = compact(text);
  let best: CourseDirectoryEntry | null = null;
  let bestScore = 0;

  for (const entry of entries) {
    const k = courseNameKey(entry.n);
    if (k.length < 2) continue;
    let score = 0;
    if (k === key) score = 1000 + k.length;
    else if (k.length >= 3 && (haystack.includes(k) || key.includes(k))) score = k.length;
    else if (key.length >= 3 && k.includes(key)) score = key.length - 0.5; // 사용자가 줄여 쓴 이름
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}

/** 자동완성/검색용: 키워드가 이름 또는 주소에 포함된 골프장 */
export function searchCourses(entries: CourseDirectoryEntry[], keyword: string, limit = 10): CourseDirectoryEntry[] {
  const key = courseNameKey(keyword) || compact(keyword);
  if (!key) return [];
  const scored: { e: CourseDirectoryEntry; s: number }[] = [];
  for (const e of entries) {
    const k = courseNameKey(e.n);
    let s = 0;
    if (k === key) s = 3;
    else if (k.startsWith(key)) s = 2;
    else if (k.includes(key)) s = 1.5;
    else if (compact(e.a).includes(key)) s = 1;
    if (s) scored.push({ e, s });
  }
  return scored
    .sort((a, b) => b.s - a.s || a.e.n.length - b.e.n.length)
    .slice(0, limit)
    .map((x) => x.e);
}

export async function findCourseInDirectory(text: string): Promise<CourseDirectoryEntry | null> {
  const entries = await loadCourseDirectory();
  return matchCourse(entries, text);
}
