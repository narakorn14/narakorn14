// Your web app's Firebase configuration
// FOR DEMO PURPOSES ONLY - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyBBNcEj9ACYcRwIdb5el3mePfzefFU9OiI",
    authDomain: "kkwvc-attendance.firebaseapp.com",
    projectId: "kkwvc-attendance",
    storageBucket: "kkwvc-attendance.firebasestorage.app",
    messagingSenderId: "932264235716",
    appId: "1:932264235716:web:2e77d2bfe0e9a5fd96ef91",
    measurementId: "G-PCQLPLXM6H"
  };

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Export Firebase services for use in other modules
// (If using ES6 modules, otherwise make them global or pass them around)
// For simplicity in Vanilla JS, we might attach them to window or use them directly
// window.fbAuth = auth;
// window.fbDb = db;