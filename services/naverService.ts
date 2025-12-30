
import { RoundingInfo } from "../types";

const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
const NAVER_CLIENT_SECRET = import.meta.env.VITE_NAVER_MAP_CLIENT_SECRET;
// Proxy Prefix (defined in vite.config.ts)
const PROXY_BASE = '/naver-api';

export interface GeoLocation {
    lat: number;
    lng: number;
    address: string;
}

/**
 * 네이버 Geocoding API를 사용하여 주소의 좌표를 가져옵니다.
 * @param query 검색할 주소
 */
export async function getGeocode(query: string): Promise<GeoLocation | null> {
    try {
        const response = await fetch(`${PROXY_BASE}/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                'x-ncp-apigw-api-key-id': NAVER_CLIENT_ID,
                'x-ncp-apigw-api-key': NAVER_CLIENT_SECRET,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Naver Geocoding API Error:', response.statusText);
            return null;
        }

        const data = await response.json();
        if (data.status === 'OK' && data.addresses && data.addresses.length > 0) {
            const address = data.addresses[0];
            return {
                lat: parseFloat(address.y),
                lng: parseFloat(address.x),
                address: address.roadAddress || address.jibunAddress
            };
        }
        return null;
    } catch (error) {
        console.error('Failed to fetch geocode:', error);
        return null;
    }
}

/**
 * 네이버 Directions 5 API를 사용하여 경로 좌표를 가져옵니다. (필요 시 사용)
 */
export async function getRoute(start: { lat: number, lng: number }, goal: { lat: number, lng: number }, waypoints?: { lat: number, lng: number }[]) {
    const startStr = `${start.lng},${start.lat}`;
    const goalStr = `${goal.lng},${goal.lat}`;

    // traoptimal: 실시간 최적 경로 옵션 사용
    let url = `${PROXY_BASE}/map-direction/v1/driving?start=${startStr}&goal=${goalStr}&option=traoptimal`;

    if (waypoints && waypoints.length > 0) {
        const wayPointsStr = waypoints.map(p => `${p.lng},${p.lat}`).join('|');
        url += `&waypoints=${wayPointsStr}`;
    }

    try {
        console.log('[getRoute] Requesting:', url);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-ncp-apigw-api-key-id': NAVER_CLIENT_ID,
                'x-ncp-apigw-api-key': NAVER_CLIENT_SECRET,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('[getRoute] HTTP Error:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('[getRoute] Error Response:', errorText);
            return null;
        }

        const data = await response.json();
        console.log('[getRoute] Response:', data);

        if (data.code === 0 && data.route && data.route.traoptimal) {
            const routeInfo = data.route.traoptimal[0];
            console.log('[getRoute] Success! Duration:', routeInfo.summary.duration, 'ms');
            return {
                path: routeInfo.path, // [lng, lat] 배열
                summary: routeInfo.summary,
                guide: routeInfo.guide
            };
        }

        console.warn('[getRoute] Invalid response code:', data.code);
        return null;
    } catch (error) {
        console.error('[getRoute] Failed to fetch route:', error);
        return null;
    }
}

/**
 * 네이버 Static Map API를 사용하여 지도 이미지를 fetch하고 Blob URL을 반환합니다.
 * (Header 인증 사용을 위해 img tag src 대신 fetch 사용)
 */
export async function fetchStaticMapImage(params: {
    width: number;
    height: number;
    center?: { lat: number; lng: number };
    level?: number;
    markers?: { lat: number; lng: number; color?: string; label?: string }[];
}): Promise<string | null> {
    const { width, height, center, level, markers } = params;
    // Use /raster endpoint (Server Auth) via Proxy
    let url = `${PROXY_BASE}/map-static/v2/raster?w=${width}&h=${height}`;

    if (center) {
        url += `&center=${center.lng},${center.lat}`;
    }
    if (level !== undefined) {
        url += `&level=${level}`;
    }

    if (markers && markers.length > 0) {
        const markersStr = markers
            .map(m => {
                const color = m.color || 'red';
                const size = 'large'; // Changed from 'mid' to 'large'
                const type = 'd'; // Default marker type
                const label = m.label || '';
                return `type:${type}|size:${size}|color:${color}|pos:${m.lng}%20${m.lat}${label ? `|label:${label}` : ''}`;
            })
            .map(m => `markers=${m}`)
            .join('&');
        url += `&${markersStr}`;
    }

    try {
        const response = await fetch(url, {
            headers: {
                'x-ncp-apigw-api-key-id': NAVER_CLIENT_ID,
                'x-ncp-apigw-api-key': NAVER_CLIENT_SECRET
            }
        });
        if (!response.ok) throw new Error(response.statusText);

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Static Map Fetch Error:", e);
        return null;
    }
}

const SEARCH_CLIENT_ID = import.meta.env.VITE_NAVER_SEARCH_ID || import.meta.env.VITE_NAVER_CLIENT_ID;
const SEARCH_CLIENT_SECRET = import.meta.env.VITE_NAVER_SEARCH_SECRET || import.meta.env.VITE_NAVER_CLIENT_SECRET;

/**
 * 네이버 검색 API를 사용하여 장소(POI)의 좌표를 가져옵니다.
 * Geocoding API가 실패할 경우 Fallback으로 사용합니다.
 */
export async function searchLocation(query: string): Promise<GeoLocation | null> {
    try {
        // 검색 API 프록시 사용 (/naver-search)
        const url = `/naver-search/v1/search/local.json?query=${encodeURIComponent(query)}&display=1&sort=random`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Naver-Client-Id': SEARCH_CLIENT_ID,
                'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Naver Search API Error:', response.statusText);
            return null;
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            // Naver Search API returns mapx/mapy as integers (Lat/Lng * 10,000,000)
            const lat = parseInt(item.mapy) / 10000000;
            const lng = parseInt(item.mapx) / 10000000;

            return {
                lat,
                lng,
                address: item.roadAddress || item.address
            };
        }
        return null;

    } catch (error) {
        console.error('Failed to search location:', error);
        return null;
    }
}

