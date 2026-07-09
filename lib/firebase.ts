import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCpnHKz0UAcvny-UgAaOfsxVWIbFKfOKW8",
  authDomain: "roch-fdba7.firebaseapp.com",
  projectId: "roch-fdba7",
  storageBucket: "roch-fdba7.firebasestorage.app",
  messagingSenderId: "10342567270",
  appId: "1:10342567270:web:0c2989ffb9bd7bbe974ca7",
  measurementId: "G-R1WX76J30G"
};

// Initialize Firebase (safely for SSR/Next.js hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
