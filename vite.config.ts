import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3003,
      host: '0.0.0.0',
      proxy: {
        // 기존 지도 API 프록시 (Cloud API)
        '/naver-api': {
          target: 'https://maps.apigw.ntruss.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/naver-api/, ''),
          secure: false,
        },
        // 기존 지도 API 프록시 (Open API)
        '/naver-map': {
          target: 'https://naveropenapi.apigw.ntruss.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/naver-map/, ''),
        },
        // ✅ [추가] 검색 API 프록시 (맛집 검색용 - openapi.naver.com)
        '/naver-search': {
          target: 'https://openapi.naver.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/naver-search/, ''),
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // 검색 API는 X-Naver-Client-Id/Secret 헤더를 사용
              // 클라이언트에서 보낸 헤더를 그대로 전달
              const clientId = req.headers['x-naver-client-id'];
              const clientSecret = req.headers['x-naver-client-secret'];

              if (clientId) {
                proxyReq.setHeader('X-Naver-Client-Id', clientId);
              }
              if (clientSecret) {
                proxyReq.setHeader('X-Naver-Client-Secret', clientSecret);
              }
            });
          },
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});