import { describe, expect, it } from 'vitest';
import { buildWeatherFromOpenMeteo, toIsoDate, teeHourOf, weatherCodeToKorean, windDirKo } from './weather';

describe('Open-Meteo weather mapping', () => {
  it('parses display dates and tee hours', () => {
    expect(toIsoDate('2026년 10월 12일 (일)')).toBe('2026-10-12');
    expect(toIsoDate('2026-10-02')).toBe('2026-10-02');
    expect(teeHourOf('07:32')).toBe(7);
    expect(weatherCodeToKorean(61)).toBe('비');
    expect(weatherCodeToKorean(0)).toBe('맑음');
    expect(windDirKo(0)).toBe('북풍');
    expect(windDirKo(225)).toBe('남서풍');
  });

  it('builds tee-time cards per model', () => {
    const time = Array.from({ length: 24 }, (_, h) => `2026-10-12T${String(h).padStart(2, '0')}:00`);
    const fill = (v: number) => Array.from({ length: 24 }, () => v);
    const data = {
      hourly: {
        time,
        temperature_2m_best_match: fill(14.2),
        precipitation_probability_best_match: fill(30),
        precipitation_best_match: fill(0.1),
        weather_code_best_match: fill(3),
        wind_speed_10m_best_match: fill(3.4),
        wind_direction_10m_best_match: fill(315),
        temperature_2m_kma_seamless: fill(13.8),
        precipitation_probability_kma_seamless: fill(null as unknown as number),
        precipitation_kma_seamless: fill(0),
        weather_code_kma_seamless: fill(0),
        wind_speed_10m_kma_seamless: fill(2.0),
        wind_direction_10m_kma_seamless: fill(90),
      },
    };
    const cards = buildWeatherFromOpenMeteo(data, '2026-10-12', 7);
    expect(cards).toHaveLength(2);
    expect(cards[0].source).toBe('Open-Meteo');
    expect(cards[0].temperature).toBe('14°C');
    expect(cards[0].condition).toBe('흐림');
    expect(cards[0].precipitation).toBe('0.1mm (30%)');
    expect(cards[0].hourly[0].time).toBe('05:00');
    expect(cards[0].hourly).toHaveLength(8); // 티업 2시간 전 ~ 5시간 후
    expect(cards[0].wind).toBe('북서풍 3.4m/s');
    expect(cards[0].hourly[0].windDeg).toBe(315);
    expect(cards[1].wind).toBe('동풍 2.0m/s');
    expect(cards[1].source).toBe('기상청 모델');
    expect(cards[1].precipitation).toBe('0.0mm');
  });
});
