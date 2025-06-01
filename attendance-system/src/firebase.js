// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);