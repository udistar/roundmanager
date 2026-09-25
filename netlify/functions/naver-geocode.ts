import type { Config } from '@netlify/functions';
import { CDN_CACHE_DAY, fetchNcpMaps, guard, json } from '../../lib/naverServer';

// GET /api/naver/geocode?query=주소  →  { ok, lat, lng, address }
export default async (req: Request) => {
  const blocked = guard(req);
  if (blocked) return blocked;

  const query = (new URL(req.url).searchParams.get('query') || '').trim();
  if (!query || query.length > 200) return json(req, { ok: false, reason: 'bad_query' }, 400);

  const res = await fetchNcpMaps(`/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`);
  if (!res) return json(req, { ok: false, reason: 'not_configured' }, 503);
  if (!res.ok) return json(req, { ok: false, reason: `upstream_${res.status}` }, 502);

  const data = (await res.json()) as { status?: string; addresses?: { x: string; y: string; roadAddress?: string; jibunAddress?: string }[] };
  const first = data.addresses?.[0];
  if (!first) return json(req, { ok: false, reason: 'not_found' }, 200, CDN_CACHE_DAY);
  return json(
    req,
    { ok: true, lat: parseFloat(first.y), lng: parseFloat(first.x), address: first.roadAddress || first.jibunAddress || query },
    200,
    CDN_CACHE_DAY,
  );
};

export const config: Config = { path: '/api/naver/geocode' };
