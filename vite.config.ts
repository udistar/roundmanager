import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 네이버 API 프록시는 더 이상 Vite에 두지 않는다.
// 로컬에서 지도/검색까지 확인하려면 `netlify dev` (함수 /api/naver/* 포함)로 실행.
// `npm run dev` 만 쓰면 함수가 없어서 Leaflet 지도 + 거리 기반 이동시간 추정으로 동작한다.
export default defineConfig(() => {
  return {
    server: {
      port: 3003,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
