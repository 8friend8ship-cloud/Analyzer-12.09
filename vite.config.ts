
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 1. .env 파일 로드
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // 2. 시스템 환경변수(Cloud Run)와 .env 파일 변수 병합
  // process.env는 Node.js 실행 환경(Cloud Run 빌드 등)의 변수를 가져옵니다.
  const processEnv = { ...process.env, ...env };

  return {
    plugins: [react()],
    define: {
      // 코드 내의 'process.env.변수명' 문자열을 실제 값으로 치환합니다.
      // 값이 없으면 빈 문자열("")로 치환하여 브라우저에서 process 객체 접근 오류를 방지합니다.
      'process.env.FIREBASE_API_KEY': JSON.stringify(processEnv.FIREBASE_API_KEY || ""),
      'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(processEnv.FIREBASE_AUTH_DOMAIN || ""),
      'process.env.FIREBASE_PROJECT_ID': JSON.stringify(processEnv.FIREBASE_PROJECT_ID || ""),
      'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(processEnv.FIREBASE_STORAGE_BUCKET || ""),
      'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(processEnv.FIREBASE_MESSAGING_SENDER_ID || ""),
      'process.env.FIREBASE_APP_ID': JSON.stringify(processEnv.FIREBASE_APP_ID || ""),
      'process.env.ADMIN_EMAIL': JSON.stringify(processEnv.ADMIN_EMAIL || ""),
      'process.env.API_KEY': JSON.stringify(processEnv.API_KEY || ""),
    },
  };
});
