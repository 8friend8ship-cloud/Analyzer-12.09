
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Helper to safely get environment variables
// Priority: 
// 1. Runtime window.env (Cloud Run / Docker injection)
// 2. Build-time import.meta.env (Vite)
// 3. Fallback (Build-time replacements via define)
const getEnvVar = (key: string, fallback: string): string => {
    // 1. Runtime (window.env)
    // Check for explicit key or VITE_ prefixed key in window.env
    const runtimeEnv = (window as any).env;
    if (runtimeEnv) {
        if (runtimeEnv[key]) return runtimeEnv[key];
        if (runtimeEnv[`VITE_${key}`]) return runtimeEnv[`VITE_${key}`];
    }

    // 2. Build-time (import.meta.env)
    // @ts-ignore
    if (import.meta && import.meta.env) {
        // @ts-ignore
        if (import.meta.env[key]) return import.meta.env[key];
        // @ts-ignore
        if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
    }

    // 3. Fallback (from process.env replacement done by Vite define)
    return fallback;
};

// Vite replaces 'process.env.KEY' with the literal string value at build time.
// We pass these literals as the fallback. 
// Do NOT use `process.env[key]` dynamically as `process` is not defined in the browser.
const firebaseConfig = {
  apiKey: getEnvVar('FIREBASE_API_KEY', process.env.FIREBASE_API_KEY || ""),
  authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', process.env.FIREBASE_AUTH_DOMAIN || ""),
  projectId: getEnvVar('FIREBASE_PROJECT_ID', process.env.FIREBASE_PROJECT_ID || ""),
  storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET', process.env.FIREBASE_STORAGE_BUCKET || ""),
  messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID', process.env.FIREBASE_MESSAGING_SENDER_ID || ""),
  appId: getEnvVar('FIREBASE_APP_ID', process.env.FIREBASE_APP_ID || "")
};

let db: any = null;

// Initialize Firebase only if valid config exists
try {
    const apiKey = firebaseConfig.apiKey;
    // Check for valid API key
    const isValidKey = apiKey && apiKey.trim() !== "" && !apiKey.includes("YOUR_") && apiKey !== "undefined";

    if (isValidKey) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("[Firebase] Initialized successfully.");
    } else {
        console.warn("[Firebase] Config missing or invalid. Caching will default to session storage.");
        // Debugging info without exposing full keys
        console.debug("[Firebase] Config Status:", {
            apiKeyFound: !!apiKey,
            projectIdFound: !!firebaseConfig.projectId
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
