import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Award,
  Clock,
  FileText,
  BookOpen,
  CreditCard,
  BookMarked,
  Send,
  AlertTriangle,
  CheckCircle2,
  Download,
  Search,
  Check,
  RefreshCw,
  FileCheck,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function StudentDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [marks, setMarks] = useState([]);
  const [timetable, setTimetable] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [fees, setFees] = useState(null);
  const [library, setLibrary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [examinations, setExaminations] = useState([]);
  const [tickets, setTickets] = useState([]);

  // Assignment submission form modal/state
  const [submittingId, setSubmittingId] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');

  // Support ticket form state
  const [ticketCategory, setTicketCategory] = useState('Academics');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');

  const fetchHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, attRes, mkRes, ttRes, asRes, matRes, feeRes, libRes, lvRes, exRes, tkRes] = await Promise.all([
        fetch('/api/v1/student/overview', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/student/attendance', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/student/marks', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/student/timetable', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/student/assignments', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/student/materials', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/student/fees', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/student/library', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/student/leave-requests', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/student/examinations', { headers: fetchHeaders }).then((r) => r.json()),
        fetch('/api/v1/student/support-tickets', { headers: fetchHeaders }).then((r) => r.json()),
      ]);

      setOverview(ovRes);
      setAttendance(attRes);
      setMarks(mkRes.marks || []);
      setTimetable(ttRes.days || {});
      setAssignments(asRes.assignments || []);
      setMaterials(matRes.materials || []);
      setFees(feeRes);
      setLibrary(libRes);
      setLeaves(lvRes.requests || []);
      setExaminations(exRes.examinations || []);
      setTickets(tkRes.tickets || []);
    } catch (err) {
      console.error("Error loading student portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const handleSubmitAssignment = async (assignmentId) => {
    if (!submissionText.trim()) return;
    try {
      const res = await fetch(`/api/v1/student/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_text: submissionText }),
      });
      if (res.ok) {
        setSubmittingId(null);
        setSubmissionText('');
        loadData();
      }
    } catch (e) {
      alert("Submission failed. Please try again.");
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/student/leave-requests', {
        method: 'POST',
        headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: leaveStart, end_date: leaveEnd, reason: leaveReason }),
      });
      if (res.ok) {
        setLeaveStart('');
        setLeaveEnd('');
        setLeaveReason('');
        loadData();
      }
    } catch (e) {
      alert("Leave submission failed.");
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDescription) return;
    try {
      const res = await fetch('/api/v1/student/support-tickets', {
        method: 'POST',
        headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: ticketCategory,
          subject: ticketSubject,
          description: ticketDescription,
          priority: 'medium',
        }),
      });
      if (res.ok) {
        setTicketSubject('');
        setTicketDescription('');
        setTicketMessage('Your support ticket has been submitted to administration.');
        loadData();
        setTimeout(() => setTicketMessage(''), 4000);
      }
    } catch (e) {
      alert("Ticket filing failed.");
    }
  };

  const navItems = [
    { id: 'overview', label: 'Academic Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'attendance', label: 'Attendance Tracking', icon: <CalendarCheck size={18} /> },
    { id: 'marks', label: 'Academic Marks', icon: <Award size={18} /> },
    { id: 'timetable', label: 'Class Timetable', icon: <Clock size={18} /> },
    { id: 'examinations', label: 'Examinations', icon: <FileCheck size={18} /> },
    { id: 'assignments', label: 'Assignments', icon: <FileText size={18} /> },
    { id: 'materials', label: 'Study Materials', icon: <BookOpen size={18} /> },
    { id: 'fees', label: 'Fee Records', icon: <CreditCard size={18} /> },
    { id: 'library', label: 'Library & Books', icon: <BookMarked size={18} /> },
    { id: 'leaves', label: 'Leave Requests', icon: <Send size={18} /> },
    { id: 'support', label: 'Helpdesk Support', icon: <HelpCircle size={18} /> },
  ];

  if (loading && !overview) {
    return (
      <DashboardLayout navItems={navItems} activeTab={activeTab} onTabChange={setActiveTab}>
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 1rem' }} />
          Loading student academic records...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} activeTab={activeTab} onTabChange={setActiveTab}>
      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
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
                <span className="badge badge-success" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  Active Term: Semester 4
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>• Spring Session</span>
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Welcome back, {overview.student.full_name}!
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.35rem', fontWeight: 500 }}>
                {overview.student.department} • {overview.student.course} • Section {overview.student.section}
              </p>
            </div>
            <div style={{ textAlign: 'right', position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Official Campus Roll No
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.04em', color: '#F8FAFC', marginTop: '0.2rem' }}>
                {overview.student.register_number}
              </div>
              <div style={{ marginTop: '0.4rem' }}>
                <span className="badge badge-info" style={{ backgroundColor: 'rgba(2, 132, 199, 0.2)', color: '#38BDF8', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                  Enrolled Regular
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Attendance Ratio</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: overview.stats.attendance_warning ? 'var(--color-error)' : 'var(--color-success)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                    {overview.stats.attendance_percentage}%
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: overview.stats.attendance_warning ? 'var(--color-error-bg)' : 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: overview.stats.attendance_warning ? 'var(--color-error)' : 'var(--color-success)' }}>
                  <CalendarCheck size={20} />
                </div>
              </div>
              <div style={{ height: '5px', width: '100%', backgroundColor: '#E2E8F0', borderRadius: '3px', marginTop: '0.75rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(overview.stats.attendance_percentage, 100)}%`, backgroundColor: overview.stats.attendance_warning ? 'var(--color-error)' : 'var(--color-success)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.45rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{overview.stats.attended_classes} of {overview.stats.total_classes} lectures</span>
                <span style={{ fontWeight: 600, color: overview.stats.attendance_warning ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>Threshold: 75%</span>
              </div>
            </div>

            <div className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cumulative CGPA</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                    {overview.student.cgpa.toFixed(2)}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <Award size={20} />
                </div>
              </div>
              <div style={{ height: '5px', width: '100%', backgroundColor: '#E2E8F0', borderRadius: '3px', marginTop: '0.75rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(overview.student.cgpa / 10) * 100}%`, background: 'linear-gradient(90deg, var(--color-primary), #EA580C)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.45rem' }}>
                Scale of 10.0 • First Class with Distinction
              </div>
            </div>

            <div className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Active Assignments</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: overview.stats.pending_assignments_count > 0 ? 'var(--color-warning)' : 'var(--color-success)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                    {overview.stats.pending_assignments_count}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: overview.stats.pending_assignments_count > 0 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: overview.stats.pending_assignments_count > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  <FileText size={20} />
                </div>
              </div>
              <div style={{ height: '5px', width: '100%', backgroundColor: '#E2E8F0', borderRadius: '3px', marginTop: '0.75rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: overview.stats.pending_assignments_count > 0 ? '60%' : '100%', backgroundColor: overview.stats.pending_assignments_count > 0 ? 'var(--color-warning)' : 'var(--color-success)', borderRadius: '3px' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.45rem' }}>
                {overview.stats.pending_assignments_count > 0 ? 'Due in next 14 calendar days' : 'All assignments submitted!'}
              </div>
            </div>
          </div>

          {/* Shortage Alert Banner if <75% */}
          {overview.stats.attendance_warning && (
            <div className="alert-box alert-warning">
              <AlertTriangle size={20} />
              <div>
                <strong>Attendance Warning:</strong> Your current attendance is below the mandatory 75% college requirement. Please contact your department coordinator to avoid exam disbarment.
              </div>
            </div>
          )}

          {/* Recent Marks & Announcements Split */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Published Marks</h3>
              {overview.recent_marks.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No published marks yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {overview.recent_marks.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.subject}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{m.assessment}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge badge-success">{m.score}/{m.max_marks}</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>Grade: {m.grade}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Campus Announcements</h3>
              {overview.announcements.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No active announcements.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {overview.announcements.map((a) => (
                    <div key={a.id} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{a.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>{a.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && attendance && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cumulative Semester Attendance</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: attendance.is_shortage ? 'var(--color-error)' : 'var(--color-success)', marginTop: '0.25rem' }}>
                {attendance.overall_percentage}%
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {attendance.present_count} attended / {attendance.total_sessions} total conducted lectures
              </p>
            </div>
            <div>
              <span className={`badge ${attendance.is_shortage ? 'badge-error' : 'badge-success'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                {attendance.is_shortage ? 'ATTENDANCE SHORTAGE (<75%)' : 'ELIGIBLE FOR EXAMINATIONS'}
              </span>
            </div>
          </div>

          {/* Subject Breakdown */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Subject-wise Attendance Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {attendance.subjects.map((s, idx) => (
                <div key={idx} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: s.is_shortage ? '#FEF2F2' : 'var(--color-white)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{s.subject_code}</span>
                    <span className={`badge ${s.is_shortage ? 'badge-error' : 'badge-success'}`}>{s.percentage}%</span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.4rem 0' }}>{s.subject_name}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {s.present} Present • {s.absent} Absent • {s.total} Sessions
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Session History */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Date-wise Attendance History</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <th style={{ padding: '0.65rem' }}>Date</th>
                    <th style={{ padding: '0.65rem' }}>Subject</th>
                    <th style={{ padding: '0.65rem' }}>Slot Time</th>
                    <th style={{ padding: '0.65rem' }}>Topic</th>
                    <th style={{ padding: '0.65rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.history.map((h) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.65rem', fontWeight: 600 }}>{h.date}</td>
                      <td style={{ padding: '0.65rem' }}>{h.subject}</td>
                      <td style={{ padding: '0.65rem' }}>{h.time}</td>
                      <td style={{ padding: '0.65rem' }}>{h.topic}</td>
                      <td style={{ padding: '0.65rem' }}>
                        <span className={`badge ${h.status === 'present' ? 'badge-success' : h.status === 'late' ? 'badge-warning' : 'badge-error'}`}>
                          {h.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Marks Tab */}
      {activeTab === 'marks' && (
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>Official Published Internal Marks</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '0.75rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem' }}>Assessment Title</th>
                  <th style={{ padding: '0.75rem' }}>Type</th>
                  <th style={{ padding: '0.75rem' }}>Score</th>
                  <th style={{ padding: '0.75rem' }}>Percentage</th>
                  <th style={{ padding: '0.75rem' }}>Grade</th>
                  <th style={{ padding: '0.75rem' }}>Faculty Feedback</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{m.subject_name} ({m.subject_code})</td>
                    <td style={{ padding: '0.75rem' }}>{m.assessment_title}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge badge-warning">{m.assessment_type}</span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>{m.score_obtained} / {m.max_marks}</td>
                    <td style={{ padding: '0.75rem' }}>{m.percentage}%</td>
                    <td style={{ padding: '0.75rem' }}><span className="badge badge-success">{m.grade}</span></td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{m.feedback || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timetable Tab */}
      {activeTab === 'timetable' && timetable && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Section Weekly Schedule</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries(timetable).map(([day, slots]) => (
                <div key={day} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>{day}</h4>
                  {slots.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No lectures scheduled</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                      {slots.map((s) => (
                        <div key={s.id} style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>{s.start_time} - {s.end_time}</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.2rem' }}>{s.subject_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Faculty: {s.faculty}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Venue: {s.room}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Class Assignments & Submissions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {assignments.map((a) => (
                <div key={a.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span className="badge badge-warning" style={{ marginBottom: '0.35rem' }}>{a.subject}</span>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{a.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                        {a.description}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Due Date</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: a.is_past_due ? 'var(--color-error)' : 'var(--color-text-main)' }}>
                        {new Date(a.due_date).toLocaleDateString()}
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        {a.submission ? (
                          <span className="badge badge-success">
                            <CheckCircle2 size={13} /> {a.submission.status.toUpperCase()}
                          </span>
                        ) : (
                          <span className="badge badge-warning">PENDING SUBMISSION</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submission Details or Form */}
                  {a.submission ? (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Your Submission:</div>
                      <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>{a.submission.submission_text}</p>
                      {a.submission.score !== null && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>Score: {a.submission.score} / {a.max_score}</span>
                          <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Feedback: {a.submission.feedback}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginTop: '1rem' }}>
                      {submittingId === a.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <textarea
                            rows={3}
                            value={submissionText}
                            onChange={(e) => setSubmissionText(e.target.value)}
                            placeholder="Enter your submission notes, repository link, or answer here..."
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleSubmitAssignment(a.id)} className="btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                              Confirm & Submit
                            </button>
                            <button onClick={() => setSubmittingId(null)} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setSubmittingId(a.id); setSubmissionText(''); }} className="btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}>
                          Submit Assignment Work
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Study Materials Tab */}
      {activeTab === 'materials' && (
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Official Lecture Materials & Slide Decks</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {materials.map((m) => (
              <div key={m.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span className="badge badge-warning" style={{ marginBottom: '0.35rem' }}>{m.subject}</span>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{m.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', lineHeight: 1.4 }}>{m.description}</p>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m.uploaded_date} • {m.faculty}</span>
                  <a href={`/${m.file_path}`} download className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                    <Download size={13} /> PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fees Tab */}
      {activeTab === 'fees' && fees && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Total Semester Dues</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>${fees.summary.total_due.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Amount Paid</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-success)' }}>${fees.summary.total_paid.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Outstanding Balance</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: fees.summary.balance > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                ${fees.summary.balance.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Fee Invoices & Receipts</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '0.65rem' }}>Fee Description</th>
                  <th style={{ padding: '0.65rem' }}>Amount Due</th>
                  <th style={{ padding: '0.65rem' }}>Amount Paid</th>
                  <th style={{ padding: '0.65rem' }}>Status</th>
                  <th style={{ padding: '0.65rem' }}>Transaction Ref</th>
                </tr>
              </thead>
              <tbody>
                {fees.records.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.65rem', fontWeight: 600 }}>{r.title}</td>
                    <td style={{ padding: '0.65rem' }}>${r.amount_due.toFixed(2)}</td>
                    <td style={{ padding: '0.65rem' }}>${r.amount_paid.toFixed(2)}</td>
                    <td style={{ padding: '0.65rem' }}>
                      <span className={`badge ${r.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{r.status.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '0.65rem', fontFamily: 'monospace' }}>{r.transaction_ref || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Library Tab */}
      {activeTab === 'library' && library && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Active Book Loans</h3>
            {library.borrowed_books.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No books currently checked out.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ padding: '0.65rem' }}>Title & Author</th>
                    <th style={{ padding: '0.65rem' }}>Borrowed Date</th>
                    <th style={{ padding: '0.65rem' }}>Due Date</th>
                    <th style={{ padding: '0.65rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {library.borrowed_books.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.65rem', fontWeight: 600 }}>{b.title} <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>by {b.author}</span></td>
                      <td style={{ padding: '0.65rem' }}>{b.borrowed_at}</td>
                      <td style={{ padding: '0.65rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>{b.due_date}</td>
                      <td style={{ padding: '0.65rem' }}>
                        <span className="badge badge-success">{b.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Campus Library Catalog</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {library.catalog.map((b) => (
                <div key={b.id} style={{ padding: '0.85rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{b.category}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0.25rem 0' }}>{b.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{b.author}</div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${b.available ? 'badge-success' : 'badge-error'}`}>
                      {b.available ? `${b.available_copies} Copies Available` : 'All Checked Out'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests Tab */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Apply for Student Leave</h3>
            <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Start Date</label>
                <input
                  type="date"
                  value={leaveStart}
                  onChange={(e) => setLeaveStart(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>End Date</label>
                <input
                  type="date"
                  value={leaveEnd}
                  onChange={(e) => setLeaveEnd(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Reason for Absence</label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Medical, family commitment, or academic symposium..."
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Submit Leave Application
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Leave Request History</h3>
            {leaves.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No previous leave requests.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {leaves.map((l) => (
                  <div key={l.id} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{l.start_date} to {l.end_date}</span>
                      <span className={`badge ${l.status === 'approved' ? 'badge-success' : l.status === 'rejected' ? 'badge-error' : 'badge-warning'}`}>
                        {l.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>{l.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Examinations Tab */}
      {activeTab === 'examinations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>Semester Examination Timetable</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Official published schedules for upcoming university internal assessments and semester end examinations.
            </p>

            {examinations.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No active examination schedules published currently.
              </div>
            ) : (
              examinations.map((exam) => (
                <div key={exam.id} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{exam.exam_name}</h4>
                    <span className="badge badge-success">Academic Year {exam.academic_year}</span>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Subject Code</th>
                          <th>Subject Name</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Venue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exam.schedules.map((s) => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 600 }}>{s.subject_code}</td>
                            <td>{s.subject_name}</td>
                            <td>{s.exam_date}</td>
                            <td>{s.start_time} - {s.end_time}</td>
                            <td><span className="badge" style={{ backgroundColor: '#F1F5F9' }}>{s.venue}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Helpdesk Support Tab */}
      {activeTab === 'support' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>File Helpdesk Request</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Submit queries regarding academics, fee records, attendance, or IT portal assistance.
            </p>

            {ticketMessage && (
              <div className="alert-box alert-success" style={{ marginBottom: '1rem' }}>
                <CheckCircle2 size={16} />
                <span style={{ fontSize: '0.85rem' }}>{ticketMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                >
                  <option value="Academics">Academics & Timetable</option>
                  <option value="Attendance">Attendance Correction</option>
                  <option value="Fees">Tuition & Exam Fees</option>
                  <option value="Hostel">Hostel & Transport</option>
                  <option value="IT">Portal / Account Support</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Subject / Issue Summary</label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. Attendance discrepancy in Oct 18 lecture"
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Detailed Description</label>
                <textarea
                  rows={4}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Provide context or lecture details..."
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Submit Support Ticket
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Your Previous Tickets</h3>
            {tickets.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No support requests filed yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tickets.map((t) => (
                  <div key={t.id} style={{ padding: '0.85rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.subject}</span>
                      <span className={`badge ${t.status === 'resolved' ? 'badge-success' : t.status === 'in_progress' ? 'badge-warning' : 'badge-error'}`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: '0.2rem' }}>{t.category} • {t.created_at}</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>{t.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
