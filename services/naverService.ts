// 네이버 API는 모두 Netlify Functions(/api/naver/*)를 거친다.
// 브라우저 번들에는 네이버 비밀키가 들어가지 않는다. (지도 JS SDK의 ncpKeyId만 공개 ID로 사용)

const NETLIFY_URL = 'https://roundmanager.netlify.app';

function isNativeApp(): boolean {
    if (typeof window === 'undefined') return false;
    const cap = (window as any).Capacitor;
    return Boolean(cap?.isNativePlatform?.());
}

// 웹에서는 같은 출처(/api/...), Capacitor 앱에서는 운영 사이트의 함수로 보낸다.
export const API_BASE = isNativeApp() ? NETLIFY_URL : '';

export interface GeoLocation {
    lat: number;
    lng: number;
    address: string;
}

async function getJson<T = any>(path: string, params: Record<string, string | number | undefined>): Promise<T | null> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') qs.append(k, String(v));
    });
    try {
        const res = await fetch(`${API_BASE}${path}?${qs.toString()}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) {
            console.warn(`[naver] ${path} -> ${res.status}`);
            return null;
        }
        return (await res.json()) as T;
    } catch (error) {
        console.warn(`[naver] ${path} failed`, error);
        return null;
    }
}

/** 네이버 지역 검색 (서버 함수 경유). axios 응답과 같은 모양({ data: { items } })으로 돌려준다. */
export async function naverLocalSearch(params: { query: string; display?: number; sort?: string }): Promise<{ data: { items: any[] } }> {
    const data = await getJson<{ items?: any[] }>('/api/naver/search', {
        query: params.query,
        display: Math.min(params.display ?? 5, 5),
        sort: params.sort,
    });
    return { data: { items: Array.isArray(data?.items) ? data!.items : [] } };
}

/**
 * 네이버 Geocoding (서버 함수 경유)
 * @param query 검색할 주소
 */
export async function getGeocode(query: string): Promise<GeoLocation | null> {
    if (!query) return null;
    const data = await getJson<{ ok: boolean; lat: number; lng: number; address: string }>('/api/naver/geocode', { query });
    if (data?.ok && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        return { lat: data.lat, lng: data.lng, address: data.address };
    }
    return null;
}

/**
 * 네이버 Directions 5 (서버 함수 경유). 실패하면 null → 호출부에서 거리 기반 추정으로 대체.
 */
export async function getRoute(start: { lat: number, lng: number }, goal: { lat: number, lng: number }, waypoints?: { lat: number, lng: number }[]) {
    const data = await getJson<{ ok: boolean; path: [number, number][]; summary: any }>('/api/naver/directions', {
        start: `${start.lng},${start.lat}`,
        goal: `${goal.lng},${goal.lat}`,
        waypoints: waypoints && waypoints.length ? waypoints.map(p => `${p.lng},${p.lat}`).join('|') : undefined,
        option: 'traoptimal',
    });
    if (data?.ok && Array.isArray(data.path) && data.summary) {
        return { path: data.path, summary: data.summary, guide: undefined };
    }
    return null;
}

/**
 * 네이버 Static Map (서버 함수 경유) → Blob URL
 */
export async function fetchStaticMapImage(params: {
    width: number;
    height: number;
    center?: { lat: number; lng: number };
    level?: number;
    markers?: { lat: number; lng: number; color?: string; label?: string }[];
}): Promise<string | null> {
    const { width, height, center, level, markers } = params;
    const qs = new URLSearchParams({ w: String(width), h: String(height) });
    if (center) qs.set('center', `${center.lng},${center.lat}`);
    if (level !== undefined) qs.set('level', String(level));
    (markers || []).forEach(m => {
        const label = m.label ? `|label:${m.label}` : '';
        // color는 Naver 규격 값일 때만 지정 (예: 'red' 같은 CSS 이름은 403)
        const color = m.color ? `|color:${m.color}` : '';
        qs.append('markers', `type:d|size:mid${color}|pos:${m.lng} ${m.lat}${label}`);
    });

    try {
        const response = await fetch(`${API_BASE}/api/naver/static-map?${qs.toString()}`);
        if (!response.ok) throw new Error(String(response.status));
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Static Map Fetch Error:", e);
        return null;
    }
}

/**
 * 네이버 검색 API로 장소(POI) 좌표를 가져온다. Geocoding 실패 시 폴백.
 */
export async function searchLocation(query: string): Promise<GeoLocation | null> {
    const { data } = await naverLocalSearch({ query, display: 1, sort: 'random' });
    const item = data.items[0];
    if (!item) return null;
    // 지역검색 mapx/mapy = WGS84 * 10,000,000
    const lat = parseInt(item.mapy, 10) / 10000000;
    const lng = parseInt(item.mapx, 10) / 10000000;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, address: item.roadAddress || item.address };
}
