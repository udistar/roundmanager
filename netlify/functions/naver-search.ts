import type { Config } from '@netlify/functions';
import { corsHeaders, fetchNaverSearch, guard, json } from '../../lib/naverServer';

// GET /api/naver/search?query=...&display=5&sort=random|comment|sim  →  Naver 지역검색 응답 그대로 { items: [...] }
export default async (req: Request) => {
  const blocked = guard(req);
  if (blocked) return blocked;

  const params = new URL(req.url).searchParams;
  const query = (params.get('query') || '').trim();
  if (!query || query.length > 100) return json(req, { ok: false, reason: 'bad_query', items: [] }, 400);
  const display = Math.min(Math.max(parseInt(params.get('display') || '5', 10) || 5, 1), 5);
  const sortParam = params.get('sort') || 'random';
  const sort = ['random', 'comment', 'sim', 'date'].includes(sortParam) ? sortParam : 'random';

  const res = await fetchNaverSearch(query, display, sort);
  if (!res) return json(req, { ok: false, reason: 'not_configured', items: [] }, 503);
  if (!res.ok) {
    console.warn(`[naver-search] upstream ${res.status}`);
    return json(req, { ok: false, reason: `upstream_${res.status}`, items: [] }, res.status === 429 ? 429 : 502);
  }

  const body = await res.text();
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(req),
      'Cache-Control': 'public, max-age=600',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=3600',
      'Netlify-Vary': 'query',
    },
  });
};

export const config: Config = { path: '/api/naver/search' };
