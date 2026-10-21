import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import StudentDashboard from './pages/student/StudentDashboard';
import StaffDashboard from './pages/staff/StaffDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import './App.css';

// Root router helper to route authenticated users directly to their dashboard
function RootRoute() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        backgroundColor: 'var(--color-bg-main)'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          border: '3px solid #E2E8F0',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
          Initializing CAMPON U...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'staff') return <Navigate to="/staff" replace />;
  return <Navigate to="/student" replace />;
}

// Redirect if already logged in when visiting /login
function PublicOnlyRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'staff') return <Navigate to="/staff" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Root dynamic redirect */}
          <Route path="/" element={<RootRoute />} />

          {/* Public Login Route */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          {/* Role-Protected Dashboards */}
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff/*"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
