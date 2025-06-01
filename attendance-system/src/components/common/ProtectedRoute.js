// src/components/common/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// allowedRoles: array of strings, e.g., ['admin', 'teacher']
// ถ้าไม่ระบุ allowedRoles คือแค่ login ก็พอ
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    // แสดง loading spinner หรือ component ขณะรอตรวจสอบสถานะ auth
    return <div className="flex justify-center items-center h-screen">กำลังตรวจสอบสิทธิ์...</div>;
  }

  if (!currentUser) {
    // ถ้ายังไม่ login ให้ redirect ไปหน้า login พร้อมจำ path เดิมไว้
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ถ้า login แล้ว และมีการกำหนด allowedRoles
  if (allowedRoles && userData) {
    if (!allowedRoles.includes(userData.role)) {
      // ถ้า role ไม่ตรงกับที่อนุญาต
      // อาจจะ redirect ไปหน้า "Access Denied" หรือหน้าหลักของผู้ใช้นั้นๆ
      console.warn(`User role "${userData.role}" not in allowedRoles: ${allowedRoles}`);
      // สำหรับตอนนี้, ถ้า role ไม่ตรง ให้ redirect ไปหน้าหลัก
      // หรืออาจจะสร้างหน้า UnauthorizePage
      if (userData.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
      if (userData.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
      return <Navigate to="/" replace />; // หน้า fallback
    }
  } else if (allowedRoles && !userData) {
    // กรณี currentUser มี แต่ userData (ที่ควรมี role) ยังไม่มา (อาจจะกำลัง fetch)
    // ปกติ AuthContext ควรจัดการให้ userData มาพร้อม currentUser ถ้า login สำเร็จ
    return <div className="flex justify-center items-center h-screen">กำลังโหลดข้อมูลผู้ใช้...</div>;
  }


  return children; // ถ้าผ่านเงื่อนไขทั้งหมด แสดง children (Component ที่ต้องการป้องกัน)
};

export default ProtectedRoute;