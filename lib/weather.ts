// Open-Meteo 응답 → 화면용 WeatherData 변환 (브라우저/Netlify Function 공용, 순수 함수)
// 데이터 출처 표기 의무: "Weather data by Open-Meteo.com" (CC BY 4.0)
import type { HourlyWeather, WeatherData } from '../types';
import { daysBetween, parseDateField, seoulToday } from './dates';

const DIRS_KO = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];

/** 풍향(도, 불어오는 방향) → 16방위 한글 */
export function windDirKo(deg: number | null | undefined): string {
  if (deg == null || Number.isNaN(deg)) return '';
  return DIRS_KO[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16] + '풍';
}

export const MODELS: { id: string; label: string }[] = [
  { id: 'best_match', label: 'Open-Meteo' },
  { id: 'kma_seamless', label: '기상청 모델' },
];
export const HOURLY_VARS = ['temperature_2m', 'precipitation_probability', 'precipitation', 'weather_code', 'wind_speed_10m', 'wind_direction_10m'];
export const FORECAST_DAYS = 16;

export function weatherCodeToKorean(code: number | null | undefined): string {
  if (code == null || Number.isNaN(code)) return '정보 없음';
  if (code === 0) return '맑음';
  if (code === 1) return '대체로 맑음';
  if (code === 2) return '구름 조금';
  if (code === 3) return '흐림';
  if (code === 45 || code === 48) return '안개';
  if (code >= 51 && code <= 57) return '이슬비';
  if (code >= 61 && code <= 67) return code >= 65 ? '강한 비' : '비';
  if (code >= 71 && code <= 77) return '눈';
  if (code >= 80 && code <= 82) return '소나기(비)';
  if (code === 85 || code === 86) return '눈 소나기';
  if (code >= 95) return '천둥번개';
  return '구름';
}

/** '2026년 10월 12일 (일)', '2026-10-12', '2026.10.12' → '2026-10-12' */
/** 날짜 문자열 → YYYY-MM-DD (연도 없는 "10월 2일", "10/2", "10.2(금)" 은 한국 시간 기준으로 연도 추정) */
export function toIsoDate(date: string | undefined, now: Date = new Date()): string | null {
  return parseDateField(date, now);
}

export function teeHourOf(teeOffTime: string | undefined): number {
  const m = (teeOffTime || '').match(/(\d{1,2})\s*[:시]/);
  const h = m ? parseInt(m[1], 10) : 8;
  return Math.min(Math.max(h, 0), 23);
}

export { seoulToday, daysBetween };

type Hourly = Record<string, (number | null)[] | string[]>;

const fmt = (v: number | null | undefined, digits = 0, unit = '') =>
  v == null || Number.isNaN(v) ? '-' : `${Number(v).toFixed(digits)}${unit}`;

/** Open-Meteo 응답 → 화면용 WeatherData[] (모델별 카드 1개) */
export function buildWeatherFromOpenMeteo(data: { hourly?: Hourly }, isoDate: string, teeHour: number, models = MODELS): WeatherData[] {
  const hourly = data.hourly;
  if (!hourly || !Array.isArray(hourly.time)) return [];
  const times = hourly.time as string[];
  const multi = models.length > 1;
  const series = (name: string, model: string) =>
    ((hourly[multi ? `${name}_${model}` : name] as (number | null)[] | undefined) || []);

  const startHour = Math.max(teeHour - 2, 0);
  const endHour = Math.min(teeHour + 5, 23);
  const results: WeatherData[] = [];

  for (const model of models) {
    const temp = series('temperature_2m', model.id);
    const pop = series('precipitation_probability', model.id);
    const precip = series('precipitation', model.id);
    const code = series('weather_code', model.id);
    const wind = series('wind_speed_10m', model.id);
    const dir = series('wind_direction_10m', model.id);

    const idx = (h: number) => times.indexOf(`${isoDate}T${String(h).padStart(2, '0')}:00`);
    const teeIdx = idx(teeHour);
    if (teeIdx < 0 || temp[teeIdx] == null) continue;

    const hours: HourlyWeather[] = [];
    let maxPop = 0;
    let sumPrecip = 0;
    let maxWind = 0;
    for (let h = startHour; h <= endHour; h++) {
      const i = idx(h);
      if (i < 0 || temp[i] == null) continue;
      const p = pop[i];
      const r = precip[i] ?? 0;
      maxPop = Math.max(maxPop, p ?? 0);
      sumPrecip += r || 0;
      maxWind = Math.max(maxWind, wind[i] ?? 0);
      hours.push({
        time: `${String(h).padStart(2, '0')}:00`,
        temp: fmt(temp[i], 0, '°C'),
        condition: weatherCodeToKorean(code[i]),
        precip: p == null ? `${fmt(r, 1, 'mm')}` : `${fmt(r, 1, 'mm')} (${Math.round(p)}%)`,
        wind: `${windDirKo(dir[i])} ${fmt(wind[i], 1, 'm/s')}`.trim(),
        windDeg: dir[i] ?? undefined,
        pop: p ?? undefined,
      });
    }

    const teePop = pop[teeIdx];
    const rainy = maxPop >= 60 || sumPrecip >= 1;
    const windy = maxWind >= 8;
    const summary = [
      `라운딩 시간대(${String(startHour).padStart(2, '0')}~${String(endHour).padStart(2, '0')}시)`,
      pop.some((v) => v != null) ? `최대 강수확률 ${Math.round(maxPop)}%` : '',
      `예상 강수량 합계 ${sumPrecip.toFixed(1)}mm`,
      `최대 풍속 ${maxWind.toFixed(1)}m/s`,
    ].filter(Boolean).join(', ');
    const advice = rainy ? '우산·우의와 여벌 장갑을 챙기세요.' : windy ? '바람이 강하니 클럽 선택에 유의하세요.' : '비 소식은 크지 않은 편입니다.';

    results.push({
      source: model.label,
      temperature: fmt(temp[teeIdx], 0, '°C'),
      condition: weatherCodeToKorean(code[teeIdx]),
      wind: `${windDirKo(dir[teeIdx])} ${fmt(wind[teeIdx], 1, 'm/s')}`.trim(),
      windDeg: dir[teeIdx] ?? undefined,
      precipitation: teePop == null ? fmt(precip[teeIdx] ?? 0, 1, 'mm') : `${fmt(precip[teeIdx] ?? 0, 1, 'mm')} (${Math.round(teePop)}%)`,
      hourly: hours,
      nowcast: `${summary}. ${advice}`,
      satelliteDescription: `Open-Meteo 예보 API(${model.id}) 시간별 예보입니다 (Weather data by Open-Meteo.com, CC BY 4.0). 위성/레이더 판독이 아니며, 실시간 비구름은 네이버 레이더·Windy 지도에서 확인하세요.`,
    });
  }
  return results;
}

export function openMeteoUrl(lat: number, lng: number, isoDate: string): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    hourly: HOURLY_VARS.join(','),
    models: MODELS.map((m) => m.id).join(','),
    timezone: 'Asia/Seoul',
    wind_speed_unit: 'ms',
    start_date: isoDate,
    end_date: isoDate,
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

/** 16일 초과 등 예보 불가 카드 */
/** 예보를 보여줄 수 없을 때 카드 (날씨 섹션에 message 로 표시) */
export function messageCard(condition: string, message: string): WeatherData {
  return { source: 'Open-Meteo', temperature: '-', wind: '-', precipitation: '-', condition, hourly: [], error: true, message };
}

export function outOfRangeCard(ahead: number): WeatherData {
  return messageCard(`예보 범위 밖 (D-${ahead})`, `예보는 티업 ${FORECAST_DAYS}일 전부터 볼 수 있어요 (티업까지 ${ahead}일 남음)`);
}

export function unparsableDateCard(raw: string | undefined): WeatherData {
  return messageCard('날짜 인식 실패', `날짜${raw ? ` "${raw}"` : ''}를 인식하지 못해 날씨를 불러올 수 없어요. 라운드 날짜를 2026-10-02 형식으로 수정해 주세요.`);
}

export function missingCoordsCard(): WeatherData {
  return messageCard('위치 정보 없음', '골프장 위치(좌표)를 찾지 못해 날씨를 불러올 수 없어요.');
}

export function pastRoundCard(): WeatherData {
  return messageCard('지난 라운드', '지난 라운드라 예보를 보여드릴 수 없어요.');
}

export function weatherUnavailableCard(): WeatherData {
  return messageCard('연결 실패', '날씨 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
}
