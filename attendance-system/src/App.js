// src/App.js
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar'; // สร้างภายหลัง

// สร้าง Placeholder Components สำหรับ Dashboard ต่างๆ ก่อน
const AdminDashboardPlaceholder = () => (
  <div>
    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
    <p>ยินดีต้อนรับ ผู้ดูแลระบบ!</p>
    {/* ส่วนนี้จะถูกแทนที่ด้วย Admin Dashboard จริงๆ */}
  </div>
);
const TeacherDashboardPlaceholder = () => (
  <div>
    <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
    <p>ยินดีต้อนรับ คุณครู!</p>
    {/* ส่วนนี้จะถูกแทนที่ด้วย Teacher Dashboard จริงๆ */}
  </div>
);
const HomePagePlaceholder = () => {
  const { currentUser, userData } = useAuth();
  if (currentUser && userData) {
    if (userData.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (userData.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  }
  // ถ้าไม่ login หรือไม่มี role ที่รู้จัก ให้ไป login
  return <Navigate to="/login" replace />;
};

// สร้าง Layout Component แบบง่ายๆ สำหรับหน้าที่มี Navbar
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar /> {/* Navbar จะแสดงในทุกหน้าที่ใช้ Layout นี้ */}
      <main className="container mx-auto p-4 mt-4">
        <Outlet /> {/* Outlet คือที่ที่ Nested Routes จะถูก render */}
      </main>
    </div>
  );
};


function App() {
  const { loading: authLoading } = useAuth(); // เพื่อรอให้ AuthContext โหลดเสร็จก่อน render routes

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen text-xl">กำลังโหลดแอปพลิเคชัน...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Routes ที่ต้อง Login และมี Navbar */}
      <Route element={<AppLayout />}>
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPlaceholder />
            </ProtectedRoute>
          }
        />
        {/* เพิ่ม Routes อื่นๆ ของ Admin ที่นี่ภายใต้ ProtectedRoute และ AppLayout */}
        {/* เช่น /admin/manage-teachers, /admin/manage-classes */}

        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboardPlaceholder />
            </ProtectedRoute>
          }
        />
        {/* เพิ่ม Routes อื่นๆ ของ Teacher ที่นี่ภายใต้ ProtectedRoute และ AppLayout */}
        {/* เช่น /teacher/my-classes, /teacher/attendance/:classId */}
      </Route>

      {/* Route หลัก, ถ้า login แล้วจะ redirect ตาม role, ถ้าไม่ ให้ไป login */}
      <Route path="/" element={<HomePagePlaceholder />} />

      {/* Fallback Route สำหรับ URL ที่ไม่ตรงกับ Route ไหนเลย */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;