<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Rounding Manager

Vite + React SPA for golf tee-time departure planning. Deployed on Netlify.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Run the app: `npm run dev`
3. Paste a booking SMS/Kakao/calendar text, or use **AI 없이 직접 입력**, then save.

Gemini is optional. The app parses bookings locally and still produces a departure plan if AI is down. Do not put `GEMINI_API_KEY` in a `VITE_` variable — that would ship the key in the browser bundle.

On Netlify, add `GEMINI_API_KEY` as a server-only environment variable (or enable Netlify AI Gateway). The `/api/parse-booking` function uses it; the client never sees the key.

## 데이터 / API 구성 (2026-09)

- **골프장 목록**: `data/golfCourses.json` (약 640곳, 이름·주소·홀수·대중제/회원제·홈페이지). 문체부 전국 골프장 현황(2022) CSV + 예전 Naver/Kakao 보강 목록을 `node scripts/build-course-directory.mjs` 로 병합. 앱에서는 필요할 때만 별도 청크로 불러온다. 좌표가 검증된 대표 골프장은 `lib/knownCourses.ts`.
- **네이버 API**: 브라우저는 `/api/naver/{geocode,directions,static-map,search}` (Netlify Functions)만 호출. 비밀키는 Netlify 환경변수 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`(NCP Maps), `NAVER_SEARCH_ID`, `NAVER_SEARCH_SECRET`(Naver Developers 검색)에만 둔다. 키 교체 시 Netlify 환경변수 값만 바꾸면 된다. 지도 JS SDK용 `VITE_NAVER_CLIENT_ID`(공개 ID)만 번들에 포함. 함수 실패 시 Leaflet/OSM 지도 + 거리 기반 이동시간 추정으로 동작.
- **날씨(숫자)**: Netlify Function `/api/weather` → Open-Meteo 예보 API(무료·키 없음, 비상업용 하루 1만 회 미만, CC BY 4.0 출처표시). 골프장 좌표 기준 티업 2시간 전~5시간 후 기온·강수확률·강수량·풍속·풍향 (Open-Meteo 최적 모델 + 기상청 KMA 모델). 16일 이후 날짜는 "예보 범위 밖". 함수가 없으면 브라우저에서 Open-Meteo 직접 호출.
- **바람 지도**: Windy 공식 임베드 위젯(embed.windy.com, 키 없음) — 골프장 좌표 중심, 바람/비·뇌우/구름 전환, 지점 예보 포함. Windy 로고(위젯 내장)는 가리지 말 것. Windy Map Forecast API는 무료(Testing) 키가 운영 사용 금지라 쓰지 않음.
- **로컬 실행**: `netlify dev` (http://localhost:8888, 함수 포함). `npm test`, `npm run typecheck`, `npm run build`.
