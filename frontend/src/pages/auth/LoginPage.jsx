import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  KeyRound,
  CheckCircle2,
  User,
  UserPlus,
  Phone,
  Building,
  Briefcase,
  Sparkles,
  Check,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState('student'); // 'student' | 'staff' | 'admin'
  const [regRegisterNumber, setRegRegisterNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regPhone, setRegPhone] = useState('');

  // Academic metadata for registration
  const [regDeptId, setRegDeptId] = useState('');
  const [regCourseId, setRegCourseId] = useState('');
  const [regSectionId, setRegSectionId] = useState('');
  const [regAdmissionYear, setRegAdmissionYear] = useState(2026);
  const [regDesignation, setRegDesignation] = useState('Assistant Professor');
  const [regSpecialization, setRegSpecialization] = useState('');

  const [academicOptions, setAcademicOptions] = useState({
    departments: [],
    courses: [],
    sections: [],
  });

  // Forgot password & reset state
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Load registration options on mount
  useEffect(() => {
    async function loadAcademicOptions() {
      try {
        const res = await fetch('/api/v1/auth/registration-options');
        if (res.ok) {
          const data = await res.json();
          setAcademicOptions(data);
          if (data.departments?.length > 0) {
            setRegDeptId(String(data.departments[0].id));
          }
          if (data.courses?.length > 0) {
            setRegCourseId(String(data.courses[0].id));
          }
          if (data.sections?.length > 0) {
            setRegSectionId(String(data.sections[0].id));
          }
        }
      } catch (err) {
        console.warn('Failed to load academic registration options:', err);
      }
    }
    loadAcademicOptions();
  }, []);

  // Filter courses based on selected department
  const filteredCourses = academicOptions.courses.filter(
    (c) => !regDeptId || String(c.department_id) === String(regDeptId)
  );

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '', color: '#CBD5E1' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: 'Basic', color: '#EF4444' };
    if (score <= 3) return { score: 2, text: 'Medium', color: '#F59E0B' };
    return { score: 3, text: 'Strong', color: '#10B981' };
  };

  const passStrength = getPasswordStrength(regPassword);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!identifier || !password) {
      setError('Please provide both username/email and password.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const user = await login(identifier, password, rememberMe);
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'staff') {
        navigate('/staff');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!regFullName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!regEmail.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        register_number: regRegisterNumber.trim() || null,
        phone: regPhone.trim() || null,
      };

      if (regRole === 'student') {
        payload.department_id = regDeptId ? parseInt(regDeptId, 10) : null;
        payload.course_id = regCourseId ? parseInt(regCourseId, 10) : null;
        payload.section_id = regSectionId ? parseInt(regSectionId, 10) : null;
        payload.admission_year = regAdmissionYear ? parseInt(regAdmissionYear, 10) : 2026;
      } else if (regRole === 'staff') {
        payload.department_id = regDeptId ? parseInt(regDeptId, 10) : null;
        payload.designation = regDesignation;
        payload.specialization = regSpecialization.trim() || null;
      }

      const user = await register(payload);
      setSuccessMessage(`Account created successfully! Welcome, ${user.full_name}.`);

      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'staff') {
        navigate('/staff');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e) => {
    e?.preventDefault();
    if (!resetIdentifier) {
      setError('Please provide your email or register number.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: resetIdentifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.detail || 'Password reset request failed.');
      }

      setSuccessMessage(data.message || 'Reset token generated.');
      if (data.reset_token) {
        setResetToken(data.reset_token);
      }
      setMode('reset');
    } catch (err) {
      setError(err.message || 'Failed to request reset token.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (!resetToken || !newPassword) {
      setError('Please provide the reset token and your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.detail || 'Password reset failed.');
      }

      setSuccessMessage('Password reset successfully! Please sign in with your new password.');
      setIdentifier(resetIdentifier);
      setPassword('');
      setResetToken('');
      setNewPassword('');
      setMode('login');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (role) => {
    setError('');
    setSuccessMessage('');
    if (role === 'student') {
      setIdentifier('student@camponu.edu');
      setPassword('Student@123');
    } else if (role === 'staff') {
      setIdentifier('alan.turing@camponu.edu');
      setPassword('Staff@123');
    } else if (role === 'admin') {
      setIdentifier('admin@camponu.edu');
      setPassword('Admin@123');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 12% 18%, rgba(249, 115, 22, 0.12) 0%, transparent 45%), radial-gradient(circle at 88% 82%, rgba(79, 70, 229, 0.16) 0%, transparent 45%), #0A0F1D',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient background grid lines */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: mode === 'register' ? '540px' : '450px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        padding: '2.5rem 2.25rem',
        position: 'relative',
        zIndex: 10,
        transition: 'max-width 0.25s ease',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-white)',
            boxShadow: '0 10px 25px -4px rgba(249, 115, 22, 0.45)',
            marginBottom: '0.85rem',
            position: 'relative',
          }}>
            <GraduationCap size={34} />
          </div>

          <h1 style={{ fontFamily: 'var(--font-brand)', fontSize: '1.95rem', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            CAMPON <span style={{ color: 'var(--color-primary)' }}>U</span>
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', fontWeight: 500 }}>
            AI-Powered College Operating System
          </p>
        </div>

        {/* Primary Segmented Tab Switcher: Sign In vs Create Account */}
        {(mode === 'login' || mode === 'register') && (
          <div style={{
            display: 'flex',
            backgroundColor: '#F1F5F9',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            border: '1px solid #E2E8F0',
          }}>
            <button
              type="button"
              id="tab-sign-in"
              onClick={() => {
                setError('');
                setSuccessMessage('');
                setMode('login');
              }}
              style={{
                flex: 1,
                padding: '0.65rem 0.5rem',
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 3px)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: mode === 'login' ? 700 : 500,
                backgroundColor: mode === 'login' ? '#FFFFFF' : 'transparent',
                color: mode === 'login' ? 'var(--color-text-main)' : 'var(--color-text-secondary)',
                boxShadow: mode === 'login' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
              }}
            >
              <Lock size={15} color={mode === 'login' ? 'var(--color-primary)' : 'currentColor'} /> Sign In
            </button>
            <button
              type="button"
              id="tab-create-account"
              onClick={() => {
                setError('');
                setSuccessMessage('');
                setMode('register');
              }}
              style={{
                flex: 1,
                padding: '0.65rem 0.5rem',
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 3px)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: mode === 'register' ? 700 : 500,
                backgroundColor: mode === 'register' ? '#FFFFFF' : 'transparent',
                color: mode === 'register' ? 'var(--color-text-main)' : 'var(--color-text-secondary)',
                boxShadow: mode === 'register' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
              }}
            >
              <UserPlus size={15} color={mode === 'register' ? 'var(--color-primary)' : 'currentColor'} /> Create Account
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="alert-box alert-success animate-fade-in" style={{ marginBottom: '1.25rem' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.85rem' }}>{successMessage}</div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="alert-box alert-error animate-fade-in" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.85rem' }}>{error}</div>
          </div>
        )}

        {/* VIEW 1: Standard Login Form */}
        {mode === 'login' && (
          <>
            {/* Demo Quick-Fill Selectors */}
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              marginBottom: '1.35rem',
            }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', textAlign: 'center' }}>
                Instant Demo Account Auto-Fill
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('student')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.2rem', fontWeight: 600 }}
                  id="demo-student-btn"
                >
                  🎓 Student
                </button>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('staff')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.2rem', fontWeight: 600 }}
                  id="demo-staff-btn"
                >
                  👨‍🏫 Faculty
                </button>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('admin')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.2rem', fontWeight: 600 }}
                  id="demo-admin-btn"
                >
                  🛡️ Admin
                </button>
              </div>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
                  Email or Register Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="student@camponu.edu or 2026CSE001"
                    required
                    id="login-identifier-input"
                    style={{
                      width: '100%',
                      padding: '0.72rem 0.75rem 0.72rem 2.5rem',
                      fontSize: '0.9rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    id="login-password-input"
                    style={{
                      width: '100%',
                      padding: '0.72rem 2.5rem 0.72rem 2.5rem',
                      fontSize: '0.9rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--color-text-secondary)', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccessMessage('');
                    setResetIdentifier(identifier || 'student@camponu.edu');
                    setMode('forgot');
                  }}
                  style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                  id="forgot-password-link"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '0.85rem', marginTop: '0.4rem', fontSize: '0.95rem' }}
                id="login-submit-btn"
              >
                {loading ? 'Authenticating...' : (
                  <>
                    Sign In to CAMPON U <ArrowRight size={17} />
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccessMessage('');
                    setMode('register');
                  }}
                  style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Create one now
                </button>
              </div>
            </form>
          </>
        )}

        {/* VIEW 2: Self Registration Form */}
        {mode === 'register' && (
          <div className="animate-fade-in">
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Role Selector Cards */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.45rem' }}>
                  Campus Account Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setRegRole('student')}
                    id="role-student-btn"
                    style={{
                      padding: '0.75rem 0.4rem',
                      borderRadius: 'var(--radius-md)',
                      border: regRole === 'student' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: regRole === 'student' ? 'var(--color-primary-subtle)' : '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                      transition: 'all 0.15s ease',
                      boxShadow: regRole === 'student' ? '0 2px 8px rgba(249, 115, 22, 0.18)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.35rem' }}>🎓</span>
                    <span style={{ fontSize: '0.825rem', fontWeight: regRole === 'student' ? 700 : 500, color: regRole === 'student' ? 'var(--color-primary-dark)' : 'var(--color-text-main)' }}>
                      Student
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('staff')}
                    id="role-staff-btn"
                    style={{
                      padding: '0.75rem 0.4rem',
                      borderRadius: 'var(--radius-md)',
                      border: regRole === 'staff' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: regRole === 'staff' ? 'var(--color-primary-subtle)' : '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                      transition: 'all 0.15s ease',
                      boxShadow: regRole === 'staff' ? '0 2px 8px rgba(249, 115, 22, 0.18)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.35rem' }}>👨‍🏫</span>
                    <span style={{ fontSize: '0.825rem', fontWeight: regRole === 'staff' ? 700 : 500, color: regRole === 'staff' ? 'var(--color-primary-dark)' : 'var(--color-text-main)' }}>
                      Faculty
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('admin')}
                    id="role-admin-btn"
                    style={{
                      padding: '0.75rem 0.4rem',
                      borderRadius: 'var(--radius-md)',
                      border: regRole === 'admin' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: regRole === 'admin' ? 'var(--color-primary-subtle)' : '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                      transition: 'all 0.15s ease',
                      boxShadow: regRole === 'admin' ? '0 2px 8px rgba(249, 115, 22, 0.18)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.35rem' }}>🛡️</span>
                    <span style={{ fontSize: '0.825rem', fontWeight: regRole === 'admin' ? 700 : 500, color: regRole === 'admin' ? 'var(--color-primary-dark)' : 'var(--color-text-main)' }}>
                      Admin
                    </span>
                  </button>
                </div>
              </div>

              {/* Full Name & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.3rem' }}>
                    Full Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Maya Sharma"
                      required
                      id="reg-fullname-input"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.65rem 0.65rem 2.2rem',
                        fontSize: '0.85rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.3rem' }}>
                    Email Address *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="maya@camponu.edu"
                      required
                      id="reg-email-input"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.65rem 0.65rem 2.2rem',
                        fontSize: '0.85rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Register / ID Number (Optional with auto-gen info) & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.3rem' }}>
                    {regRole === 'student' ? 'Register / Roll No' : (regRole === 'staff' ? 'Faculty Employee ID' : 'Admin ID')}
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '4px' }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={regRegisterNumber}
                    onChange={(e) => setRegRegisterNumber(e.target.value)}
                    placeholder="Auto-generated if empty"
                    id="reg-id-input"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.3rem' }}>
                    Contact Phone
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      id="reg-phone-input"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.65rem 0.65rem 2.2rem',
                        fontSize: '0.85rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* STUDENT ROLE FIELDS */}
              {regRole === 'student' && (
                <div style={{
                  backgroundColor: '#F8FAFC',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building size={14} /> Academic Placement
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                        Department
                      </label>
                      <select
                        value={regDeptId}
                        onChange={(e) => setRegDeptId(e.target.value)}
                        id="reg-dept-select"
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          fontSize: '0.8rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        {academicOptions.departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                        Degree Course
                      </label>
                      <select
                        value={regCourseId}
                        onChange={(e) => setRegCourseId(e.target.value)}
                        id="reg-course-select"
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          fontSize: '0.8rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        {filteredCourses.length > 0 ? (
                          filteredCourses.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))
                        ) : (
                          academicOptions.courses.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                        Section
                      </label>
                      <select
                        value={regSectionId}
                        onChange={(e) => setRegSectionId(e.target.value)}
                        id="reg-section-select"
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          fontSize: '0.8rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        {academicOptions.sections.map((s) => (
                          <option key={s.id} value={s.id}>Section {s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                        Admission Year
                      </label>
                      <input
                        type="number"
                        min="2020"
                        max="2030"
                        value={regAdmissionYear}
                        onChange={(e) => setRegAdmissionYear(Number(e.target.value))}
                        id="reg-year-input"
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          fontSize: '0.8rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#FFFFFF',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* FACULTY / STAFF ROLE FIELDS */}
              {regRole === 'staff' && (
                <div style={{
                  backgroundColor: '#F8FAFC',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Briefcase size={14} /> Faculty Appointment
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                        Department
                      </label>
                      <select
                        value={regDeptId}
                        onChange={(e) => setRegDeptId(e.target.value)}
                        id="reg-staff-dept-select"
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          fontSize: '0.8rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        {academicOptions.departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                        Designation
                      </label>
                      <select
                        value={regDesignation}
                        onChange={(e) => setRegDesignation(e.target.value)}
                        id="reg-designation-select"
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          fontSize: '0.8rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Professor">Professor</option>
                        <option value="Head of Department">Head of Department (HOD)</option>
                        <option value="Lecturer">Lecturer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                      Research Specialization
                    </label>
                    <input
                      type="text"
                      value={regSpecialization}
                      onChange={(e) => setRegSpecialization(e.target.value)}
                      placeholder="e.g. Distributed Computing, Machine Learning"
                      id="reg-specialization-input"
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        fontSize: '0.8rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Password & Confirm Password */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.3rem' }}>
                    Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      required
                      id="reg-password-input"
                      style={{
                        width: '100%',
                        padding: '0.65rem 2.2rem 0.65rem 2.2rem',
                        fontSize: '0.85rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                      aria-label="Toggle password"
                    >
                      {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.3rem' }}>
                    Confirm Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      id="reg-confirm-password-input"
                      style={{
                        width: '100%',
                        padding: '0.65rem 2.2rem 0.65rem 2.2rem',
                        fontSize: '0.85rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                      aria-label="Toggle confirm password"
                    >
                      {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Indicator Bar */}
              {regPassword && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '-0.35rem' }}>
                  <div style={{ flex: 1, display: 'flex', gap: '3px', height: '4px' }}>
                    <div style={{ flex: 1, backgroundColor: passStrength.score >= 1 ? passStrength.color : '#E2E8F0', borderRadius: '2px', transition: 'all 0.2s' }} />
                    <div style={{ flex: 1, backgroundColor: passStrength.score >= 2 ? passStrength.color : '#E2E8F0', borderRadius: '2px', transition: 'all 0.2s' }} />
                    <div style={{ flex: 1, backgroundColor: passStrength.score >= 3 ? passStrength.color : '#E2E8F0', borderRadius: '2px', transition: 'all 0.2s' }} />
                  </div>
                  <span style={{ fontSize: '0.725rem', color: passStrength.color, fontWeight: 700 }}>
                    {passStrength.text}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.95rem' }}
                id="register-submit-btn"
              >
                {loading ? 'Creating Campus Account...' : (
                  <>
                    <UserPlus size={17} /> Register & Sign In to CAMPON U
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccessMessage('');
                    setMode('login');
                  }}
                  style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Sign in here
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 3: Forgot Password (Request Token) */}
        {mode === 'forgot' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '1.35rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                Reset Your Password
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                Enter your university email or register number to receive a secure reset token.
              </p>
            </div>

            <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
                  Email or Register Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="student@camponu.edu or 2026CSE001"
                    required
                    style={{
                      width: '100%',
                      padding: '0.72rem 0.75rem 0.72rem 2.5rem',
                      fontSize: '0.9rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '0.85rem' }}
                id="request-reset-btn"
              >
                {loading ? 'Generating Token...' : (
                  <>
                    Request Reset Token <KeyRound size={17} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSuccessMessage('');
                  setMode('login');
                }}
                className="btn-secondary"
                style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </form>
          </div>
        )}

        {/* VIEW 4: Reset Password (Enter Token + New Password) */}
        {mode === 'reset' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '1.35rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                Set New Password
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                Enter the one-time reset token and your new password.
              </p>
            </div>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
                  Reset Token
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste your reset token here"
                    required
                    style={{
                      width: '100%',
                      padding: '0.72rem 0.75rem 0.72rem 2.5rem',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
                  New Password (min. 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    style={{
                      width: '100%',
                      padding: '0.72rem 2.5rem 0.72rem 2.5rem',
                      fontSize: '0.9rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    aria-label="Toggle new password visibility"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '0.85rem' }}
                id="confirm-reset-btn"
              >
                {loading ? 'Updating Password...' : (
                  <>
                    Confirm & Update Password <CheckCircle2 size={17} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSuccessMessage('');
                  setMode('login');
                }}
                className="btn-secondary"
                style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </form>
          </div>
        )}

        {/* Security badge footer */}
        <div style={{
          marginTop: '2.25rem',
          textAlign: 'center',
          borderTop: '1px solid #E2E8F0',
          paddingTop: '1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.775rem',
          color: 'var(--color-text-secondary)',
          fontWeight: 500,
        }}>
          <span className="pulse-dot pulse-green" />
          <Shield size={14} color="var(--color-success)" />
          Argon2id Salted Hashes • Role Session Isolation Active
        </div>
      </div>
    </div>
  );
}
