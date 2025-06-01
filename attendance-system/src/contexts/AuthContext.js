// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // import auth และ db จาก firebase.js

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null); // สำหรับเก็บข้อมูลเพิ่มเติมจาก Firestore (เช่น role)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // ถ้ามี user login, ดึงข้อมูลเพิ่มเติมจาก Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserData({ uid: user.uid, ...userDocSnap.data() });
        } else {
          console.warn("User document not found in Firestore for UID:", user.uid);
          setUserData({ uid: user.uid }); // ตั้งค่าพื้นฐานถ้าไม่เจอ document
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const value = {
    currentUser,
    userData, // ส่ง userData ไปด้วย
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}