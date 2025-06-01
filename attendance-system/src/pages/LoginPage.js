// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth(); // ดึง currentUser และ userData จาก context

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginUser(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        // Login สำเร็จ, AuthContext จะอัปเดต currentUser และ userData
        // การ redirect จะถูกจัดการใน App.js หรือ ProtectedRoute
        // โดยทั่วไปจะ navigate ไป dashboard ตาม role
        // ที่นี่เราจะ navigate ไป /dashboard ก่อน แล้วค่อยแยก role ทีหลัง
        // navigate('/dashboard'); // จะทำใน App.js
      }
    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
      console.error(err);
    }
    setLoading(false);
  };

  // ถ้า login แล้ว และมี userData (หมายถึงดึง role มาได้แล้ว) ให้ redirect
  if (currentUser && userData) {
    if (userData.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userData.role === 'teacher') {
      return <Navigate to="/teacher/dashboard" replace />;
    }
    // ถ้ามี role อื่นๆ หรือไม่มี role (ควรไม่เกิด) อาจจะไปหน้า default หรือ logout
    return <Navigate to="/" replace />; // หรือหน้า profile setting
  }
  // ถ้ากำลังโหลดข้อมูล user จาก AuthContext (currentUser มีค่า แต่ userData ยังไม่มี) ให้แสดง loading
  if (currentUser && !userData) {
    return <div className="flex justify-center items-center h-screen">กำลังโหลดข้อมูลผู้ใช้...</div>;
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            ระบบเช็คชื่อนักเรียน
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            วิทยาลัยการอาชีพวังไกลกังวล
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-wkk-primary focus:border-wkk-primary focus:z-10 sm:text-sm"
                placeholder="อีเมล"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-wkk-primary focus:border-wkk-primary focus:z-10 sm:text-sm"
                placeholder="รหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="my-2">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-wkk-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wkk-primary disabled:opacity-50"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;