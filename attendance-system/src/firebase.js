// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3jMgWVbdMKPn0qF4FuQFtd00Mi5OwWFs",
  authDomain: "krunarakorn-kkwind.firebaseapp.com",
  projectId: "krunarakorn-kkwind",
  storageBucket: "krunarakorn-kkwind.firebasestorage.app",
  messagingSenderId: "140766861603",
  appId: "1:140766861603:web:a85ce7f28b4dc0f48d1496",
  measurementId: "G-GDD02M913C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("Firebase initialized with Project ID:", firebaseConfig.projectId); // เพื่อตรวจสอบว่า config ถูกโหลด