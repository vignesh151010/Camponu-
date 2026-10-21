import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Award,
  FileText,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function StaffDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [roster, setRoster] = useState([]);
  const [attendanceStatuses, setAttendanceStatuses] = useState({});
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionStartTime, setSessionStartTime] = useState('09:00');
  const [sessionEndTime, setSessionEndTime] = useState('10:00');
  const [attendanceMessage, setAttendanceMessage] = useState('');

  // Marks state
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [marksRoster, setMarksRoster] = useState([]);
  const [scores, setScores] = useState({});
  const [newAssessmentTitle, setNewAssessmentTitle] = useState('');
  const [newAssessmentMax, setNewAssessmentMax] = useState(50);
  const [marksMessage, setMarksMessage] = useState('');

  // Assignments state
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [newAsgnTitle, setNewAsgnTitle] = useState('');
  const [newAsgnDesc, setNewAsgnDesc] = useState('');
  const [newAsgnDueDate, setNewAsgnDueDate] = useState('');
  const [newAsgnMax, setNewAsgnMax] = useState(100);

  const fetchHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/staff/overview', { headers: fetchHeaders });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        setAssignedClasses(data.assigned_classes || []);
        if (data.assigned_classes && data.assigned_classes.length > 0) {
          setSelectedAssignment(data.assigned_classes[0]);
        }
      }

      const asRes = await fetch('/api/v1/staff/assessments', { headers: fetchHeaders }).then((r) => r.json());
      setAssessments(asRes.assessments || []);

      const assignRes = await fetch('/api/v1/staff/assignments', { headers: fetchHeaders }).then((r) => r.json());
      setStaffAssignments(assignRes.assignments || []);
    } catch (e) {
      console.error("Error loading staff overview:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadOverview();
  }, [token]);

  // Load student roster when selected assignment changes
  useEffect(() => {
    async function loadRoster() {
      if (selectedAssignment) {
        try {
          const res = await fetch(`/api/v1/staff/attendance/roster?section_id=${selectedAssignment.section_id}&subject_id=${selectedAssignment.subject_id}`, {
            headers: fetchHeaders,
          });
          if (res.ok) {
            const data = await res.json();
            setRoster(data.roster);
            const initStatuses = {};
            data.roster.forEach((s) => {
              initStatuses[s.student_id] = 'present';
            });
            setAttendanceStatuses(initStatuses);
          }
        } catch (e) {
          console.error("Roster error:", e);
        }
      }
    }
    loadRoster();
  }, [selectedAssignment]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAllPresent = () => {
    const updated = {};
    roster.forEach((s) => { updated[s.student_id] = 'present'; });
    setAttendanceStatuses(updated);
  };

  const handleSaveAttendance = async () => {
    if (!selectedAssignment) return;
    setAttendanceMessage('');

    const records = Object.entries(attendanceStatuses).map(([sId, st]) => ({
      student_id: parseInt(sId),
      status: st,
    }));

    const payload = {
      subject_id: selectedAssignment.subject_id,
      section_id: selectedAssignment.section_id,
      session_date: sessionDate,
      start_time: sessionStartTime,
      end_time: sessionEndTime,
      topic: sessionTopic || 'Regular Course Lecture',
      records,
    };

    try {
      const res = await fetch('/api/v1/staff/attendance/submit', {
        method: 'POST',
        headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setAttendanceMessage('Attendance successfully recorded and saved to permanent database log.');
        setSessionTopic('');
      } else {
        setAttendanceMessage(`Error: ${data.error?.message || data.detail}`);
      }
    } catch (e) {
      setAttendanceMessage('Failed to submit attendance session.');
    }
  };

  // Load marks roster for selected assessment
  const handleLoadAssessmentMarks = async (assessmentId) => {
    setSelectedAssessmentId(assessmentId);
    setMarksMessage('');
    try {
      const res = await fetch(`/api/v1/staff/assessments/${assessmentId}/marks`, { headers: fetchHeaders });
      if (res.ok) {
        const data = await res.json();
        setMarksRoster(data.roster);
        const initScores = {};
        data.roster.forEach((s) => {
          initScores[s.student_id] = s.score_obtained;
        });
        setScores(initScores);
      }
    } catch (e) {
      console.error("Error loading marks roster:", e);
    }
  };

  const handleSaveMarks = async () => {
    if (!selectedAssessmentId) return;
    setMarksMessage('');

    const marksPayload = Object.entries(scores).map(([sId, sc]) => ({
      student_id: parseInt(sId),
      score_obtained: parseFloat(sc) || 0.0,
      grade: parseFloat(sc) >= 45 ? 'A+' : parseFloat(sc) >= 35 ? 'A' : 'B',
    }));

    try {
      const res = await fetch(`/api/v1/staff/assessments/${selectedAssessmentId}/marks`, {
        method: 'POST',
        headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: marksPayload }),
      });
      if (res.ok) {
        setMarksMessage('Marks successfully saved for all enrolled students.');
      } else {
        const err = await res.json();
        setMarksMessage(`Error: ${err.error?.message || err.detail}`);
      }
    } catch (e) {
      setMarksMessage('Failed to save marks.');
    }
  };

  const handleTogglePublish = async (assessmentId) => {
    try {
      const res = await fetch(`/api/v1/staff/assessments/${assessmentId}/toggle-publish`, {
        method: 'POST',
        headers: fetchHeaders,
      });
      if (res.ok) {
        loadOverview();
      }
    } catch (e) {
      alert("Failed to toggle publish status.");
    }
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    if (!selectedAssignment || !newAssessmentTitle) return;

    try {
      const res = await fetch('/api/v1/staff/assessments', {
        method: 'POST',
        headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: selectedAssignment.subject_id,
          section_id: selectedAssignment.section_id,
          title: newAssessmentTitle,
          max_marks: parseFloat(newAssessmentMax),
          assessment_type: 'internal_1',
          weightage_percent: 25.0,
        }),
      });
      if (res.ok) {
        setNewAssessmentTitle('');
        loadOverview();
      }
    } catch (e) {
      alert("Error creating assessment.");
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignment || !newAsgnTitle || !newAsgnDueDate) return;

    try {
      const res = await fetch('/api/v1/staff/assignments', {
        method: 'POST',
        headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: selectedAssignment.subject_id,
          section_id: selectedAssignment.section_id,
          title: newAsgnTitle,
          description: newAsgnDesc,
          due_date: new Date(newAsgnDueDate).toISOString(),
          max_score: parseFloat(newAsgnMax),
        }),
      });
      if (res.ok) {
        setNewAsgnTitle('');
        setNewAsgnDesc('');
        setNewAsgnDueDate('');
        loadOverview();
      }
    } catch (e) {
      alert("Error creating assignment.");
    }
  };

  const navItems = [
    { id: 'overview', label: 'Faculty Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'attendance', label: 'Attendance Marking', icon: <CheckSquare size={18} /> },
    { id: 'marks', label: 'Marks Management', icon: <Award size={18} /> },
    { id: 'assignments', label: 'Assignment Manager', icon: <FileText size={18} /> },
  ];

  if (loading && !overview) {
    return (
      <DashboardLayout navItems={navItems} activeTab={activeTab} onTabChange={setActiveTab}>
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 1rem' }} />
          Loading faculty portal records...
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
                <span className="badge badge-warning" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  Department: {overview.profile.department}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>• Teaching Faculty Portal</span>
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Welcome, {overview.profile.full_name}!
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.35rem', fontWeight: 500 }}>
                {overview.profile.designation} • {overview.profile.specialization}
              </p>
            </div>
            <div style={{ textAlign: 'right', position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Today's Lectures
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F8FAFC', marginTop: '0.2rem' }}>
                {overview.stats.today_classes_count} Classes
              </div>
              <div style={{ marginTop: '0.4rem' }}>
                <span className="badge badge-success" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  Active Academic Year 2026-2027
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Assigned Subjects</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                    {overview.stats.assigned_subjects_count}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <Award size={20} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.65rem' }}>
                Active section allocations in curriculum
              </div>
            </div>

            <div className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Scheduled Today</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                    {overview.stats.today_classes_count}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                  <Clock size={20} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.65rem' }}>
                Timetable sessions for today
              </div>
            </div>

            <div className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Pending Grading</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: overview.stats.pending_grading_count > 0 ? 'var(--color-warning)' : 'var(--color-success)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                    {overview.stats.pending_grading_count}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: overview.stats.pending_grading_count > 0 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: overview.stats.pending_grading_count > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  <FileText size={20} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.65rem' }}>
                {overview.stats.pending_grading_count > 0 ? 'Submissions awaiting faculty review' : 'All submissions evaluated'}
              </div>
            </div>
          </div>

          {/* Today's Classes List */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Today's Teaching Schedule</h3>
            {overview.today_schedule.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No lectures scheduled for today.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                {overview.today_schedule.map((c) => (
                  <div key={c.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>{c.start_time} - {c.end_time}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem' }}>{c.subject_name} ({c.subject_code})</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>Section {c.section} • Venue: {c.room}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendance Marking Tab */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Lecture Attendance Session Entry</h3>

            {/* Class Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Select Assigned Class</label>
                <select
                  value={selectedAssignment ? `${selectedAssignment.section_id}-${selectedAssignment.subject_id}` : ''}
                  onChange={(e) => {
                    const [scId, sbId] = e.target.value.split('-');
                    const found = assignedClasses.find((a) => a.section_id === parseInt(scId) && a.subject_id === parseInt(sbId));
                    setSelectedAssignment(found);
                  }}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                >
                  {assignedClasses.map((a) => (
                    <option key={`${a.section_id}-${a.subject_id}`} value={`${a.section_id}-${a.subject_id}`}>
                      {a.subject_name} (Sec {a.section_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Session Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Time Slot</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="time"
                    value={sessionStartTime}
                    onChange={(e) => setSessionStartTime(e.target.value)}
                    style={{ flex: 1, padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={sessionEndTime}
                    onChange={(e) => setSessionEndTime(e.target.value)}
                    style={{ flex: 1, padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Lecture Topic</label>
                <input
                  type="text"
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  placeholder="e.g. Graph Traversal Algorithms"
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Enrolled Roster: {roster.length} Students</span>
              <button onClick={handleMarkAllPresent} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                <CheckCircle2 size={14} color="var(--color-success)" /> Mark All Present
              </button>
            </div>

            {/* Student Roster Table */}
            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ padding: '0.65rem' }}>Register Number</th>
                    <th style={{ padding: '0.65rem' }}>Student Name</th>
                    <th style={{ padding: '0.65rem' }}>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((s) => (
                    <tr key={s.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.65rem', fontWeight: 600 }}>{s.register_number}</td>
                      <td style={{ padding: '0.65rem' }}>{s.full_name}</td>
                      <td style={{ padding: '0.65rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {['present', 'absent', 'late', 'excused'].map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(s.student_id, status)}
                              style={{
                                padding: '0.25rem 0.65rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                borderRadius: 'var(--radius-full)',
                                textTransform: 'uppercase',
                                backgroundColor: attendanceStatuses[s.student_id] === status
                                  ? status === 'present' ? 'var(--color-success)' : status === 'absent' ? 'var(--color-error)' : 'var(--color-warning)'
                                  : 'var(--color-bg-subtle)',
                                color: attendanceStatuses[s.student_id] === status ? '#FFF' : 'var(--color-text-secondary)',
                              }}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {attendanceMessage && (
              <div className={`alert-box ${attendanceMessage.startsWith('Error') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1rem' }}>
                <div>{attendanceMessage}</div>
              </div>
            )}

            <button onClick={handleSaveAttendance} className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
              Confirm & Save Attendance Session
            </button>
          </div>
        </div>
      )}

      {/* Marks Management Tab */}
      {activeTab === 'marks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Create Assessment Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Create New Assessment Event</h3>
            <form onSubmit={handleCreateAssessment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Assessment Title</label>
                <input
                  type="text"
                  value={newAssessmentTitle}
                  onChange={(e) => setNewAssessmentTitle(e.target.value)}
                  placeholder="e.g. Internal Assessment 2"
                  required
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Maximum Marks</label>
                <input
                  type="number"
                  value={newAssessmentMax}
                  onChange={(e) => setNewAssessmentMax(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.65rem' }}>
                  <Plus size={16} /> Create Assessment
                </button>
              </div>
            </form>
          </div>

          {/* Assessment List & Publish Controls */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Existing Assessments & Publication Control</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {assessments.map((a) => (
                <div key={a.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-warning">{a.subject}</span>
                      <span className={`badge ${a.is_published ? 'badge-success' : 'badge-warning'}`}>
                        {a.is_published ? 'PUBLISHED' : 'DRAFT'}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.5rem 0' }}>{a.title}</h4>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      Section {a.section} • Max: {a.max_marks} marks
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleLoadAssessmentMarks(a.id)} className="btn-secondary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}>
                      Enter Marks
                    </button>
                    <button
                      onClick={() => handleTogglePublish(a.id)}
                      className={a.is_published ? 'btn-secondary' : 'btn-primary'}
                      style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      {a.is_published ? <EyeOff size={14} /> : <Eye size={14} />} {a.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Marks Entry Grid */}
          {selectedAssessmentId && marksRoster.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Student Score Entry Roster</h3>
              <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ padding: '0.65rem' }}>Register No</th>
                      <th style={{ padding: '0.65rem' }}>Student Name</th>
                      <th style={{ padding: '0.65rem' }}>Score Obtained</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksRoster.map((s) => (
                      <tr key={s.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.65rem', fontWeight: 600 }}>{s.register_number}</td>
                        <td style={{ padding: '0.65rem' }}>{s.full_name}</td>
                        <td style={{ padding: '0.65rem' }}>
                          <input
                            type="number"
                            step="0.5"
                            value={scores[s.student_id] ?? 0}
                            onChange={(e) => setScores({ ...scores, [s.student_id]: e.target.value })}
                            style={{ width: '100px', padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {marksMessage && (
                <div className={`alert-box ${marksMessage.startsWith('Error') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1rem' }}>
                  <div>{marksMessage}</div>
                </div>
              )}

              <button onClick={handleSaveMarks} className="btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
                Save Marks for Assessment
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assignment Manager Tab */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Create Assignment */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Publish New Course Assignment</h3>
            <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Assignment Title</label>
                  <input
                    type="text"
                    value={newAsgnTitle}
                    onChange={(e) => setNewAsgnTitle(e.target.value)}
                    placeholder="e.g. Binary Search Tree Implementation"
                    required
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newAsgnDueDate}
                    onChange={(e) => setNewAsgnDueDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Max Score</label>
                  <input
                    type="number"
                    value={newAsgnMax}
                    onChange={(e) => setNewAsgnMax(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Instructions / Description</label>
                <textarea
                  rows={3}
                  value={newAsgnDesc}
                  onChange={(e) => setNewAsgnDesc(e.target.value)}
                  placeholder="Provide specifications, guidelines, and submission criteria..."
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', padding: '0.65rem 1.25rem' }}>
                <Plus size={16} /> Publish Assignment
              </button>
            </form>
          </div>

          {/* Existing Assignments List */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Active Assignments & Submissions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {staffAssignments.map((a) => (
                <div key={a.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="badge badge-warning">{a.subject}</span>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem' }}>{a.title}</h4>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      Section {a.section} • Due: {new Date(a.due_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="badge badge-success">{a.submissions_count} Submissions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
