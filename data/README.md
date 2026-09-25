# 골프장 데이터

- `golfCourses.json` — 앱에서 쓰는 병합 결과. 필드: `n` 이름, `a` 주소, `h` 홀수, `t` 대중제/회원제, `u` 홈페이지.
- `source/문화체육관광부_전국골프장현황_20221231.csv` — 공공데이터포털 문화체육관광부 전국 골프장 현황(2022-12-31).
- `source/golfCourses_kakao_enriched.json` — 예전 webapp 사본(C:\Projects\webapp\roundmanager)의 1,014행 보강 목록.
  실제 값이 있는 행은 489개이고 나머지 525행은 CSV 인코딩 문제로 비어 있던 행이다(병합 시 제외, CSV에서 다시 채움).

재생성: `node scripts/build-course-directory.mjs`
