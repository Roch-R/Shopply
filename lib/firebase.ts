import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDesMBn0S2_mKQwT-dcHP6oSanntLrlsn8",
  authDomain: "roch-1ec06.firebaseapp.com",
  projectId: "roch-1ec06",
  storageBucket: "roch-1ec06.firebasestorage.app",
  messagingSenderId: "619772569023",
  appId: "1:619772569023:web:579568ddd6b108e2e52d0a",
  measurementId: "G-Y1RFZWH7TK"
};

// Initialize Firebase (safely for SSR/Next.js hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
