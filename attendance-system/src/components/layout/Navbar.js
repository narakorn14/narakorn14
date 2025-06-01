// src/components/layout/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { logoutUser } from '../../services/authService';

function Navbar() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login'); // Redirect to login page after logout
  };

  return (
    <nav className="bg-wkk-primary text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-semibold hover:text-gray-200">
            ระบบเช็คชื่อ วก.วังไกลกังวล
          </Link>
          <div className="flex items-center space-x-4">
            {currentUser && userData && (
              <>
                <span className="text-sm">
                  สวัสดี, {userData.displayName || currentUser.email} ({userData.role})
                </span>
                {/* Navigation Links based on role */}
                {userData.role === 'admin' && (
                  <Link to="/admin/dashboard" className="hover:text-gray-300">แผงควบคุมผู้ดูแล</Link>
                  // เพิ่ม links สำหรับ admin ที่นี่
                )}
                {userData.role === 'teacher' && (
                  <Link to="/teacher/dashboard" className="hover:text-gray-300">แผงควบคุมครู</Link>
                  // เพิ่ม links สำหรับ teacher ที่นี่
                )}
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm"
                >
                  ออกจากระบบ
                </button>
              </>
            )}
            {!currentUser && (
              <Link to="/login" className="hover:text-gray-300">เข้าสู่ระบบ</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;