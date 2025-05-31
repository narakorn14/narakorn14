// js/firebase-init.js

// Import aฟังก์ชันที่จำเป็นจาก Firebase SDKs
// ตรวจสอบเวอร์ชันล่าสุดจาก Firebase documentation เสมอ
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc
    // คุณสามารถ import ฟังก์ชันอื่นๆ ที่ต้องการใช้ในอนาคตได้ที่นี่
    // เช่น: addDoc, query, where, getDocs, onSnapshot, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// ถ้าต้องการใช้ Authentication:
// import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// TODO: แทนที่ด้วย Firebase project configuration ของคุณ!
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

// Initialize Cloud Firestore และ export เพื่อให้ส่วนอื่นของแอปใช้งานได้
const db = getFirestore(app);

// (Optional) Initialize Firebase Authentication
// const auth = getAuth(app);

// Export สิ่งที่คุณต้องการให้ส่วนอื่นของแอปพลิเคชันสามารถ import ไปใช้ได้
export {
    db,
    collection,
    doc,
    setDoc,
    getDoc,
    // auth, // ถ้าคุณใช้ Authentication
    // onAuthStateChanged, // ตัวอย่างถ้าใช้ auth
    // signInWithEmailAndPassword // ตัวอย่างถ้าใช้ auth
};