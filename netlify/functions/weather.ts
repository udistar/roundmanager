import type { Config } from '@netlify/functions';
import { guard, json } from '../../lib/naverServer';
import { buildWeatherFromOpenMeteo, daysBetween, FORECAST_DAYS, openMeteoUrl, outOfRangeCard, seoulToday } from '../../lib/weather';

// GET /api/weather?lat=37.91&lng=127.29&date=2026-10-02&tee=8
//   → { ok, cards: WeatherData[] }  (티업 2시간 전 ~ 5시간 후, Open-Meteo 최적 모델 + 기상청 KMA 모델)
// Open-Meteo 무료 API: 비상업용, 하루 10,000회 미만, CC BY 4.0 출처표시. 키 불필요.
export default async (req: Request) => {
  const blocked = guard(req);
  if (blocked) return blocked;

  const p = new URL(req.url).searchParams;
  const lat = Number(p.get('lat'));
  const lng = Number(p.get('lng'));
  const date = p.get('date') || '';
  const tee = Math.min(Math.max(parseInt(p.get('tee') || '8', 10) || 8, 0), 23);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 32 || lat > 40 || lng < 123 || lng > 133) {
    return json(req, { ok: false, reason: 'bad_coords' }, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(req, { ok: false, reason: 'bad_date' }, 400);

  const ahead = daysBetween(seoulToday(), date);
  if (ahead >= FORECAST_DAYS) return json(req, { ok: true, cards: [outOfRangeCard(ahead)] });
  if (ahead < -60) return json(req, { ok: false, reason: 'too_old' }, 400);

  try {
    const res = await fetch(openMeteoUrl(lat, lng, date));
    if (!res.ok) return json(req, { ok: false, reason: `upstream_${res.status}` }, 502);
    const cards = buildWeatherFromOpenMeteo(await res.json(), date, tee);
    return json(req, { ok: true, source: 'open-meteo', cards }, 200, {
      'Cache-Control': 'public, max-age=900',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=1800',
      'Netlify-Vary': 'query',
    });
  } catch (error) {
    console.warn('[weather] open-meteo failed', error instanceof Error ? error.message : error);
    return json(req, { ok: false, reason: 'upstream_error' }, 502);
  }
};

export const config: Config = { path: '/api/weather' };
