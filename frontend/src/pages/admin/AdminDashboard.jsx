import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building,
  Users,
  Clock,
  Shield,
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Download,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // States
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Form states
  const [userSearch, setUserSearch] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptHead, setNewDeptHead] = useState('');

  // New Student modal/form
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studEmail, setStudEmail] = useState('');
  const [studReg, setStudReg] = useState('');
  const [studName, setStudName] = useState('');
  const [studPass, setStudPass] = useState('Student@123');
  const [studDeptId, setStudDeptId] = useState('');
  const [studCourseId, setStudCourseId] = useState('');

  // Timetable slot form
  const [slotDay, setSlotDay] = useState('Monday');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('10:00');
  const [slotSubjId, setSlotSubjId] = useState('');
  const [slotStaffId, setSlotStaffId] = useState(1);
  const [slotSecId, setSlotSecId] = useState(1);
  const [slotRoom, setSlotRoom] = useState('Hall 301');
  const [timetableError, setTimetableError] = useState('');

  const fetchHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [stRes, dpRes, crRes, sbRes, usRes, ttRes, auRes] = await Promise.all([
        fetch('/api/v1/admin/stats', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/admin/departments', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/admin/courses', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/admin/subjects', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/admin/users', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/admin/timetable/slots', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/admin/audit-logs', { headers: fetchHeaders }).then((r) => r.json()),
      ]);

      setStats(stRes);
      setDepartments(dpRes);
      setCourses(crRes);
      setSubjects(sbRes);
      setUsers(usRes);
      setTimetableSlots(ttRes);
      setAuditLogs(auRes);

      if (dpRes.length > 0) setStudDeptId(dpRes[0].id);
      if (crRes.length > 0) setStudCourseId(crRes[0].id);
      if (sbRes.length > 0) setSlotSubjId(sbRes[0].id);
    } catch (e) {
      console.error("Admin data load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptCode || !newDeptName) return;

    try {
      const res = await fetch('/api/v1/admin/departments', {
        method: 'POST',
        headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newDeptCode, name: newDeptName, head_of_dept: newDeptHead }),
      });
      if (res.ok) {
        setNewDeptCode('');
        setNewDeptName('');
        setNewDeptHead('');
        loadData();
      } else {
        const err = await res.json();
        alert(err.detail || err.error?.message);
      }
    } catch (e) {
      alert("Error creating department.");
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/users/student', {
        method: 'POST',
        headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studEmail,
          register_number: studReg,
          full_name: studName,
          password: studPass,
          department_id: parseInt(studDeptId),
          course_id: parseInt(studCourseId),
          section_id: 1,
        }),
      });

      if (res.ok) {
        setShowAddStudent(false);
        setStudEmail('');
        setStudReg('');
        setStudName('');
        loadData();
      } else {
        const err = await res.json();
        alert(err.detail || err.error?.message);
      }
    } catch (e) {
      alert("Error adding student.");
    }
  };

  const handleToggleUserActive = async (userId) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/toggle-active`, {
        method: 'POST',
        headers: fetchHeaders,
      });
      if (res.ok) loadData();
    } catch (e) {
      alert("Toggle user status error.");
    }
  };

  const handleCreateTimetableSlot = async (e) => {
    e.preventDefault();
    setTimetableError('');
    try {
      const res = await fetch('/api/v1/admin/timetable/slots', {
        method: 'POST',
        headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: slotDay,
          start_time: slotStartTime,
          end_time: slotEndTime,
          subject_id: parseInt(slotSubjId),
          staff_id: parseInt(slotStaffId),
          section_id: parseInt(slotSecId),
          room_number: slotRoom,
        }),
      });

      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        setTimetableError(err.error?.message || err.detail);
      }
    } catch (e) {
      setTimetableError('Error creating timetable slot.');
    }
  };

  const navItems = [
    { id: 'overview', label: 'Institutional KPIs', icon: <LayoutDashboard size={18} /> },
    { id: 'academic', label: 'Academic Structure', icon: <Building size={18} /> },
    { id: 'users', label: 'User Directory', icon: <Users size={18} /> },
    { id: 'timetable', label: 'Timetable Builder', icon: <Clock size={18} /> },
    { id: 'reports', label: 'CSV Data Reports', icon: <FileSpreadsheet size={18} /> },
    { id: 'audit', label: 'Security Audit Logs', icon: <Shield size={18} /> },
  ];

  if (loading && !stats) {
    return (
      <DashboardLayout navItems={navItems} activeTab={activeTab} onTabChange={setActiveTab}>
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 1rem' }} />
          Loading administrator governance workspace...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} activeTab={activeTab} onTabChange={setActiveTab}>
      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Welcome Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            color: 'var(--color-white)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <span className="badge badge-error" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  CAMPUS GOVERNANCE & CONTROL
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>• Relational Database Active</span>
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Welcome, Chancellor & Administrators
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.35rem', fontWeight: 500 }}>
                Operations Status: 100% Operational • Role Session Isolation Active
              </p>
            </div>
            <div style={{ textAlign: 'right', position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Aggregate Attendance Rate
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F8FAFC', marginTop: '0.2rem' }}>
                {stats.overall_attendance_percentage}%
              </div>
              <div style={{ marginTop: '0.4rem' }}>
                <span className="badge badge-success" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  Institutional Health Good
                </span>
              </div>
            </div>
          </div>

          {/* KPI Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem' }}>
            <div className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Active Students</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                    {stats.total_students}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <Users size={20} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.65rem' }}>
                Enrolled campus-wide
              </div>
            </div>

            <div className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Teaching Faculty</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                    {stats.total_staff}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <Shield size={20} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.65rem' }}>
                Active professors & lecturers
              </div>
            </div>

            <div className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Departments</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                    {stats.total_departments}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                  <Building size={20} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.65rem' }}>
                Operational departments
              </div>
            </div>

            <div className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Degree Programs</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                    {stats.total_courses}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                  <FileSpreadsheet size={20} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.65rem' }}>
                Accredited curricula
              </div>
            </div>

            <div className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Active Book Loans</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                    {stats.active_library_loans}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.65rem' }}>
                Library circulating items
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Academic Structure Tab */}
      {activeTab === 'academic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Add Department Form */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Add Academic Department</h3>
            <form onSubmit={handleCreateDepartment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Code (e.g. CSE)</label>
                <input
                  type="text"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Department Name</label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Head of Department</label>
                <input
                  type="text"
                  value={newDeptHead}
                  onChange={(e) => setNewDeptHead(e.target.value)}
                  placeholder="e.g. Dr. John Doe"
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <div>
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.65rem' }}>
                  <Plus size={16} /> Save Department
                </button>
              </div>
            </form>
          </div>

          {/* Departments & Courses Lists */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Departments ({departments.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {departments.map((d) => (
                  <div key={d.id} style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="badge badge-warning" style={{ marginRight: '0.5rem' }}>{d.code}</span>
                      <strong style={{ fontSize: '0.875rem' }}>{d.name}</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{d.head_of_dept || 'HOD Pending'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Subjects ({subjects.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                {subjects.map((s) => (
                  <div key={s.id} style={{ padding: '0.65rem 0.85rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="badge badge-success" style={{ marginRight: '0.5rem' }}>{s.code}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Sem {s.semester_number} • {s.credits} Credits</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Directory Tab */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Search size={18} color="var(--color-text-muted)" />
              <input
                type="text"
                placeholder="Search user by name, email, register no..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', width: '280px' }}
              />
            </div>
            <button onClick={() => setShowAddStudent(!showAddStudent)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <Plus size={16} /> Register New Student
            </button>
          </div>

          {/* Add Student Modal / Collapsible Form */}
          {showAddStudent && (
            <div className="card" style={{ backgroundColor: '#FFFDF9', borderColor: 'var(--color-primary)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Register New Student Account</h3>
              <form onSubmit={handleCreateStudent} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Full Name</label>
                  <input type="text" value={studName} onChange={(e) => setStudName(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Email</label>
                  <input type="email" value={studEmail} onChange={(e) => setStudEmail(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Register Number</label>
                  <input type="text" value={studReg} onChange={(e) => setStudReg(e.target.value)} required placeholder="e.g. 2026CSE099" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Password</label>
                  <input type="text" value={studPass} onChange={(e) => setStudPass(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.55rem' }}>Create Student</button>
                  <button type="button" onClick={() => setShowAddStudent(false)} className="btn-secondary" style={{ padding: '0.55rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* User Table */}
          <div className="card">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '0.65rem' }}>Register No</th>
                  <th style={{ padding: '0.65rem' }}>Full Name</th>
                  <th style={{ padding: '0.65rem' }}>Email</th>
                  <th style={{ padding: '0.65rem' }}>Role</th>
                  <th style={{ padding: '0.65rem' }}>Account Status</th>
                  <th style={{ padding: '0.65rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter((u) => !userSearch || u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
                  .map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.65rem', fontWeight: 600 }}>{u.register_number || 'N/A'}</td>
                      <td style={{ padding: '0.65rem' }}>{u.full_name}</td>
                      <td style={{ padding: '0.65rem' }}>{u.email}</td>
                      <td style={{ padding: '0.65rem' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-error' : u.role === 'staff' ? 'badge-warning' : 'badge-success'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-error'}`}>
                          {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleUserActive(u.id)}
                            className="btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timetable Builder Tab */}
      {activeTab === 'timetable' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Schedule Slot with Conflict Detection</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              The system automatically validates room availability, faculty schedules, and section time collisions to prevent double-booking.
            </p>

            {timetableError && (
              <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
                <AlertTriangle size={18} />
                <div>{timetableError}</div>
              </div>
            )}

            <form onSubmit={handleCreateTimetableSlot} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Day of Week</label>
                <select value={slotDay} onChange={(e) => setSlotDay(e.target.value)} style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Time Slot</label>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input type="time" value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                  <input type="time" value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Subject</label>
                <select value={slotSubjId} onChange={(e) => setSlotSubjId(e.target.value)} style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Room / Venue</label>
                <input type="text" value={slotRoom} onChange={(e) => setSlotRoom(e.target.value)} placeholder="Hall 301" required style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
              </div>

              <div>
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.65rem' }}>
                  Schedule Slot
                </button>
              </div>
            </form>
          </div>

          {/* Slots List */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Active Institution Timetable Slots</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '0.65rem' }}>Day</th>
                  <th style={{ padding: '0.65rem' }}>Time</th>
                  <th style={{ padding: '0.65rem' }}>Subject</th>
                  <th style={{ padding: '0.65rem' }}>Faculty</th>
                  <th style={{ padding: '0.65rem' }}>Section</th>
                  <th style={{ padding: '0.65rem' }}>Room</th>
                </tr>
              </thead>
              <tbody>
                {timetableSlots.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.65rem', fontWeight: 600 }}>{s.day}</td>
                    <td style={{ padding: '0.65rem' }}>{s.start_time} - {s.end_time}</td>
                    <td style={{ padding: '0.65rem' }}>{s.subject}</td>
                    <td style={{ padding: '0.65rem' }}>{s.faculty}</td>
                    <td style={{ padding: '0.65rem' }}>Section {s.section}</td>
                    <td style={{ padding: '0.65rem' }}><span className="badge badge-warning">{s.room}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Institutional CSV Reports Exporter</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Generate real-time database exports formatted for accreditation audits, board review, and spreadsheet analysis.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Student Enrolment Directory</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0 1rem' }}>
                Complete roster of active students with register numbers, enrolled courses, admission years, and CGPA metrics.
              </p>
              <a href="/api/v1/reports/students.csv" download className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <Download size={15} /> Export Students CSV
              </a>
            </div>

            <div style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Campus Attendance Audit Report</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0 1rem' }}>
                Semester attendance summary showing total conducted sessions, individual attendance percentages, and shortage warnings.
              </p>
              <a href="/api/v1/reports/attendance.csv" download className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <Download size={15} /> Export Attendance CSV
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Security Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>System Security Audit Trail</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            Immutable audit records capturing authentication events, attendance submissions, and administrative changes.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '0.65rem' }}>Timestamp</th>
                  <th style={{ padding: '0.65rem' }}>Actor</th>
                  <th style={{ padding: '0.65rem' }}>Action</th>
                  <th style={{ padding: '0.65rem' }}>Target Entity</th>
                  <th style={{ padding: '0.65rem' }}>Operational Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.65rem', whiteSpace: 'nowrap' }}>{new Date(l.timestamp).toLocaleString()}</td>
                    <td style={{ padding: '0.65rem', fontWeight: 600 }}>{l.actor}</td>
                    <td style={{ padding: '0.65rem' }}><span className="badge badge-warning">{l.action}</span></td>
                    <td style={{ padding: '0.65rem', fontFamily: 'monospace' }}>{l.entity}</td>
                    <td style={{ padding: '0.65rem', color: 'var(--color-text-secondary)' }}>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
