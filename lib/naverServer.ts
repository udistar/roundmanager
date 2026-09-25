// Netlify Functions 전용 네이버 API 헬퍼 (브라우저 번들에 포함되지 않음).
// 키는 Netlify 환경변수에서만 읽는다. 키 교체 = Netlify 환경변수 값만 바꾸면 끝.
//   NAVER_CLIENT_ID / NAVER_CLIENT_SECRET       : Naver Cloud Platform Maps (Geocoding, Directions 5, Static Map)
//   NAVER_SEARCH_ID / NAVER_SEARCH_SECRET       : Naver Developers 검색 API (지역 검색)

declare const Netlify: { env: { get(name: string): string | undefined } } | undefined;

export function env(name: string): string | undefined {
  try {
    if (typeof Netlify !== 'undefined' && Netlify?.env) {
      const v = Netlify.env.get(name);
      if (v) return v;
    }
  } catch {
    /* ignore */
  }
  return typeof process !== 'undefined' ? process.env[name] : undefined;
}

// 새 NCP Maps 도메인을 먼저 쓰고, 예전 AI·NAVER API 도메인으로 한 번 더 시도한다.
const MAPS_BASES = ['https://maps.apigw.ntruss.com', 'https://naveropenapi.apigw.ntruss.com'];

const ALLOWED_ORIGINS: RegExp[] = [
  /^https:\/\/roundmanager\.netlify\.app$/,
  /^https:\/\/[a-z0-9-]+--roundmanager\.netlify\.app$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^capacitor:\/\/localhost$/,
];

/** 간단한 남용 방지: 우리 앱(웹/로컬/Capacitor)에서 온 요청만 허용 */
export function isAllowedRequest(req: Request): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  let source = origin || '';
  if (!source && referer) {
    try {
      source = new URL(referer).origin;
    } catch {
      source = '';
    }
  }
  return ALLOWED_ORIGINS.some((re) => re.test(source));
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.some((re) => re.test(origin))) {
    return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
  }
  return {};
}

export function json(req: Request, data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(req), ...extra },
  });
}

/** 공통 가드: 메서드, 출처 확인. 문제 있으면 Response 반환 */
export function guard(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders(req), 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'Content-Type' },
    });
  }
  if (req.method !== 'GET') return json(req, { ok: false, reason: 'method_not_allowed' }, 405);
  if (!isAllowedRequest(req)) return json(req, { ok: false, reason: 'forbidden' }, 403);
  return null;
}

export function mapsKeys(): { id: string; secret: string } | null {
  const id = env('NAVER_CLIENT_ID');
  const secret = env('NAVER_CLIENT_SECRET');
  return id && secret ? { id, secret } : null;
}

export function searchKeys(): { id: string; secret: string } | null {
  const id = env('NAVER_SEARCH_ID');
  const secret = env('NAVER_SEARCH_SECRET');
  return id && secret ? { id, secret } : null;
}

/** NCP Maps API 호출 (도메인 폴백 포함) */
export async function fetchNcpMaps(pathAndQuery: string, accept = 'application/json'): Promise<Response | null> {
  const keys = mapsKeys();
  if (!keys) return null;
  let last: Response | null = null;
  for (const base of MAPS_BASES) {
    try {
      const res = await fetch(`${base}${pathAndQuery}`, {
        headers: {
          'x-ncp-apigw-api-key-id': keys.id,
          'x-ncp-apigw-api-key': keys.secret,
          Accept: accept,
        },
      });
      if (res.ok) return res;
      console.warn(`[naver] ${base.replace('https://', '')}${pathAndQuery.split('?')[0]} -> ${res.status}`);
      last = res;
    } catch (error) {
      console.warn('[naver] request failed', base, error instanceof Error ? error.message : error);
    }
  }
  return last;
}

export async function fetchNaverSearch(query: string, display: number, sort: string): Promise<Response | null> {
  const keys = searchKeys();
  if (!keys) return null;
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}&sort=${encodeURIComponent(sort)}`;
  return fetch(url, {
    headers: {
      'X-Naver-Client-Id': keys.id,
      'X-Naver-Client-Secret': keys.secret,
      Accept: 'application/json',
    },
  });
}

export function parseLngLat(value: string | null): { lng: number; lat: number } | null {
  if (!value) return null;
  const [lng, lat] = value.split(',').map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lat < 32 || lat > 40 || lng < 123 || lng > 133) return null; // 대한민국 범위
  return { lng, lat };
}

export const CDN_CACHE_DAY = {
  'Cache-Control': 'public, max-age=3600',
  'Netlify-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
  'Netlify-Vary': 'query',
};
