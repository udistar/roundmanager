// 날씨 예보: Netlify Function /api/weather (Open-Meteo, 키 불필요) 경유.
// 함수가 없을 때(npm run dev 단독 등)는 Open-Meteo를 브라우저에서 직접 호출한다.
import type { RoundingInfo, WeatherData } from '../types';
import { API_BASE } from './naverService';
import {
  buildWeatherFromOpenMeteo,
  daysBetween,
  FORECAST_DAYS,
  openMeteoUrl,
  missingCoordsCard,
  outOfRangeCard,
  pastRoundCard,
  seoulToday,
  teeHourOf,
  toIsoDate,
  unparsableDateCard,
} from '../lib/weather';

export { buildWeatherFromOpenMeteo, teeHourOf, toIsoDate, weatherCodeToKorean, windDirKo } from '../lib/weather';

export async function fetchOpenMeteoWeather(info: RoundingInfo, now = new Date()): Promise<WeatherData[]> {
  // 조용히 빈 결과를 돌려주지 않고, 이유를 카드 메시지로 보여준다.
  const isoDate = toIsoDate(info.date, now);
  if (!isoDate) return [unparsableDateCard(info.date)];
  if (!info.lat || !info.lng) return [missingCoordsCard()];

  const ahead = daysBetween(seoulToday(now), isoDate);
  if (ahead >= FORECAST_DAYS) return [outOfRangeCard(ahead)];
  if (ahead < -60) return [pastRoundCard()];

  const teeHour = teeHourOf(info.teeOffTime);
  try {
    const qs = new URLSearchParams({ lat: info.lat.toFixed(4), lng: info.lng.toFixed(4), date: isoDate, tee: String(teeHour) });
    const res = await fetch(`${API_BASE}/api/weather?${qs.toString()}`, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && Array.isArray(data.cards)) return data.cards as WeatherData[];
    }
    console.warn('[weather] function unavailable, calling Open-Meteo directly', res.status);
  } catch (error) {
    console.warn('[weather] function failed, calling Open-Meteo directly', error);
  }

  const res = await fetch(openMeteoUrl(info.lat, info.lng, isoDate));
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  return buildWeatherFromOpenMeteo(await res.json(), isoDate, teeHour);
}
