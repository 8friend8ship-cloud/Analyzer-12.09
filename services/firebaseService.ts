import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// [중요] 변수(process.env 등)를 쓰지 않고 진짜 키를 직접 입력했습니다.
const firebaseConfig = {
  apiKey: "AIzaSyD5bjpuxIplauAQM-brm7UFhCSx0NBe5Ew",
  authDomain: "crypto-sphere-468511-a7.firebaseapp.com",
  projectId: "crypto-sphere-468511-a7",
  storageBucket: "crypto-sphere-468511-a7.firebasestorage.app",
  messagingSenderId: "42793942510",
  appId: "1:42793942510:web:8deb006b8c556465f2a2ff",
  measurementId: "G-HM6KJQRL9F"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default app;
