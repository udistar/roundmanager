import type { Config } from '@netlify/functions';
import { fetchNcpMaps, guard, json, parseLngLat } from '../../lib/naverServer';

// GET /api/naver/directions?start=lng,lat&goal=lng,lat[&waypoints=lng,lat|lng,lat][&option=traoptimal|trafast]
//   → { ok, option, path: [lng,lat][], summary }
export default async (req: Request) => {
  const blocked = guard(req);
  if (blocked) return blocked;

  const params = new URL(req.url).searchParams;
  const start = parseLngLat(params.get('start'));
  const goal = parseLngLat(params.get('goal'));
  if (!start || !goal) return json(req, { ok: false, reason: 'bad_coords' }, 400);

  const waypoints = (params.get('waypoints') || '')
    .split('|')
    .filter(Boolean)
    .slice(0, 5)
    .map(parseLngLat);
  if (waypoints.some((w) => !w)) return json(req, { ok: false, reason: 'bad_waypoints' }, 400);

  const requested = params.get('option') === 'trafast' ? 'trafast' : 'traoptimal';
  const options = requested === 'traoptimal' ? ['traoptimal', 'trafast'] : ['trafast'];

  for (const option of options) {
    let q = `/map-direction/v1/driving?start=${start.lng},${start.lat}&goal=${goal.lng},${goal.lat}&option=${option}`;
    if (waypoints.length) q += `&waypoints=${waypoints.map((w) => `${w!.lng},${w!.lat}`).join('|')}`;
    const res = await fetchNcpMaps(q);
    if (!res) return json(req, { ok: false, reason: 'not_configured' }, 503);
    if (!res.ok) continue;
    const data = (await res.json()) as { code?: number; route?: Record<string, { path: [number, number][]; summary: unknown }[]> };
    const route = data.code === 0 ? data.route?.[option]?.[0] : undefined;
    if (route) {
      return json(req, { ok: true, option, path: route.path, summary: route.summary }, 200, { 'Cache-Control': 'no-store' });
    }
  }
  return json(req, { ok: false, reason: 'no_route' }, 502);
};

export const config: Config = { path: '/api/naver/directions' };
