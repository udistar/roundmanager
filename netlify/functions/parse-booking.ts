import type { Config } from '@netlify/functions';
import { GoogleGenAI, Type } from '@google/genai';
import { enrichWithKnownCourse, mergeManualOverrides, parseBookingLocally } from '../../lib/bookingParser';
import type { ManualBookingFields } from '../../lib/bookingParser';
import type { RoundingInfo } from '../../types';

const SYSTEM_PROMPT = `Extract golf tee-time booking details from Korean SMS, Kakao, or calendar text.
Return JSON only. Use 24-hour HH:mm for teeOffTime. Prefer ISO-like Korean display dates.
If a field is unknown, omit it. Do not invent a course, date, or tee time.`;

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ ok: false, reason: 'method_not_allowed' }, 405);
  }

  let body: { message?: string; manual?: ManualBookingFields } = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid_json' }, 400);
  }

  const message = typeof body.message === 'string' ? body.message : '';
  const manual = body.manual;

  const fallback = () => {
    try {
      return json({ ok: true, source: 'local', info: parseBookingLocally(message, manual) });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'parse_failed';
      return json({ ok: false, reason, source: 'local' }, 200);
    }
  };

  const apiKey = typeof Netlify !== 'undefined' ? Netlify.env.get('GEMINI_API_KEY') : undefined;
  if (!apiKey) {
    return fallback();
  }

  try {
    const ai = new GoogleGenAI({});
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${SYSTEM_PROMPT}\n\nTEXT:\n${message}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            golfCourse: { type: Type.STRING },
            address: { type: Type.STRING },
            date: { type: Type.STRING },
            teeOffTime: { type: Type.STRING },
            greenFee: { type: Type.STRING },
            members: { type: Type.NUMBER },
            booker: { type: Type.STRING },
            arrivalBuffer: { type: Type.NUMBER },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
          },
        },
      },
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback();

    const parsed = JSON.parse(jsonMatch[0]) as RoundingInfo;
    if (!parsed.golfCourse || !parsed.date || !parsed.teeOffTime) {
      return fallback();
    }

    const info = enrichWithKnownCourse(mergeManualOverrides(parsed, manual));
    return json({ ok: true, source: 'gemini', info });
  } catch (error) {
    console.error('[parse-booking] Gemini failed, using local parser', error);
    return fallback();
  }
};

export const config: Config = {
  path: '/api/parse-booking',
  method: 'POST',
};
