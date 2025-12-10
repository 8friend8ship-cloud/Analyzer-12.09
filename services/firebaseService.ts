
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Placeholder configuration. 
// The app will check if these are real values before attempting to connect.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.FIREBASE_APP_ID || "YOUR_APP_ID"
};

let db: any = null;

try {
    // CRITICAL FIX: Do NOT attempt to initialize if keys are placeholders.
    // This prevents the "Black Screen" on deployment when keys aren't set yet.
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && !firebaseConfig.apiKey.includes("YOUR_")) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("[Firebase] Initialized successfully.");
    } else {
        console.warn("[Firebase] Config missing or using placeholders. Firestore features (Central Cache) are disabled. App will run in standalone mode.");
    }
} catch (e) {
    console.error("[Firebase] Initialization failed:", e);
    // Ensure db is null so the app falls back gracefully
    db = null;
}

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
