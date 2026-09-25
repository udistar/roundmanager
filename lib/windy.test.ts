import { describe, expect, it } from 'vitest';
import { windyEmbedUrl, windyWebUrl } from '../components/WindyMap';

describe('Windy links', () => {
  it('builds the official windy.com detail + map URL with decimal coordinates', () => {
    expect(windyWebUrl(37.9121, 127.2872)).toBe('https://www.windy.com/37.912/127.287?37.912,127.287,11');
    expect(windyWebUrl(38, 127)).toBe('https://www.windy.com/38.000/127.000?38.000,127.000,11');
  });

  it('builds the official embed URL centered on the course', () => {
    const url = windyEmbedUrl(37.9121, 127.2872, 'rain');
    expect(url.startsWith('https://embed.windy.com/embed.html?')).toBe(true);
    expect(url).toContain('overlay=rain');
    expect(url).toContain('lat=37.912&lon=127.287');
    expect(url).toContain('detail=true');
  });
});
