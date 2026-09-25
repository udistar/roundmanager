import type { Config } from '@netlify/functions';
import { CDN_CACHE_DAY, corsHeaders, fetchNcpMaps, guard, json, parseLngLat } from '../../lib/naverServer';

// GET /api/naver/static-map?w=600&h=400[&center=lng,lat][&level=12][&markers=type:d|size:large|color:red|pos:lng lat ...]
//   → image/png
export default async (req: Request) => {
  const blocked = guard(req);
  if (blocked) return blocked;

  const params = new URL(req.url).searchParams;
  const w = Math.min(Math.max(parseInt(params.get('w') || '600', 10) || 600, 50), 1024);
  const h = Math.min(Math.max(parseInt(params.get('h') || '400', 10) || 400, 50), 1024);
  let q = `/map-static/v2/raster?w=${w}&h=${h}`;

  const center = params.get('center');
  if (center) {
    const c = parseLngLat(center);
    if (!c) return json(req, { ok: false, reason: 'bad_center' }, 400);
    q += `&center=${c.lng},${c.lat}`;
  }
  const level = params.get('level');
  if (level && /^\d{1,2}$/.test(level)) q += `&level=${level}`;

  const markers = params.getAll('markers').slice(0, 10);
  for (const m of markers) {
    if (!/^[A-Za-z0-9:|.,\s가-힣_-]{1,200}$/.test(m)) return json(req, { ok: false, reason: 'bad_marker' }, 400);
    q += `&markers=${encodeURIComponent(m)}`;
  }

  const res = await fetchNcpMaps(q, 'image/png');
  if (!res) return json(req, { ok: false, reason: 'not_configured' }, 503);
  if (!res.ok) return json(req, { ok: false, reason: `upstream_${res.status}` }, 502);

  return new Response(await res.arrayBuffer(), {
    status: 200,
    headers: { 'Content-Type': res.headers.get('content-type') || 'image/png', ...corsHeaders(req), ...CDN_CACHE_DAY },
  });
};

export const config: Config = { path: '/api/naver/static-map' };
