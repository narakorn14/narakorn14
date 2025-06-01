// src/services/authService.js
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // หลังจาก login สำเร็จ, AuthContext จะจัดการดึงข้อมูล user จาก onAuthStateChanged
    return { user: userCredential.user };
  } catch (error) {
    console.error("Error logging in:", error);
    return { error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out:", error);
    return { error: error.message };
  }
};

// ฟังก์ชันสำหรับ Admin สร้าง User (ครู)
// หมายเหตุ: การสร้าง User โดยตรงแบบนี้อาจต้องมีการจัดการเรื่อง Password Reset
// หรือ Admin กำหนด Password ชั่วคราวให้
export const createTeacherUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name in Firebase Auth
    await updateProfile(user, { displayName });

    // Add user to Firestore 'users' collection with role 'teacher'
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      role: 'teacher',
      assignedClasses: [] // เริ่มต้นด้วยห้องเรียนว่าง
    });
    return { user };
  } catch (error)
  {
    console.error("Error creating teacher user:", error);
    // อาจจะต้องจัดการกรณี email already in use (error.code === 'auth/email-already-in-use')
    return { error: error.message, errorCode: error.code };
  }
};

// ฟังก์ชันสำหรับดึงข้อมูล User จาก Firestore (อาจไม่จำเป็นถ้า AuthContext จัดการแล้ว)
export const getUserDataFromFirestore = async (uid) => {
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return { uid, ...docSnap.data() };
    } else {
      console.log("No such user document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return { error: error.message };
  }
};