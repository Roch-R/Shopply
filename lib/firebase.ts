import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBwACrZ_RlcOvsrJ7nb4HZDcMFKSJ2gMww",
  authDomain: "roch-fdba7.firebaseapp.com",
  databaseURL: "https://roch-fdba7-default-rtdb.firebaseio.com",
  projectId: "roch-fdba7",
  storageBucket: "roch-fdba7.firebasestorage.app",
  messagingSenderId: "10342567270",
  appId: "1:10342567270:web:0c2989ffb9bd7bbe974ca7",
  measurementId: "G-R1WX76J30G"
};

// Initialize Firebase (safely for SSR/Next.js hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rdb = getDatabase(app);
export const storage = getStorage(app);
