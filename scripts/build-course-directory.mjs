#!/usr/bin/env node
// 골프장 디렉터리(data/golfCourses.json) 생성 스크립트.
// 입력:
//   data/source/문화체육관광부_전국골프장현황_20221231.csv  (공공데이터: 지역, 업소명, 소재지, 홀수, 세부종류)
//   data/source/golfCourses_kakao_enriched.json            (구 webapp 사본에서 가져온 Naver/Kakao 보강 목록: title, address, link)
// 출력: data/golfCourses.json  — [{ n: 이름, a: 주소, h?: 홀수, t?: 대중제|회원제, u?: 홈페이지 }]
// 사용: node scripts/build-course-directory.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => path.join(root, 'data', 'source', f);

const REGION = {
  서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시', 광주: '광주광역시',
  대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시', 경기: '경기도', 강원: '강원특별자치도',
  충북: '충청북도', 충남: '충청남도', 전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도',
  경남: '경상남도', 제주: '제주특별자치도',
};
const PROVINCE_ALIASES = [
  ['서울', /^서울/], ['부산', /^부산/], ['대구', /^대구/], ['인천', /^인천/], ['광주', /^광주(광역시)?$/],
  ['대전', /^대전/], ['울산', /^울산/], ['세종', /^세종(시|특별자치시)?$/], ['경기', /^경기/], ['강원', /^강원/],
  ['충북', /^(충북|충청북)/], ['충남', /^(충남|충청남)/], ['전북', /^(전북|전라북)/], ['전남', /^(전남|전라남)/],
  ['경북', /^(경북|경상북)/], ['경남', /^(경남|경상남)/], ['제주', /^제주(도|특별자치도)?$/],
];

function provinceOf(address) {
  const first = (address || '').trim().split(/\s+/)[0] || '';
  const hit = PROVINCE_ALIASES.find(([, re]) => re.test(first));
  return hit ? hit[0] : '';
}

// 이름 비교용 키: 공백/기호/흔한 접미사(CC, GC, 컨트리클럽, 골프클럽 등) 제거
export function nameKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/비영리|대한민국\s*(육군|해군|공군)|주식회사|\(주\)/g, '')
    .replace(/country\s*club|golf\s*club|golf\s*&\s*resort|golf\s*resort/g, '')
    .replace(/컨트리\s*클럽|컨트리|골프\s*앤\s*리조트|골프\s*&\s*리조트|골프\s*리조트|골프\s*클럽|골프\s*장|골프\s*링크스|골프|클럽|리조트|퍼블릭/g, '')
    .replace(/\b(cc|gc|g\.c|c\.c)\b/g, '')
    .replace(/cc$|gc$/g, '')
    .replace(/[^0-9a-z가-힣]/g, '');
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const BAD_LINK = /go\.kr|visitjeju|instagram|blog\.|cafe\.|facebook|youtube|namu\.wiki|wikipedia/i;
const cleanLink = (u) => (u && /^https?:\/\//i.test(u) && !BAD_LINK.test(u) ? u.trim() : undefined);

const csvText = fs.readFileSync(src('문화체육관광부_전국골프장현황_20221231.csv'), 'utf8').replace(/^\uFEFF/, '');
const [header, ...csvRows] = parseCsv(csvText);
const col = (name) => header.findIndex((h) => h.trim().startsWith(name));
const iRegion = col('지역'), iName = col('업소명'), iAddr = col('소재지'), iHoles = col('홀수'), iType = col('세부종류');

const out = [];
const byKey = new Map();
const add = (entry) => {
  out.push(entry);
  const k = nameKey(entry.n);
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(entry);
};

for (const r of csvRows) {
  const name = (r[iName] || '').trim();
  if (!name) continue;
  const region = (r[iRegion] || '').trim();
  let addr = (r[iAddr] || '').trim();
  const prov = REGION[region];
  if (prov && !provinceOf(addr)) addr = `${prov} ${addr}`;
  const holes = parseInt((r[iHoles] || '').replace(/[^0-9]/g, ''), 10);
  const type = (r[iType] || '').trim();
  add({ n: name, a: addr, ...(holes ? { h: holes } : {}), ...(type ? { t: type } : {}) });
}
const csvCount = out.length;

const enriched = JSON.parse(fs.readFileSync(src('golfCourses_kakao_enriched.json'), 'utf8'));
let merged = 0, appended = 0, skippedEmpty = 0;
for (const e of enriched) {
  const name = (e.title || '').trim();
  if (!name) { skippedEmpty++; continue; }
  const k = nameKey(name);
  const prov = provinceOf(e.address);
  const candidates = (k.length >= 2 && byKey.get(k)) || [];
  const match = candidates.find((c) => !prov || provinceOf(c.a) === prov);
  const link = cleanLink(e.link);
  if (match) {
    if (!match.u && link) match.u = link;
    if ((e.address || '').trim().split(/\s+/).length > match.a.split(/\s+/).length + 1) match.a = e.address.trim();
    merged++;
  } else {
    add({ n: name, a: (e.address || '').trim(), ...(link ? { u: link } : {}) });
    appended++;
  }
}

// 같은 이름+주소(회원제/대중제 분리 등록)는 하나로 합친다.
const seen = new Map();
const deduped = [];
for (const e of out) {
  const k = `${nameKey(e.n)}|${e.a.replace(/\s+/g, '')}`;
  const prev = seen.get(k);
  if (!prev) { seen.set(k, e); deduped.push(e); continue; }
  if (e.h) prev.h = (prev.h || 0) + e.h;
  if (e.t && prev.t && !prev.t.includes(e.t)) prev.t = `${prev.t}/${e.t}`;
  else if (e.t && !prev.t) prev.t = e.t;
  if (!prev.u && e.u) prev.u = e.u;
}
out.length = 0;
out.push(...deduped);

out.sort((a, b) => a.a.localeCompare(b.a, 'ko') || a.n.localeCompare(b.n, 'ko'));
fs.writeFileSync(path.join(root, 'data', 'golfCourses.json'), JSON.stringify(out));
console.log(JSON.stringify({ csv: csvCount, enrichedTotal: enriched.length, enrichedEmptySkipped: skippedEmpty, merged, appended, deduped: deduped.length, total: out.length }));
