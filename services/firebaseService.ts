
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Configuration logic: 
// 1. Runtime Injection (window.env via env-config.js) -> For Cloud Run / Production
// 2. Build-time Injection (process.env via Vite) -> For Local Dev
const getEnv = (key: string) => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.env && window.env[key]) {
        // @ts-ignore
        return window.env[key];
    }
    // Fallback to Vite define replacement
    return process.env[key];
}

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID')
};

let db: any = null;

// Initialize Firebase only if valid config exists
try {
    const apiKey = firebaseConfig.apiKey;
    // Check for valid API key (not empty, not default placeholder)
    const isValidKey = apiKey && apiKey.trim() !== "" && !apiKey.includes("YOUR_") && apiKey !== "undefined";

    if (isValidKey) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("[Firebase] Initialized successfully with runtime config.");
    } else {
        // Silently disable Firestore if keys are missing (prevents scary warnings causing confusion)
        console.warn("[Firebase] Config missing or invalid. Cache disabled. Key exists:", !!apiKey);
        db = null;
    }
} catch (e) {
    console.error("[Firebase] Initialization error (Cache disabled):", e);
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
