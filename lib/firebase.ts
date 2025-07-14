import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBc9RkAa6htGilUDO-z4XG6bpiZAWLuRhg",
  authDomain: "oftware-9201e.firebaseapp.com",
  projectId: "oftware-9201e",
  storageBucket: "oftware-9201e.firebasestorage.app",
  messagingSenderId: "308133539217",
  appId: "1:308133539217:web:a3e929f2202e20ba1b3e30",
  measurementId: "G-2V9CYR8TDS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app; 