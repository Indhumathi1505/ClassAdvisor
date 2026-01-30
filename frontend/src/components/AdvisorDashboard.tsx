
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { AppState, Student, Subject, UserRole, MasterAttendanceRecord } from '../types';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  PieChart as RePieChart, Pie
} from 'recharts';
import {
  Users, UserPlus, BookOpen, Trash2, Download, MessageCircle, BarChart2, CheckCircle,
  Megaphone, Filter, Layers, Hash, PieChart, BarChart3, Beaker, Edit2, Check, X, ClipboardList, UserCheck, FileSpreadsheet, Contact, GraduationCap, Upload, FileCheck, Eye, TrendingUp, MessageSquare,
  Send, Search, Plus, ChevronRight, FileText, LayoutDashboard, Settings, Book
} from 'lucide-react';
import { api } from '../api.ts';

const COLORS = ['#046e84', '#0694b3', '#08b9e1', '#06cdee', '#00e5ff'];

interface AdvisorDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
}

const AttendanceInput: React.FC<{ initialValue: number | string, onSave: (val: string) => void }> = ({ initialValue, onSave }) => {
  const [localVal, setLocalVal] = useState(initialValue.toString());

  // Update local value if initialValue changes (from external sync)
  React.useEffect(() => {
    setLocalVal(initialValue.toString());
  }, [initialValue]);

  const handleBlur = () => {
    if (localVal !== initialValue.toString()) {
      onSave(localVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(localVal);
    }
  };

  return (
    <input
      type="number"
      max={100}
      min={0}
      className="w-24 px-3 py-1.5 border rounded-lg font-black text-brand-primary focus:ring-2 focus:ring-brand-primary outline-none bg-white"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="0-100"
    />
  );
};

const AdvisorDashboard: React.FC<AdvisorDashboardProps> = ({ state, updateState }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'students' | 'subjects' | 'attendance' | 'reports' | 'messaging' | 'grades' | 'staff'>('config');
  const [newStudent, setNewStudent] = useState<Student>({ registerNumber: '', rollNumber: '', name: '', parentWhatsApp: '' });
  const [newSubject, setNewSubject] = useState<Subject>({ id: '', code: '', name: '', semesterId: 1, assignedStaff: '', staffPassword: '' });

  // Filter & Search States
  const [viewSemester, setViewSemester] = useState<number>(1);
  const [viewInternal, setViewInternal] = useState<number>(1);
  const [subjectViewSemester, setSubjectViewSemester] = useState<number | 'all'>('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSem, setUploadSem] = useState<number>(1);
  const [broadcastLocked, setBroadcastLocked] = useState<Record<string, boolean>>({});
  const [viewingGradeDetails, setViewingGradeDetails] = useState<any | null>(null);
  const [gradeViewSubject, setGradeViewSubject] = useState<string>('all');

  // Broadcast Queue States
  const [broadcastQueue, setBroadcastQueue] = useState<{ student: Student, message: string }[]>([]);
  const [currentBroadcastIndex, setCurrentBroadcastIndex] = useState<number>(-1);
  const [broadcastType, setBroadcastType] = useState<'internal' | 'semester'>('internal');
  const [isAutoPilot, setIsAutoPilot] = useState<boolean>(false);
  const [isFlashMode, setIsFlashMode] = useState<boolean>(false);
  const [nextSendTimer, setNextSendTimer] = useState<number>(0);
  const [broadcastChannel, setBroadcastChannel] = useState<'whatsapp' | 'sms'>('whatsapp');

  const getSubjectName = (code: string) => {
    return state.subjects.find(s => s.code === code)?.name || code;
  };

  // Editing States
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectData, setEditSubjectData] = useState<Subject | null>(null);
  const [editingStudentReg, setEditingStudentReg] = useState<string | null>(null);
  const [editStudentData, setEditStudentData] = useState<Student | null>(null);

  // Staff States
  const [newStaff, setNewStaff] = useState({ name: '', semesterId: 1, subjectCode: '', subjectName: '', password: 'staff123' });
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);

  // Attendance Entry States
  const [attEntryMode, setAttEntryMode] = useState<'manual' | 'excel'>('manual');
  const [attSuccessMsg, setAttSuccessMsg] = useState('');

  const isEvenInternal = viewInternal % 2 === 0;

  // Student Handlers
  const addStudent = () => {
    if (!newStudent.registerNumber || !newStudent.rollNumber || !newStudent.name) {
      alert("Please fill in Register Number, Roll Number, and Name.");
      return;
    }
    if (state.students.some(s => s.registerNumber === newStudent.registerNumber)) {
      alert("Student with this Register Number already exists.");
      return;
    }
    api.addStudent(newStudent).then(saved => {
      updateState({ students: [...state.students, saved] });
      setNewStudent({ registerNumber: '', rollNumber: '', name: '', parentWhatsApp: '' });
    }).catch(err => alert("Failed to save student"));
  };

  const removeStudent = (regNo: string) => {
    if (!confirm("Are you sure? This will delete all marks and attendance for this student.")) return;
    api.deleteStudent(regNo).then(() => {
      updateState({
        students: state.students.filter(s => s.registerNumber !== regNo),
        marks: state.marks.filter(m => m.studentRegNo !== regNo),
        labMarks: state.labMarks.filter(l => l.studentRegNo !== regNo),
        attendance: state.attendance.filter(a => a.studentRegNo !== regNo),
        masterAttendance: state.masterAttendance.filter(ma => ma.studentRegNo !== regNo)
      });
    }).catch(err => alert("Failed to delete student"));
  };

  const startEditingStudent = (student: Student) => {
    setEditingStudentReg(student.registerNumber);
    setEditStudentData({ ...student });
  };

  const saveEditedStudent = () => {
    if (!editStudentData) return;
    // Check if registration number was changed and if it conflicts (though it's unique ID)
    api.addStudent(editStudentData).then(saved => {
      const updatedStudents = state.students.map(s => s.registerNumber === editingStudentReg ? saved : s);
      updateState({ students: updatedStudents });
      setEditingStudentReg(null);
      setEditStudentData(null);
    }).catch(err => alert("Failed to update student"));
  };

  const cancelEditingStudent = () => {
    setEditingStudentReg(null);
    setEditStudentData(null);
  };

  // Subject Handlers
  const addSubject = () => {
    if (!newSubject.id || !newSubject.name || !newSubject.code || !newSubject.assignedStaff) {
      alert("Please fill in all subject and staff details.");
      return;
    }
    api.addSubject(newSubject).then(saved => {
      updateState({ subjects: [...state.subjects, saved] });
      setNewSubject({ id: '', code: '', name: '', semesterId: 1, assignedStaff: '', staffPassword: '' });
    }).catch(err => alert("Failed to save subject"));
  };

  const removeSubject = (id: string) => {
    if (!confirm("Remove this subject and faculty assignment? This will also remove associated marks.")) return;
    api.deleteSubject(id).then(() => {
      updateState({
        subjects: state.subjects.filter(s => s.id !== id),
        marks: state.marks.filter(m => m.subjectId !== id),
        labMarks: state.labMarks.filter(l => l.subjectId !== id),
        attendance: state.attendance.filter(a => a.subjectId !== id)
      });
    }).catch(err => alert("Failed to delete subject"));
  };

  const startEditingSubject = (sub: Subject) => {
    setEditingSubjectId(sub.id);
    setEditSubjectData({ ...sub });
  };

  const saveEditedSubject = () => {
    if (!editSubjectData) return;
    api.addSubject(editSubjectData).then(saved => {
      const updatedSubjects = state.subjects.map(s => s.id === editingSubjectId ? saved : s);
      updateState({ subjects: updatedSubjects });
      setEditingSubjectId(null);
      setEditSubjectData(null);
    }).catch(err => alert("Failed to update subject"));
  };

  const cancelEditingSubject = () => {
    setEditingSubjectId(null);
    setEditSubjectData(null);
  };

  // Master Attendance Handlers
  const handleMasterAttendanceChange = async (regNo: string, val: string, skipStateUpdate = false) => {
    let percentage = parseFloat(val);
    if (isNaN(percentage)) return null;

    // Clamp percentage between 0 and 100
    if (percentage < 0) {
      percentage = 0;
      if (!skipStateUpdate) alert("Attendance percentage cannot be negative. Setting to 0.");
    } else if (percentage > 100) {
      percentage = 100;
      if (!skipStateUpdate) alert("Attendance percentage cannot exceed 100. Setting to 100.");
    }

    const newRecord: MasterAttendanceRecord = {
      studentRegNo: regNo,
      semesterId: viewSemester,
      internalId: viewInternal,
      percentage: percentage
    };

    try {
      const saved = await api.saveMasterAttendance(newRecord);
      if (!skipStateUpdate) {
        const existing = state.masterAttendance.filter(ma =>
          !(ma.studentRegNo === regNo && ma.semesterId === viewSemester && ma.internalId === viewInternal)
        );
        updateState({ masterAttendance: [...existing, saved] });
      }
      return saved;
    } catch (err) {
      console.error("Failed to save master attendance", err);
      if (!skipStateUpdate) alert("Failed to save attendance. Please ensure the value is between 0 and 100.");
      return null;
    }
  };

  const getMasterAttendance = (regNo: string) => {
    return state.masterAttendance.find(ma =>
      ma.studentRegNo === regNo && ma.semesterId === viewSemester && ma.internalId === viewInternal
    )?.percentage ?? '';
  };

  // Detailed Analysis Reporting
  const getDetailedReportForInternal = (regNo: string, semesterId: number, internalId: number, relevantSubjects: Subject[]) => {
    const marks = state.marks.filter(m => m.studentRegNo === regNo && Number(m.semesterId) === Number(semesterId) && Number(m.internalId) === Number(internalId));
    const labMarks = state.labMarks.filter(l => l.studentRegNo === regNo && Number(l.semesterId) === Number(semesterId) && Number(l.internalId) === Number(internalId));
    const masterAtt = state.masterAttendance.find(ma => ma.studentRegNo === regNo && Number(ma.semesterId) === Number(semesterId) && Number(ma.internalId) === Number(internalId))?.percentage ?? 0;

    const subjectBreakdown = relevantSubjects.map(sub => ({
      name: sub.name,
      code: sub.code,
      mark: marks.find(m => m.subjectId === sub.id || m.subjectId === sub.code || (m.subjectId && m.subjectId.includes(sub.code)))?.marks ?? '-',
      labMark: labMarks.find(l => l.subjectId === sub.id || l.subjectId === sub.code || (l.subjectId && l.subjectId.includes(sub.code)))?.marks ?? '-',
    }));

    // Calculate totals ONLY for subjects displayed in the breakdown
    const validMarks = subjectBreakdown.filter(s => s.mark !== '-').map(s => Number(s.mark));
    const totalMarks = validMarks.reduce((acc, curr) => acc + curr, 0);
    const avgMarks = validMarks.length > 0 ? totalMarks / validMarks.length : 0;

    return { totalMarks, avgMarks, masterAtt, subjectBreakdown };
  };

  // Consolidate subjects from global list and staff mapping
  const currentSemesterSubjects = useMemo(() => {
    const subjectsFromGlobal = state.subjects.filter(s => Number(s.semesterId) === Number(viewSemester));
    const subjectsFromStaff = (state.staff || [])
      .filter(s => Number(s.semesterId) === Number(viewSemester))
      .map(s => ({
        id: s.subjectCode,
        code: s.subjectCode,
        name: s.subjectName,
        semesterId: s.semesterId,
        assignedStaff: s.name,
        staffPassword: ''
      }));

    // Merge by unique code
    const combined = [...subjectsFromGlobal];
    subjectsFromStaff.forEach(s => {
      if (!combined.find(c => c.code === s.code)) {
        combined.push(s);
      }
    });

    return combined.sort((a, b) => a.code.localeCompare(b.code));
  }, [state.subjects, state.staff, viewSemester]);

  // Class Statistics Calculations
  const classStats = useMemo(() => {
    if (state.students.length === 0) return { avgMark: 0, avgAtt: 0, studentCount: 0 };

    let totalAvgMark = 0;
    let totalAvgAtt = 0;

    state.students.forEach(s => {
      const report = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal, currentSemesterSubjects);
      totalAvgMark += report.avgMarks;
      totalAvgAtt += report.masterAtt;
    });

    return {
      avgMark: totalAvgMark / state.students.length,
      avgAtt: totalAvgAtt / state.students.length,
      studentCount: state.students.length,
      reportList: state.students.map(s => {
        // Generate consolidated report for visual table
        const r1 = getDetailedReportForInternal(s.registerNumber, viewSemester, 1, currentSemesterSubjects);
        const r2 = getDetailedReportForInternal(s.registerNumber, viewSemester, 2, currentSemesterSubjects);
        return { student: s, int1: r1, int2: r2 };
      })
    };
  }, [state.students, state.marks, state.masterAttendance, viewSemester, viewInternal, currentSemesterSubjects]);

  // CSV Export Logic
  const handleExportCSV = () => {
    const headers = ["Register Number", "Roll Number", "Name"];

    currentSemesterSubjects.forEach(sub => {
      headers.push(`${sub.name} (Marks)`);
      if (isEvenInternal) headers.push(`${sub.name} (Lab)`);
    });

    headers.push("Total Marks", "Average Marks", "Attendance (%)");

    const rows = state.students.map(s => {
      const report = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal, currentSemesterSubjects);
      const row = [s.registerNumber, s.rollNumber, s.name];

      report.subjectBreakdown.forEach(item => {
        row.push(item.mark.toString());
        if (isEvenInternal) row.push(item.labMark.toString());
      });

      row.push(report.totalMarks.toString());
      row.push(report.avgMarks.toFixed(2));
      row.push(report.masterAtt.toString());

      return row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Analysis_Sem${viewSemester}_Int${viewInternal}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSubjects = state.subjects.filter(sub =>
    subjectViewSemester === 'all' ? true : sub.semesterId === subjectViewSemester
  );

  const filteredStudents = state.students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.registerNumber.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // WhatsApp Broadcast
  const startInternalBroadcast = () => {
    const lockKey = `sem-${viewSemester}-int-${viewInternal}`;
    if (broadcastLocked[lockKey]) {
      alert(`Broadcast for Semester ${viewSemester} Internal ${viewInternal} is already sent and locked.`);
      return;
    }

    const queue = state.students
      .filter(s => s.parentWhatsApp && s.parentWhatsApp.trim() !== '')
      .map(student => ({
        student,
        message: generateMessage(student, viewSemester, viewInternal)
      }));

    if (queue.length === 0) {
      alert("No students with valid WhatsApp numbers found.");
      return;
    }

    setBroadcastType('internal');
    setBroadcastQueue(queue);
    setCurrentBroadcastIndex(0);
  };

  const startSemesterBroadcast = () => {
    const lockKey = `sem-${viewSemester}-summary`;
    if (broadcastLocked[lockKey]) {
      alert(`Semester ${viewSemester} Summary has already been sent.`);
      return;
    }

    const queue = state.students
      .filter(s => s.parentWhatsApp && s.parentWhatsApp.trim() !== '')
      .map(student => ({
        student,
        message: generateSemesterSummaryMessage(student, viewSemester)
      }));

    if (queue.length === 0) {
      alert("No parent contact numbers found.");
      return;
    }

    setBroadcastType('semester');
    setBroadcastQueue(queue);
    setCurrentBroadcastIndex(0);
  };

  // Ref for the persistent broadcast window
  const broadcastWindowRef = React.useRef<Window | null>(null);

  const processNextInQueue = () => {
    if (currentBroadcastIndex < 0 || currentBroadcastIndex >= broadcastQueue.length) return;

    const item = broadcastQueue[currentBroadcastIndex];
    // Keep '+' for international routing (Phone Link requirement)
    const phone = item.student.parentWhatsApp.trim().replace(/\s/g, '');
    const encoded = encodeURIComponent(item.message);

    // Support both WhatsApp and Native SMS
    // Windows/Android uses ?body=, iOS uses &body=
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const url = broadcastChannel === 'whatsapp'
      ? `https://api.whatsapp.com/send?phone=${phone.replace(/\+/g, '')}&text=${encoded}`
      : `sms:${phone}${isIOS ? '&' : '?'}body=${encoded}`;

    if (broadcastChannel === 'whatsapp') {
      if (broadcastWindowRef.current && !broadcastWindowRef.current.closed) {
        broadcastWindowRef.current.location.href = url;
        broadcastWindowRef.current.focus();
      } else {
        broadcastWindowRef.current = window.open(url, 'wa_broadcast_window');
      }
    } else {
      // For SMS/Phone Link: We open the link in a hidden way to trigger the app 
      // without refreshing the dashboard.
      const link = document.createElement('a');
      link.href = url;
      link.click();
    }

    if (currentBroadcastIndex === broadcastQueue.length - 1) {
      // Last one sent
      const lockKey = broadcastType === 'internal'
        ? `sem-${viewSemester}-int-${viewInternal}`
        : `sem-${viewSemester}-summary`;
      setBroadcastLocked(prev => ({ ...prev, [lockKey]: true }));
      setBroadcastQueue([]);
      setCurrentBroadcastIndex(-1);
      setIsAutoPilot(false);
      broadcastWindowRef.current = null;
      alert(`Broadcast Complete! All messages have been sent via ${broadcastChannel.toUpperCase()}.`);
    } else {
      const nextIndex = currentBroadcastIndex + 1;
      setCurrentBroadcastIndex(nextIndex);

      if (isAutoPilot) {
        setNextSendTimer(isFlashMode ? 2 : 4); // 2s for flash, 4s for normal
      }
    }
  };

  // Effect for Auto-Pilot Timer
  React.useEffect(() => {
    let interval: any;
    if (isAutoPilot && nextSendTimer > 0) {
      interval = setInterval(() => {
        setNextSendTimer(prev => prev - 1);
      }, 1000);
    } else if (isAutoPilot && nextSendTimer === 0 && currentBroadcastIndex >= 0) {
      processNextInQueue();
    }
    return () => clearInterval(interval);
  }, [isAutoPilot, nextSendTimer, currentBroadcastIndex]);

  const handleExportForBulk = () => {
    const csvData = state.students
      .filter(s => s.parentWhatsApp && s.parentWhatsApp.trim() !== '')
      .map(s => {
        const msg = broadcastType === 'internal'
          ? generateMessage(s, viewSemester, viewInternal)
          : generateSemesterSummaryMessage(s, viewSemester);

        // Clean phone number: keep only digits
        const cleanPhone = s.parentWhatsApp.replace(/\D/g, '');

        // Standard Phone,Message format used by most auto-senders (No header needed for most)
        return `${cleanPhone},"${msg.replace(/"/g, '""')}"`;
      });

    const csvContent = csvData.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bulk_Reports_Sem${viewSemester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("Bulk File Ready!\n\n1. Open your WASender Extension\n2. Upload this CSV file\n3. Click 'Start Campaign' for 100% automatic sending.");
  };

  const generateSemesterSummaryMessage = (student: Student, semesterId: number) => {
    const int1 = getDetailedReportForInternal(student.registerNumber, semesterId, 1, currentSemesterSubjects);
    const int2 = getDetailedReportForInternal(student.registerNumber, semesterId, 2, currentSemesterSubjects);

    // Get Semester Grade (Uni Results)
    const gradeRecord = state.semesterGrades?.find(g => g.studentRegNo === student.registerNumber && g.semesterId === semesterId);
    let uniGrades = "N/A";
    if (gradeRecord) {
      try {
        const res = JSON.parse(gradeRecord.results);
        uniGrades = Object.entries(res).map(([code, grade]) => `   • ${code}: ${grade}`).join("\n");
      } catch (e) { uniGrades = "Result Pending"; }
    }

    const int1List = int1.subjectBreakdown.map(item => `   • ${item.code}: ${item.mark}`).join("\n");
    const int2List = int2.subjectBreakdown.map(item => `   • ${item.code}: ${item.mark}`).join("\n");

    return `*🎓 CONSOLIDATED ACADEMIC REPORT*\n*Semester ${semesterId} Summary*\n\n` +
      `*Name*: ${student.name}\n` +
      `*Reg No*: ${student.registerNumber}\n\n` +
      `*1️⃣ INTERNAL ASSESSMENT 1*:\n${int1List}\n` +
      `   *Int 1 Avg*: ${int1.avgMarks.toFixed(2)}%\n\n` +
      `*2️⃣ INTERNAL ASSESSMENT 2*:\n${int2List}\n` +
      `   *Int 2 Avg*: ${int2.avgMarks.toFixed(2)}%\n\n` +
      `*📊 ATTENDANCE*: ${((int1.masterAtt + int2.masterAtt) / 2).toFixed(2)}%\n\n` +
      `*🏛️ UNIVERSITY GRADES*:\n${uniGrades}\n\n` +
      `_This is an automated academic update for your reference._`;
  };

  const generateMessage = (student: Student, semesterId: number, internalId: number) => {
    const report = getDetailedReportForInternal(student.registerNumber, semesterId, internalId, currentSemesterSubjects);
    const prevInternal = internalId > 1 ? getDetailedReportForInternal(student.registerNumber, semesterId, internalId - 1, currentSemesterSubjects) : null;

    let trend = "";
    if (prevInternal) {
      const diff = report.avgMarks - prevInternal.avgMarks;
      trend = `\n*Performance Trend*: ${diff > 0 ? "📈 Improved" : diff < 0 ? "📉 Needs Attention" : "➡️ Stable"}`;
    }

    const subjectList = report.subjectBreakdown.map(item => `*${item.name}*: ${item.mark}`).join("\n");
    return `*Academic Report - Sem ${semesterId} Int ${internalId}*\n\n*Name*: ${student.name}\n*Reg No*: ${student.registerNumber}\n\n*Marks*:\n${subjectList}\n\n*Total*: ${report.totalMarks}\n*Avg*: ${report.avgMarks.toFixed(2)}\n*Attendance*: ${report.masterAtt}%${trend}`;
  };

  const sendWhatsApp = (student: Student) => {
    const message = generateMessage(student, viewSemester, viewInternal);
    const encoded = encodeURIComponent(message);
    const phone = student.parentWhatsApp.replace(/\+/g, '').replace(/\s/g, '');
    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`, '_blank');
  };

  const handleGradeUpload = async () => {
    if (!uploadFile) {
      alert("Please select a PDF file first.");
      return;
    }
    setUploadLoading(true);
    try {
      const updatedGrades = await api.uploadGrades(uploadFile, uploadSem);
      updateState({ semesterGrades: updatedGrades });
      alert("Grade sheet processed successfully!");
      setUploadFile(null);
    } catch (err) {
      console.error(err);
      alert("Failed to process grade sheet. Ensure the PDF format is correct.");
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Nav */}
      <aside className="w-full lg:w-64 flex flex-col gap-2">
        <button onClick={() => setActiveTab('config')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'config' ? 'bg-brand-primary text-white shadow-lg' : 'bg-white hover:bg-brand-light'}`}><Settings className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Configuration</span></button>
        <button onClick={() => setActiveTab('students')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'students' ? 'bg-brand-primary text-white shadow-lg' : 'bg-white hover:bg-brand-light'}`}><Users className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Students</span></button>
        <button onClick={() => setActiveTab('staff')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'staff' ? 'bg-brand-primary text-white shadow-lg' : 'bg-white hover:bg-brand-light'}`}><UserCheck className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Staff Management</span></button>
        <button onClick={() => setActiveTab('attendance')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'attendance' ? 'bg-brand-primary text-white shadow-lg' : 'bg-white hover:bg-brand-light'}`}><ClipboardList className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Master Attendance</span></button>
        <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'reports' ? 'bg-brand-primary text-white shadow-lg' : 'bg-white hover:bg-brand-light'}`}><BarChart3 className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Analysis</span></button>
        <button onClick={() => setActiveTab('grades')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'grades' ? 'bg-brand-primary text-white shadow-lg' : 'bg-white hover:bg-brand-light'}`}><FileCheck className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Semester Grades</span></button>
        <button onClick={() => setActiveTab('messaging')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'messaging' ? 'bg-brand-primary text-white shadow-lg' : 'bg-white hover:bg-brand-light'}`}><MessageCircle className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Parent Portal</span></button>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 bg-white rounded-xl shadow-md p-6 border border-gray-100 overflow-x-hidden">

        {/* SHARED FILTER BAR */}
        {(activeTab === 'reports' || activeTab === 'messaging' || activeTab === 'attendance') && (
          <div className="mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-200 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border"><Layers className="w-4 h-4 text-brand-primary" /></div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Semester</label>
                <select value={viewSemester} onChange={(e) => setViewSemester(parseInt(e.target.value))} className="bg-[#131b2e] font-bold text-white outline-none cursor-pointer p-1 rounded border border-gray-700">
                  {[...Array(state.config.semesters)].map((_, i) => (<option key={i + 1} value={i + 1} className="bg-[#131b2e] text-white">Semester {i + 1}</option>))}
                </select>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border"><Hash className="w-4 h-4 text-brand-primary" /></div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Internal Exam</label>
                <div className="flex bg-white p-1 rounded-lg border">
                  {[...Array(state.config.internalsPerSem)].map((_, i) => (
                    <button key={i + 1} onClick={() => setViewInternal(i + 1)} className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${viewInternal === i + 1 ? 'bg-brand-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Int {i + 1}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 leading-tight"><Settings className="w-6 h-6" /> Academic Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-brand-light rounded-xl border border-brand-primary/10">
                <p className="text-xs text-brand-accent font-black uppercase tracking-widest mb-2">Duration</p>
                <div className="text-3xl font-black text-brand-deep">{state.config.years} Years</div>
              </div>
              <div className="p-4 bg-brand-light/50 rounded-xl border border-brand-primary/5">
                <p className="text-xs text-brand-accent/70 font-black uppercase tracking-widest mb-2">Structure</p>
                <div className="text-3xl font-black text-brand-deep/80">{state.config.semesters} Semesters</div>
              </div>
              <div className="p-4 bg-brand-light/30 rounded-xl border border-brand-primary/5">
                <p className="text-xs text-brand-accent/60 font-black uppercase tracking-widest mb-2">Assessment</p>
                <div className="text-3xl font-black text-brand-deep/70">{state.config.internalsPerSem} per Sem</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 leading-tight flex items-center gap-2"><Users className="w-6 h-6" /> Student Management</h3>
              <span className="bg-brand-light text-brand-accent px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">{state.students.length} Enrolled</span>
            </div>

            {/* Addition Form */}
            {!editingStudentReg && (
              <div className="bg-brand-light p-6 rounded-2xl border border-brand-primary/10 animate-in fade-in zoom-in duration-300">
                <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest mb-4">Register New Student</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input placeholder="Reg Number" className="px-3 py-2 border rounded-xl text-sm outline-brand-primary font-mono bg-white" value={newStudent.registerNumber} onChange={e => setNewStudent({ ...newStudent, registerNumber: e.target.value })} />
                  <input placeholder="Roll Number" className="px-3 py-2 border rounded-xl text-sm outline-brand-primary bg-white" value={newStudent.rollNumber} onChange={e => setNewStudent({ ...newStudent, rollNumber: e.target.value })} />
                  <input placeholder="Full Name" className="px-3 py-2 border rounded-xl text-sm outline-brand-primary bg-white" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} />
                  <input placeholder="Parent Phone (91...)" className="px-3 py-2 border rounded-xl text-sm outline-brand-primary bg-white" value={newStudent.parentWhatsApp} onChange={e => setNewStudent({ ...newStudent, parentWhatsApp: e.target.value })} />
                  {/* Updated: Button text color is now black/dark for better contrast */}
                  <button onClick={addStudent} className="lg:col-span-4 bg-brand-primary hover:bg-brand-secondary text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest shadow-lg transition-all active:scale-[0.98]"><Plus className="w-5 h-5" /> Register Student</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search by Reg No or Name..." className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-brand-light outline-none" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} /></div>
              <div className="overflow-x-auto border rounded-2xl shadow-sm bg-white">
                <table className="w-full text-left text-sm font-serif">
                  <thead className="bg-brand-deep text-white border-b">
                    <tr>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Reg No</th>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Roll No</th>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Full Name</th>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Contact Number</th>
                      <th className="px-6 py-5 text-right font-black text-[10px] uppercase tracking-[0.2em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStudents.map(s => {
                      const isEditing = editingStudentReg === s.registerNumber;
                      return (
                        <tr key={s.registerNumber} className={`hover:bg-brand-light/30 transition-colors ${isEditing ? 'bg-brand-light' : ''}`}>
                          <td className="px-6 py-4 font-mono font-bold text-brand-primary">
                            {s.registerNumber}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {isEditing ? (
                              <input className="w-full px-2 py-1 border rounded text-xs" value={editStudentData?.rollNumber} onChange={e => setEditStudentData({ ...editStudentData!, rollNumber: e.target.value })} />
                            ) : s.rollNumber}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">
                            {isEditing ? (
                              <input className="w-full px-2 py-1 border rounded text-xs" value={editStudentData?.name} onChange={e => setEditStudentData({ ...editStudentData!, name: e.target.value })} />
                            ) : s.name}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {isEditing ? (
                              <input className="w-full px-2 py-1 border rounded text-xs" value={editStudentData?.parentWhatsApp} onChange={e => setEditStudentData({ ...editStudentData!, parentWhatsApp: e.target.value })} />
                            ) : s.parentWhatsApp}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button onClick={saveEditedStudent} className="p-2 text-green-600 hover:bg-green-50 rounded-lg shadow-sm" title="Save Changes"><Check className="w-4 h-4" /></button>
                                  <button onClick={cancelEditingStudent} className="p-2 text-gray-400 hover:bg-gray-200 rounded-lg" title="Cancel"><X className="w-4 h-4" /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditingStudent(s)} className="p-2 text-gray-400 hover:text-brand-primary hover:bg-indigo-50 rounded-lg" title="Edit Student"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => removeStudent(s.registerNumber)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete Student"><Trash2 className="w-4 h-4" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <tr><td colSpan={5} className="py-20 text-center text-gray-400 italic">No students found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Subjects Tab Content Removed */}

        {activeTab === 'staff' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 leading-tight flex items-center gap-2"><UserCheck className="w-6 h-6" /> Staff Management</h3>
              <span className="bg-brand-light text-brand-accent px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">{state.staff?.length || 0} Faculty</span>
            </div>

            {/* Add Staff Form */}
            <div className="bg-brand-light p-6 rounded-2xl border border-brand-primary/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-brand-primary/50 uppercase">Faculty Name</label>
                <input
                  placeholder="e.g. Dr. Vasuki"
                  className="w-full px-3 py-2 border rounded-md text-sm outline-brand-primary bg-white"
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-brand-primary/50 uppercase">Semester</label>
                <select
                  className="w-full px-3 py-2 border rounded-md text-sm outline-brand-primary bg-[#131b2e] text-white"
                  value={newStaff.semesterId}
                  onChange={e => setNewStaff({ ...newStaff, semesterId: parseInt(e.target.value) })}
                >
                  {[...Array(state.config.semesters)].map((_, i) => <option key={i + 1} value={i + 1} className="bg-[#131b2e] text-white">Semester {i + 1}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-brand-primary/50 uppercase">Subject Code</label>
                <input
                  placeholder="e.g. CS3451"
                  className="w-full px-3 py-2 border rounded-md text-sm outline-brand-primary bg-white"
                  value={newStaff.subjectCode}
                  onChange={e => setNewStaff({ ...newStaff, subjectCode: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-brand-primary/50 uppercase">Subject Name</label>
                <input
                  placeholder="e.g. Operating Systems"
                  className="w-full px-3 py-2 border rounded-md text-sm outline-brand-primary bg-white"
                  value={newStaff.subjectName}
                  onChange={e => setNewStaff({ ...newStaff, subjectName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-brand-primary/50 uppercase">Password</label>
                <input
                  type="password"
                  placeholder="Set login password"
                  className="w-full px-3 py-2 border rounded-md text-sm outline-brand-primary bg-white"
                  value={newStaff.password}
                  onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    if (!newStaff.name || !newStaff.subjectCode || !newStaff.subjectName || !newStaff.password) {
                      alert("Please fill all details, including password");
                      return;
                    }
                    const staffPayload = editingStaffId ? { ...newStaff, id: editingStaffId } : newStaff;

                    api.addStaff(staffPayload).then(saved => {
                      if (editingStaffId) {
                        updateState({ staff: state.staff.map(s => s.id === editingStaffId ? saved : s) });
                        alert("Staff details updated successfully!");
                      } else {
                        updateState({ staff: [...(state.staff || []), saved] });
                        alert("Staff details added successfully!");
                      }
                      setNewStaff({ name: '', semesterId: 1, subjectCode: '', subjectName: '', password: 'staff123' });
                      setEditingStaffId(null);
                    }).catch(err => alert("Failed to save staff"));
                  }}
                  className={`w-full ${editingStaffId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-brand-primary hover:bg-brand-secondary'} text-white py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95`}
                >
                  {editingStaffId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingStaffId ? 'Update Staff' : 'Add Staff'}
                </button>
                {editingStaffId && (
                  <button
                    onClick={() => {
                      setNewStaff({ name: '', semesterId: 1, subjectCode: '', subjectName: '', password: 'staff123' });
                      setEditingStaffId(null);
                    }}
                    className="bg-gray-200 text-gray-600 p-2.5 rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Staff List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(state.staff || []).map(staff => (
                <div key={staff.id} className="p-4 border rounded-xl bg-white shadow-sm hover:border-brand-primary/30 transition-all flex justify-between items-start group">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-brand-light text-brand-primary rounded uppercase">Sem {staff.semesterId}</span>
                      <h4 className="font-bold text-gray-900">{staff.name}</h4>
                    </div>
                    <div className="text-xs text-gray-500">
                      <p><span className="font-mono font-bold text-gray-700">{staff.subjectCode}</span> - {staff.subjectName}</p>
                      <p className="mt-1 text-[10px] text-gray-400">Password: <span className="font-mono">{staff.password}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingStaffId(staff.id!);
                        setNewStaff({
                          name: staff.name,
                          semesterId: staff.semesterId,
                          subjectCode: staff.subjectCode,
                          subjectName: staff.subjectName,
                          password: staff.password || ''
                        });
                      }}
                      className="p-1.5 text-gray-300 hover:text-brand-primary hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this staff mapping?")) {
                          api.deleteStaff(staff.id!).then(() => {
                            updateState({ staff: state.staff.filter(s => s.id !== staff.id) });
                          });
                        }
                      }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {(state.staff || []).length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed">
                  No staff details added yet. Add staff manually above to enable them to login.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 leading-tight flex items-center gap-2"><ClipboardList className="w-6 h-6" /> Master Attendance Entry</h3>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setAttEntryMode('manual')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${attEntryMode === 'manual' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => setAttEntryMode('excel')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${attEntryMode === 'excel' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Excel Upload
                </button>
              </div>
            </div>

            <p className="text-sm text-brand-primary bg-brand-light p-4 rounded-xl border border-brand-primary/10">Advisor marks the <b>overall</b> attendance for this internal assessment period. This percentage will be visible to parents.</p>

            {attEntryMode === 'manual' ? (
              <div className="overflow-x-auto border rounded-2xl shadow-sm bg-white overflow-hidden">
                <table className="w-full text-left font-serif">
                  <thead className="bg-brand-deep text-white border-b">
                    <tr>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Reg No</th>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Name</th>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Total Att %</th>
                      <th className="px-6 py-5 text-right font-black text-[10px] uppercase tracking-[0.2em]">Sync Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {state.students.map(s => {
                      const val = getMasterAttendance(s.registerNumber);
                      return (<tr key={s.registerNumber} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-xs">{s.registerNumber}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{s.name}</td>
                        <td className="px-6 py-4">
                          <AttendanceInput
                            initialValue={val}
                            onSave={(newVal) => handleMasterAttendanceChange(s.registerNumber, newVal)}
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          {val !== '' ? <span className="text-green-500 bg-green-50 px-2 py-1 rounded-full text-[10px] font-black uppercase">Recorded</span> : '--'}
                        </td>
                      </tr>)
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-100 text-center space-y-6">
                <Upload className="w-16 h-16 text-brand-primary/20 mx-auto" />
                <div className="max-w-md mx-auto">
                  <h4 className="text-lg font-black text-gray-900">Upload Attendance via Excel</h4>
                  <p className="text-gray-500 text-sm mt-2">Download the template, fill in the attendance percentages for each student, and upload it back.</p>
                </div>

                <div className="flex flex-col md:flex-row justify-center items-center gap-4">
                  <button
                    onClick={() => {
                      const data = state.students.map(s => ({
                        'Register Number': s.registerNumber,
                        'Name': s.name,
                        'Attendance Percentage': getMasterAttendance(s.registerNumber) || 0
                      }));
                      const ws = XLSX.utils.json_to_sheet(data);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
                      XLSX.writeFile(wb, `Attendance_Sem${viewSemester}_Int${viewInternal}.xlsx`);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Download Template
                  </button>

                  <div className="relative">
                    <input
                      type="file"
                      id="att-excel-upload"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadLoading(true);
                        const reader = new FileReader();
                        reader.onload = async (evt) => {
                          try {
                            const bstr = evt.target?.result;
                            const workbook = XLSX.read(bstr, { type: 'binary' });
                            const sheetName = workbook.SheetNames[0];
                            const sheet = workbook.Sheets[sheetName];
                            const json = XLSX.utils.sheet_to_json(sheet) as any[];

                            const results = [];
                            for (const row of json) {
                              const keys = Object.keys(row);
                              const regNoKey = keys.find(k => k.toLowerCase().includes('reg') || k.toLowerCase().includes('roll'));
                              const valKey = keys.find(k => k.toLowerCase().includes('attend') || k.toLowerCase().includes('percentage') || k.toLowerCase().includes('mark'));

                              if (regNoKey && valKey) {
                                const regNo = String(row[regNoKey]).trim();
                                const value = String(row[valKey]).trim();
                                if (value) {
                                  const saved = await handleMasterAttendanceChange(regNo, value, true);
                                  if (saved) results.push(saved);
                                }
                              }
                            }

                            if (results.length > 0) {
                              const existingIds = new Set(results.map(r => r.studentRegNo));
                              const remaining = state.masterAttendance.filter(ma => !(
                                existingIds.has(ma.studentRegNo) &&
                                Number(ma.semesterId) === Number(viewSemester) &&
                                Number(ma.internalId) === Number(viewInternal)
                              ));
                              updateState({ masterAttendance: [...remaining, ...results] });
                            }
                            setAttSuccessMsg(`${results.length} records processed successfully!`);
                            setTimeout(() => setAttSuccessMsg(''), 5000);
                          } catch (err) {
                            console.error(err);
                            alert("Failed to parse Excel file.");
                          } finally {
                            setUploadLoading(false);
                            e.target.value = '';
                          }
                        };
                        reader.readAsBinaryString(file);
                      }}
                    />
                    <label
                      htmlFor="att-excel-upload"
                      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 cursor-pointer ${uploadLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand-primary text-white hover:bg-brand-secondary'}`}
                    >
                      <Upload className="w-4 h-4" /> {uploadLoading ? 'Processing...' : 'Upload Excel'}
                    </label>
                  </div>
                </div>

                {attSuccessMsg && (
                  <div className="mt-4 p-3 bg-green-50 text-green-600 rounded-xl text-xs font-black animate-bounce">
                    {attSuccessMsg}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-xl font-bold text-gray-900 leading-tight flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Semester Performance Ledger</h3>
              <div className="flex gap-2">
                <button onClick={handleExportCSV} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95"><FileSpreadsheet className="w-4 h-4" /> Export CSV Report</button>
              </div>
            </div>

            {/* Added: University Grade Summary Block */}
            <div className="bg-white p-6 rounded-3xl border shadow-sm mb-2">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-brand-deep" /> University Results Overview (Sem {viewSemester})
                </h4>
              </div>
              {state.semesterGrades.filter(g => g.semesterId === viewSemester).length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100 min-w-[150px]">
                    <p className="text-[10px] font-black text-green-600 uppercase">Pass Percentage</p>
                    <p className="text-3xl font-black text-green-700 mt-1">
                      {(() => {
                        const grades = state.semesterGrades.filter(g => g.semesterId === viewSemester);
                        if (grades.length === 0) return '0%';
                        const passed = grades.filter(g => {
                          const res = JSON.parse(g.results);
                          return !Object.values(res).some(r => r === 'U' || r === 'UA' || r === 'RA');
                        }).length;
                        return Math.round((passed / grades.length) * 100) + '%';
                      })()}
                    </p>
                  </div>
                  <div className="p-4 bg-brand-light rounded-2xl border border-brand-primary/10 min-w-[150px]">
                    <p className="text-[10px] font-black text-brand-primary uppercase">Results Uploaded</p>
                    <p className="text-3xl font-black text-brand-deep mt-1">
                      {state.semesterGrades.filter(g => g.semesterId === viewSemester).length}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 italic text-sm border-2 border-dashed rounded-xl">
                  No university results uploaded for Semester {viewSemester}. Use "Semester Grades" tab to upload PDF.
                </div>
              )}
            </div>

            {/* Class Charts Section - Overall Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Subject Wise Performance (Internal {viewInternal})</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentSemesterSubjects.map(sub => {
                      const subMarks = state.marks.filter(m => (m.subjectId === sub.id || m.subjectId === sub.code) && Number(m.internalId) === Number(viewInternal));
                      const avg = subMarks.length > 0 ? (subMarks.reduce((a, b) => a + b.marks, 0) / subMarks.length) : 0;
                      return { name: sub.code, AvgMark: parseFloat(avg.toFixed(2)), FullName: sub.name };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Legend />
                      <Bar dataKey="AvgMark" radius={[6, 6, 0, 0]} barSize={30} name="Avg Score">
                        {currentSemesterSubjects.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Overall Attendance Analysis</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(() => {
                      // Calculate class average attendance for Int 1 vs Int 2
                      const getAvgAtt = (intId: number) => {
                        const recs = state.masterAttendance.filter(m => Number(m.semesterId) === Number(viewSemester) && Number(m.internalId) === Number(intId));
                        return recs.length > 0 ? (recs.reduce((a, b) => a + b.percentage, 0) / recs.length) : 0;
                      };
                      return [
                        { name: 'Internal 1', AvgAtt: parseFloat(getAvgAtt(1).toFixed(2)) },
                        { name: 'Internal 2', AvgAtt: parseFloat(getAvgAtt(2).toFixed(2)) }
                      ];
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Legend />
                      <Bar dataKey="AvgAtt" radius={[6, 6, 0, 0]} barSize={40} name="Avg Attendance %">
                        <Cell fill="#046e84" />
                        <Cell fill="#fbbf24" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Class Stats Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-brand-light to-brand-primary/10 p-6 rounded-3xl border border-brand-primary/20 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-brand-primary"><Users className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black text-brand-primary/50 uppercase tracking-widest">Enrolled</p><p className="text-3xl font-black text-brand-deep">{classStats.studentCount}</p></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-brand-light to-brand-primary/5 p-6 rounded-3xl border border-brand-primary/10 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-brand-primary"><GraduationCap className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Class Avg Mark</p><p className="text-3xl font-black text-brand-deep">{classStats.avgMark.toFixed(2)}</p></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-brand-light/40 to-brand-primary/5 p-6 rounded-3xl border border-brand-primary/10 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-brand-primary"><PieChart className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Class Avg Att%</p><p className={`text-3xl font-black ${classStats.avgAtt < 75 ? 'text-red-500' : 'text-brand-deep'}`}>{classStats.avgAtt.toFixed(2)}%</p></div>
                </div>
              </div>
            </div>

            {/* DETAILED MARKS LEDGER */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-12">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Consolidated Internal Marks Ledger</h4>
                <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded border">Avg Marks Int 1 | Int 2</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-serif">
                  <thead className="bg-brand-deep text-white border-b">
                    <tr>
                      <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-[10px]">Reference ID</th>
                      <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-[10px]">Student Identity</th>
                      {currentSemesterSubjects.map(sub => (
                        <th key={sub.id} className="px-5 py-5 font-black uppercase text-[10px] tracking-[0.2em] text-center border-l border-white/10 whitespace-nowrap min-w-[130px]">
                          {sub.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(classStats as any).reportList?.map((item: any) => {
                      let totalMarks = 0;
                      return (
                        <tr key={item.student.registerNumber} className="hover:bg-brand-light/10 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-brand-primary">{item.student.registerNumber}</td>
                          <td className="px-6 py-4 font-bold text-gray-800">{item.student.name}</td>
                          {currentSemesterSubjects.map(sub => {
                            const m1 = item.int1.subjectBreakdown.find((b: any) => b.code === sub.code)?.mark;
                            const m2 = item.int2.subjectBreakdown.find((b: any) => b.code === sub.code)?.mark;

                            const v1 = (m1 && m1 !== '-' && m1 !== 'AB') ? parseFloat(m1) : 0;
                            const v2 = (m2 && m2 !== '-' && m2 !== 'AB') ? parseFloat(m2) : 0;
                            totalMarks += (v1 + v2);

                            return (
                              <td key={sub.id} className="px-4 py-4 text-center border-l">
                                <div className="flex justify-center items-center gap-2">
                                  <span className={`font-bold w-8 text-right ${(m1 === '-' || m1 < 50) ? 'text-gray-400' : 'text-gray-700'}`}>{m1}</span>
                                  <span className="text-gray-200 text-[10px]">|</span>
                                  <span className={`font-bold w-8 text-left ${(m2 === '-' || m2 < 50) ? 'text-gray-400' : 'text-gray-700'}`}>{m2}</span>
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-4 py-4 font-black text-center text-brand-deep border-l bg-brand-light/10">{totalMarks.toFixed(0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-3xl shadow-xl bg-white scrollbar-thin scrollbar-thumb-brand-light">
              <table className="w-full text-left text-xs font-serif">
                <thead className="bg-brand-deep text-white border-b">
                  <tr>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] sticky left-0 bg-brand-deep shadow-xl z-10">Reg No</th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em]">Roll No</th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em]">Full Name</th>
                    {currentSemesterSubjects.map(sub => (
                      <React.Fragment key={sub.id}>
                        <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-center min-w-[150px] bg-white/5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>{sub.name}</span>
                            <span className="text-[9px] opacity-70">({sub.code})</span>
                          </div>
                        </th>
                        {isEvenInternal && <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-center min-w-[120px] bg-emerald-800/20 text-emerald-100 whitespace-nowrap border-l border-white/10">{sub.name} (Lab)</th>}
                      </React.Fragment>
                    ))}
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-center bg-black/20">Total</th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-center bg-black/30">Avg %</th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-center bg-black/40">Att %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {state.students.map((s, idx) => {
                    const report = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal, currentSemesterSubjects);
                    return (
                      <tr key={s.registerNumber} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-brand-light/20'} hover:bg-brand-light/50 transition-colors`}>
                        <td className="px-6 py-4 font-mono font-black text-brand-primary border-r sticky left-0 bg-inherit shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10">{s.registerNumber}</td>
                        <td className="px-6 py-4 text-gray-400 font-medium">{s.rollNumber}</td>
                        <td className="px-6 py-4 font-black text-gray-900 truncate max-w-[150px]">{s.name}</td>
                        {report.subjectBreakdown.map((item, bidx) => (
                          <React.Fragment key={bidx}>
                            <td className="px-6 py-4 text-center font-bold text-gray-600">{item.mark}</td>
                            {isEvenInternal && <td className="px-6 py-4 text-center font-bold text-emerald-600 bg-emerald-50/20">{item.labMark}</td>}
                          </React.Fragment>
                        ))}
                        <td className="px-6 py-4 text-center font-black text-brand-deep bg-brand-light/10">{report.totalMarks}</td>
                        <td className="px-6 py-4 text-center font-black text-brand-deep bg-brand-light/10">{report.avgMarks.toFixed(1)}</td>
                        <td className={`px-6 py-4 text-center font-black bg-brand-light/10 ${report.masterAtt < 75 ? 'text-red-500' : 'text-green-600'}`}>{report.masterAtt}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'messaging' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-brand-light/30 p-6 rounded-[2.5rem] border border-brand-primary/10">
              <div>
                <h3 className="text-xl font-bold text-gray-900 leading-tight flex items-center gap-2"><MessageCircle className="w-6 h-6" /> Parent Portal Communication</h3>
                <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mt-1">Semester {viewSemester} • Internal {viewInternal}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={startSemesterBroadcast}
                  disabled={broadcastLocked[`sem-${viewSemester}-summary`]}
                  className={`${broadcastLocked[`sem-${viewSemester}-summary`] ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-deep hover:bg-brand-primary'} text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2`}
                >
                  <FileText className="w-4 h-4" />
                  {broadcastLocked[`sem-${viewSemester}-summary`] ? 'Summary Sent' : 'Broadcast Semester Summary'}
                </button>
                <button
                  onClick={startInternalBroadcast}
                  className={`${broadcastLocked[`sem-${viewSemester}-int-${viewInternal}`] ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-secondary'} text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95`}
                  disabled={broadcastLocked[`sem-${viewSemester}-int-${viewInternal}`]}
                >
                  <Megaphone className="w-4 h-4 mr-2 inline" />
                  {broadcastLocked[`sem-${viewSemester}-int-${viewInternal}`] ? 'Int Broadcast Sent' : 'Broadcast Int Result'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.students.map(s => {
                const stats = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal, currentSemesterSubjects);
                return (
                  <div key={s.registerNumber} className="p-5 border rounded-2xl flex flex-col justify-between hover:shadow-xl transition-all bg-white border-gray-100 hover:border-brand-primary/20">
                    <div>
                      <h4 className="font-black text-gray-900 mb-1">{s.name}</h4>
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-4">{s.registerNumber}</p>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-2.5 bg-gray-50 rounded-xl text-center"><p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Avg Score</p><p className="font-black text-brand-primary">{stats.avgMarks.toFixed(1)}</p></div>
                        <div className="p-2.5 bg-gray-50 rounded-xl text-center"><p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Attendance</p><p className={`font-black ${stats.masterAtt < 75 ? 'text-red-500' : 'text-green-600'}`}>{stats.masterAtt}%</p></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <button onClick={() => sendWhatsApp(s)} className="w-full py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-bold uppercase text-[10px] tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4" /> Send Int {viewInternal} Report</button>
                      <button
                        onClick={() => {
                          const message = generateSemesterSummaryMessage(s, viewSemester);
                          const encoded = encodeURIComponent(message);
                          window.open(`https://wa.me/${s.parentWhatsApp}?text=${encoded}`, '_blank');
                        }}
                        className="w-full py-3 bg-brand-deep text-white rounded-xl hover:bg-brand-primary font-bold uppercase text-[10px] tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" /> Send Semester Summary
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold text-gray-900 leading-tight flex items-center gap-2"><Upload className="w-6 h-6" /> Semester Grade Processing</h3>

            <div className="bg-brand-light p-8 rounded-3xl border border-brand-primary/10 space-y-6">

              {/* Step 1: Convert */}
              <div className="bg-white p-6 rounded-2xl border border-brand-primary/10 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-brand-primary text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest z-10">Step 1</div>
                <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-wide mb-2"><FileText className="w-5 h-5 text-brand-primary" /> Convert PDF to Excel</h4>
                <p className="text-xs text-gray-500 mb-6 max-w-2xl leading-relaxed">
                  Select the Semester to create a <b>Template Excel Sheet</b> matched to your subjects, then upload the PDF to fill it.
                </p>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="min-w-[150px]">
                    <label className="block text-[10px] font-black text-brand-primary uppercase mb-2">Select Semester</label>
                    <select
                      value={uploadSem}
                      onChange={(e) => setUploadSem(parseInt(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20"
                    >
                      {[...Array(state.config.semesters)].map((_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-black text-brand-primary uppercase mb-2">Upload Result PDF</label>
                    <label
                      className={`flex items-center justify-center gap-3 w-full border-2 border-dashed rounded-xl px-4 py-2.5 cursor-pointer transition-all ${uploadFile ? 'border-brand-primary bg-brand-light/20 text-brand-primary' : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-brand-primary/40'}`}
                    >
                      <Upload className="w-5 h-5" />
                      <span className="font-bold text-sm truncate">{uploadFile ? uploadFile.name : 'Select PDF'}</span>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <button
                    onClick={async () => {
                      if (!uploadFile) return alert("Select PDF first");
                      setUploadLoading(true);
                      try {
                        const blob = await api.convertPdfToCsv(uploadFile, uploadSem);
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Grades_Template_Sem${uploadSem}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setUploadFile(null); // Clear for next step
                        alert("Template Generated! Please check downloads.");
                      } catch (e) {
                        console.error(e);
                        alert("Conversion Failed");
                      } finally {
                        setUploadLoading(false);
                      }
                    }}
                    disabled={uploadLoading || !uploadFile}
                    className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2 ${uploadLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand-deep text-white hover:bg-black'}`}
                  >
                    {uploadLoading ? 'Generating...' : 'Get Excel'} <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Step 2: Upload CSV */}
              <div className="bg-white p-6 rounded-2xl border border-brand-primary/10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-brand-secondary text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest z-10">Step 2</div>
                <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-wide mb-2"><FileSpreadsheet className="w-5 h-5 text-green-600" /> Upload Verified Excel (CSV)</h4>
                <p className="text-xs text-gray-500 mb-6 max-w-2xl leading-relaxed">
                  Upload the <b>verified CSV file</b> here to map grades to students. Ensure "Register Number" column exists.
                </p>
                <div className="flex gap-4 items-end">
                  <div className="min-w-[150px]">
                    <label className="block text-[10px] font-black text-brand-secondary uppercase mb-2">Target Semester</label>
                    <select
                      value={uploadSem}
                      onChange={(e) => setUploadSem(parseInt(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-secondary/20"
                    >
                      {[...Array(state.config.semesters)].map((_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-brand-secondary uppercase mb-2">Select Verified CSV</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!confirm(`Upload grades from ${file.name} to Semester ${uploadSem}?`)) return;

                        setUploadLoading(true);
                        try {
                          const updated = await api.uploadCsvGrades(file, uploadSem);
                          updateState({ semesterGrades: updated });
                          alert("Grades Mapped Successfully!");
                        } catch (err) {
                          console.error(err);
                          alert("Failed to upload grades. Check CSV format.");
                        } finally {
                          setUploadLoading(false);
                          e.target.value = ''; // Reset input
                        }
                      }}
                      className="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2.5 file:px-4
                              file:rounded-xl file:border-0
                              file:text-xs file:font-black file:uppercase file:tracking-widest
                              file:bg-brand-secondary file:text-white
                              hover:file:bg-brand-primary transition-all
                              cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Download Consolidated Report */}
              <div className="bg-white p-6 rounded-2xl border border-brand-primary/10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gray-900 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest z-10">Step 3</div>
                <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-wide mb-2"><FileSpreadsheet className="w-5 h-5 text-gray-900" /> Consolidated Report</h4>
                <p className="text-xs text-gray-500 mb-6 max-w-2xl leading-relaxed">
                  Download a single Excel file containing all semester grades, separated by sheets. Ideal for overall analysis.
                </p>
                <button
                  onClick={async () => {
                    try {
                      setUploadLoading(true);
                      const blob = await api.downloadConsolidatedExcel();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Consolidated_Semester_Grades.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    } catch (e) {
                      console.error(e);
                      alert("Download Failed");
                    } finally {
                      setUploadLoading(false);
                    }
                  }}
                  disabled={uploadLoading}
                  className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2 bg-brand-deep text-white hover:bg-black"
                >
                  <Download className="w-4 h-4" /> Download Consolidated Excel
                </button>
              </div>

            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Recently Processed Results</h4>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-brand-primary uppercase">Focus Subject:</span>
                  <select
                    value={gradeViewSubject}
                    onChange={(e) => setGradeViewSubject(e.target.value)}
                    className="bg-white border rounded-lg px-3 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="all">All Subjects View</option>
                    {state.subjects.filter(s => s.semesterId === uploadSem).map(s => (
                      <option key={s.id} value={s.code}>{s.code}: {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto border rounded-2xl shadow-sm bg-white overflow-hidden">
                <table className="w-full text-left text-sm font-serif">
                  <thead className="bg-brand-deep text-white border-b">
                    <tr>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Student Identity</th>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] border-x border-white/10 text-center">Semester</th>
                      {gradeViewSubject === 'all' ? (
                        <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Grades Summary</th>
                      ) : (
                        <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] bg-white/10 border-x border-white/10 text-center">{getSubjectName(gradeViewSubject)} ({gradeViewSubject})</th>
                      )}
                      <th className="px-6 py-5 text-right font-black text-[10px] uppercase tracking-[0.2em]">Status</th>
                      <th className="px-6 py-5 text-right font-black text-[10px] uppercase tracking-[0.2em]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {state.students.length > 0 ? (
                      state.students.map(student => {
                        const g = state.semesterGrades?.find(grade => grade.studentRegNo === student.registerNumber && grade.semesterId === uploadSem);
                        return (
                          <tr key={student.registerNumber} className="hover:bg-brand-light/30 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-brand-primary border-r">
                              <div>{student.name}</div>
                              <div className="text-[10px] text-gray-400">{student.registerNumber}</div>
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-600 border-r text-center">Sem {uploadSem}</td>
                            <td className="px-6 py-4">
                              {g ? (
                                gradeViewSubject === 'all' ? (
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(JSON.parse(g.results)).map(([code, grade]) => (
                                      <span key={code} className={`px-2 py-1 rounded-md text-[10px] font-black shadow-sm flex items-center gap-1 border ${grade === 'U' || grade === 'UA' || grade === 'RA'
                                        ? 'bg-red-50 text-red-600 border-red-100'
                                        : grade === 'O' || grade === 'A+'
                                          ? 'bg-green-50 text-green-700 border-green-100'
                                          : 'bg-indigo-50 text-brand-primary border-indigo-100'
                                        }`} title={getSubjectName(code)}>
                                        <span className="opacity-50 text-[8px]">{code}</span>
                                        <span>{grade as string}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    {(() => {
                                      const res = JSON.parse(g.results);
                                      const grade = res[gradeViewSubject];
                                      return grade ? (
                                        <span className={`px-4 py-1.5 rounded-lg text-lg font-black ${grade === 'U' || grade === 'UA' || grade === 'RA' ? 'text-red-500 bg-red-50 border-2 border-red-200 animate-pulse' : 'text-brand-primary'}`}>
                                          {grade}
                                        </span>
                                      ) : (
                                        <span className="text-gray-300 font-bold">N/A</span>
                                      );
                                    })()}
                                  </div>
                                )
                              ) : (
                                <div className="text-center text-gray-300 italic text-xs font-bold">No data found in sheet</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {g ? (
                                <span className="text-green-500 bg-green-50 px-2 py-1 rounded-full text-[10px] font-black uppercase">Mapped</span>
                              ) : (
                                <span className="text-gray-400 bg-gray-100 px-2 py-1 rounded-full text-[10px] font-black uppercase italic">Pending</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {g && (
                                <button
                                  onClick={() => setViewingGradeDetails(g)}
                                  className="text-brand-primary hover:text-brand-secondary transition-colors"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={5} className="py-12 text-center text-gray-400 italic">No students registered in the system.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Grade Details Modal */}
        {viewingGradeDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
              <div className="bg-brand-primary p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black">Semester Grade Profile</h3>
                  <p className="opacity-70 font-bold text-sm tracking-widest uppercase mt-1">Reg No: {viewingGradeDetails.studentRegNo}</p>
                </div>
                <button onClick={() => setViewingGradeDetails(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-8 h-8" /></button>
              </div>
              <div className="p-8">
                <div className="space-y-4">
                  <div className="flex justify-between border-b pb-4 text-xs font-black uppercase text-gray-400 tracking-widest">
                    <span>Subject Code / Name</span>
                    <span>Obtained Grade</span>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                    {state.subjects.filter(s => s.semesterId === viewingGradeDetails.semesterId).map(subject => {
                      const res = JSON.parse(viewingGradeDetails.results);
                      const grade = res[subject.code] || res[subject.code.toUpperCase()] || res[subject.code.toLowerCase()];
                      return (
                        <div key={subject.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <div>
                            <p className="font-black text-gray-900 leading-tight">{subject.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase font-mono">{subject.code}</p>
                          </div>
                          <div className={`text-2xl font-black ${grade === 'U' || grade === 'UA' || grade === 'RA' ? 'text-red-500' : grade ? 'text-brand-primary' : 'text-gray-300'}`}>
                            {grade || 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                    {/* Also show any extra codes found in the result that aren't in our subject list */}
                    {Object.entries(JSON.parse(viewingGradeDetails.results))
                      .filter(([code]) => !state.subjects.some(s => s.code.toLowerCase() === code.toLowerCase()))
                      .map(([code, grade]) => (
                        <div key={code} className="flex justify-between items-center bg-brand-light/20 p-4 rounded-2xl border border-dashed border-brand-primary/20">
                          <div>
                            <p className="font-black text-brand-primary italic leading-tight">External Result</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase font-mono">{code}</p>
                          </div>
                          <div className={`text-2xl font-black ${grade === 'U' || grade === 'UA' || grade === 'RA' ? 'text-red-500' : 'text-brand-primary'}`}>
                            {grade as string}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                <button onClick={() => setViewingGradeDetails(null)} className="w-full mt-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl">Close Profile</button>
              </div>
            </div>
          </div>
        )}

        {/* Broadcast Queue Modal */}
        {broadcastQueue.length > 0 && currentBroadcastIndex >= 0 && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 border-t-8 ${broadcastChannel === 'sms' ? 'border-blue-500' : 'border-green-500'}`}>

              {/* Header */}
              <div className={`${broadcastChannel === 'whatsapp' ? 'bg-brand-primary' : 'bg-blue-600'} p-8 text-white relative transition-colors`}>
                <button
                  onClick={() => { setBroadcastQueue([]); setCurrentBroadcastIndex(-1); setIsAutoPilot(false); }}
                  className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    {broadcastChannel === 'whatsapp' ? <MessageSquare className="w-8 h-8 text-brand-accent" /> : <MessageCircle className="w-8 h-8 text-blue-200" />}
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-black leading-tight">Automation Center</h3>
                    <p className="opacity-70 font-bold text-[10px] tracking-widest uppercase">Reporting to {broadcastQueue.length} Parents</p>
                  </div>
                </div>
              </div>

              <div className="px-8 pt-6 pb-2">
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setBroadcastChannel('whatsapp')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${broadcastChannel === 'whatsapp' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-400'}`}
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setBroadcastChannel('sms')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${broadcastChannel === 'sms' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                  >
                    Direct SMS
                  </button>
                </div>
              </div>
              <div className="p-8 space-y-6">
                {/* 100% AUTOMATIC SECTION (RECOMMENDED) */}
                <div className="bg-brand-light/50 p-6 rounded-3xl border-2 border-brand-primary/20 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-brand-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Recommended</div>
                    <span className="text-xs font-black text-brand-primary uppercase tracking-tight">100% Fully Automatic (Zero Clicking)</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
                    To send all messages <b>without clicking "Send" for every student</b>, download this file and upload it to your bulk sender extension (like WASender).
                  </p>
                  <button
                    onClick={handleExportForBulk}
                    className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-secondary transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group"
                  >
                    <Download className="w-5 h-5 animate-bounce" />
                    Download File for Auto-Sender
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-300 px-4 bg-white">Or Use Semi-Auto (Requires Enter key)</div>
                </div>

                {/* SEMI-AUTO SECTION */}
                {isAutoPilot ? (
                  <div className="py-6 bg-gray-50 text-brand-primary rounded-3xl font-black uppercase text-xs tracking-widest flex flex-col items-center gap-2 border border-gray-100 shadow-inner">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                      <span>Auto-Pilot: {broadcastQueue[currentBroadcastIndex].student.name}</span>
                    </div>
                    <div className="text-[32px] font-black text-brand-deep leading-none my-1">{nextSendTimer}s</div>
                    <div className="text-[10px] text-gray-400 opacity-80 normal-case font-medium px-8 text-center">
                      Keep the message window open and press <b>ENTER</b> when the text appears.
                    </div>
                    <button
                      onClick={() => setIsAutoPilot(false)}
                      className="mt-4 px-6 py-2 bg-white text-red-500 rounded-full text-[10px] hover:bg-red-50 transition-all font-black border border-red-100 shadow-sm"
                    >
                      STOP BROADCAST
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => { setIsFlashMode(false); setIsAutoPilot(true); processNextInQueue(); }}
                      className="py-4 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-brand-primary/30 transition-all flex flex-col items-center justify-center gap-2 group"
                    >
                      <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-brand-primary" />
                      Standard Mode
                    </button>
                    <button
                      onClick={() => { setIsFlashMode(true); setIsAutoPilot(true); processNextInQueue(); }}
                      className="py-4 bg-white border-2 border-brand-primary/20 text-brand-primary rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-brand-light transition-all flex flex-col items-center justify-center gap-2 group"
                    >
                      <Send className="w-5 h-5 text-brand-primary animate-pulse" />
                      Flash Mode
                    </button>
                  </div>
                )}
                <button
                  onClick={handleExportForBulk}
                  className="w-full py-2.5 bg-white text-blue-600 border border-blue-200 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  Download File for Extension
                </button>
              </div>

              {!isAutoPilot && (
                <button
                  onClick={() => {
                    setBroadcastQueue([]);
                    setCurrentBroadcastIndex(-1);
                    setIsAutoPilot(false);
                  }}
                  className="w-full py-3 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-red-500 transition-all"
                >
                  Cancel and Close
                </button>
              )}
            </div>

            <div className="text-[9px] text-gray-400 leading-relaxed italic space-y-1 bg-gray-50 p-4 rounded-2xl border">
              <p className="flex gap-2"><b>Tip:</b> If nothing happens, check the <b>top-right</b> of your browser url bar and click <b>"Allow Always Popups"</b>.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvisorDashboard;
