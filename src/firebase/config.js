import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBX--DvWSqPT00fh85PeHJZCxSY3NG9hhE",
  authDomain: "lingvist-plus.firebaseapp.com",
  projectId: "lingvist-plus",
  storageBucket: "lingvist-plus.firebasestorage.app",
  messagingSenderId: "449593151353",
  appId: "1:449593151353:web:6151bd408271616a65e9a8",
  measurementId: "G-TP4TX39FPN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
