// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Tailwind CSS และ global styles
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // Import AuthProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router> {/* ครอบ App ด้วย Router */}
      <AuthProvider> {/* ครอบ App ด้วย AuthProvider */}
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);