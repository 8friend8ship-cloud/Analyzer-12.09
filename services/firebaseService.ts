
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Environment Variable Helper
// 1. window.env (Runtime Injection from env-config.js) -> Priority for Cloud Run
// 2. import.meta.env (Vite Build) -> Fallback
// 3. process.env (Standard Node/Webpack) -> Fallback
const getEnv = (key: string): string => {
    // Check window.env first (Runtime)
    // @ts-ignore
    if (typeof window !== 'undefined' && window.env) {
        // @ts-ignore
        const runtimeVal = window.env[key] || window.env[`VITE_${key}`];
        if (runtimeVal) return runtimeVal;
    }
    
    // Check Vite's import.meta.env
    // @ts-ignore
    if (import.meta && import.meta.env) {
        // @ts-ignore
        const metaVal = import.meta.env[key] || import.meta.env[`VITE_${key}`];
        if (metaVal) return metaVal;
    }

    // Fallback to process.env (replaced by Vite define or present in Node env)
    try {
        return process.env[key] || process.env[`VITE_${key}`] || "";
    } catch (e) {
        return "";
    }
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
    // Check for valid API key (not empty, not default placeholder, not undefined)
    const isValidKey = apiKey && apiKey.trim() !== "" && !apiKey.includes("YOUR_") && apiKey !== "undefined";

    if (isValidKey) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("[Firebase] Initialized successfully with Key:", apiKey.substring(0, 5) + "...");
    } else {
        console.warn("[Firebase] Config missing or invalid. Check env-config.js or environment variables.");
        // Debugging info to help user trace the issue
        console.debug("[Firebase] Current Config State:", {
            apiKey: !!firebaseConfig.apiKey,
            projectId: !!firebaseConfig.projectId,
            windowEnv: typeof window !== 'undefined' ? (window as any).env : 'undefined'
        });
        db = null;
    }
} catch (e) {
    console.error("[Firebase] Initialization error (Cache disabled):", e);
    db = null;
}

// --- Ranking Logic ---

export const getRankingFromFirestore = async (key: string) => {
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

// --- Search Result Logic ---

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
