
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Configuration
// vite.config.ts의 define 설정에 의해 'process.env.KEY' 문자열 자체가 빌드 시점에 실제 값(문자열)으로 바뀝니다.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let db: any = null;

try {
    // 키 유효성 검사 및 초기화
    // 빈 문자열("")이나 기본값("YOUR_API_KEY")이 아닐 때만 초기화
    const apiKey = firebaseConfig.apiKey;
    if (apiKey && apiKey !== "" && apiKey !== "YOUR_API_KEY" && !apiKey.includes("YOUR_")) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("[Firebase] Initialized successfully with Cloud Run config.");
    } else {
        console.warn("[Firebase] Environment variables missing. Firestore features (Central Cache) are disabled. (Current Key Status: " + (apiKey ? "Present" : "Missing") + ")");
    }
} catch (e) {
    console.error("[Firebase] Initialization failed:", e);
    db = null;
}

// --- Ranking Logic ---

export const getRankingFromFirestore = async (key: string) => {
    // Safety check: If DB isn't ready, behave as if data is missing (cache miss)
    if (!db) return null;
    
    try {
        const docRef = doc(db, "rankings", key);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().data;
        }
        return null;
    } catch (e) {
        console.error("[Firestore] Read error (continuing with live API):", e);
        return null;
    }
};

export const setRankingInFirestore = async (key: string, data: any) => {
    // Safety check: If DB isn't ready, skip saving
    if (!db) return;
    
    try {
        const docRef = doc(db, "rankings", key);
        await setDoc(docRef, {
            data: data,
            timestamp: new Date().toISOString()
        });
        console.log(`[Firestore] Data saved for key: ${key}`);
    } catch (e) {
        console.error("[Firestore] Write error:", e);
    }
};

// --- Search Result Logic (New) ---

export const getSearchResultsFromFirestore = async (key: string) => {
    if (!db) return null;

    try {
        const docRef = doc(db, "search_results", key);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const result = docSnap.data();
            return {
                data: result.data,
                timestamp: result.timestamp
            };
        }
        return null;
    } catch (e) {
        console.error("[Firestore] Search read error:", e);
        return null;
    }
};

export const setSearchResultsInFirestore = async (key: string, data: any) => {
    if (!db) return;

    try {
        const docRef = doc(db, "search_results", key);
        await setDoc(docRef, {
            data: data,
            timestamp: new Date().toISOString()
        });
        console.log(`[Firestore] Search results saved for key: ${key}`);
    } catch (e) {
        console.error("[Firestore] Search write error:", e);
    }
};
