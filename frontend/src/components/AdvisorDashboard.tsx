
import React, { useState, useMemo } from 'react';
import { AppState, Student, Subject, UserRole, MasterAttendanceRecord } from '../types';
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Legend as ReLegend, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import {
  Users, Book, FileText, Settings, Plus, Send,
  Trash2, Download, Search, LayoutDashboard, ChevronRight, MessageCircle,
  Megaphone, Filter, Layers, Hash, PieChart, BarChart3, Beaker, Edit2, Check, X, ClipboardList, UserCheck, FileSpreadsheet, Contact, GraduationCap, Upload, FileCheck, Eye
} from 'lucide-react';
import { api } from '../api.ts';

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
  const [activeTab, setActiveTab] = useState<'config' | 'students' | 'subjects' | 'attendance' | 'reports' | 'messaging' | 'grades'>('config');
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

  const getSubjectName = (code: string) => {
    return state.subjects.find(s => s.code === code)?.name || code;
  };

  // Editing States
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectData, setEditSubjectData] = useState<Subject | null>(null);
  const [editingStudentReg, setEditingStudentReg] = useState<string | null>(null);
  const [editStudentData, setEditStudentData] = useState<Student | null>(null);

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
  const handleMasterAttendanceChange = (regNo: string, val: string) => {
    let percentage = parseFloat(val) || 0;

    // Clamp percentage between 0 and 100
    if (percentage < 0) {
      percentage = 0;
      alert("Attendance percentage cannot be negative. Setting to 0.");
    } else if (percentage > 100) {
      percentage = 100;
      alert("Attendance percentage cannot exceed 100. Setting to 100.");
    }

    const existing = state.masterAttendance.filter(ma =>
      !(ma.studentRegNo === regNo && ma.semesterId === viewSemester && ma.internalId === viewInternal)
    );
    const newRecord: MasterAttendanceRecord = {
      studentRegNo: regNo,
      semesterId: viewSemester,
      internalId: viewInternal,
      percentage: percentage
    };
    api.saveMasterAttendance(newRecord).then(saved => {
      updateState({ masterAttendance: [...existing, saved] });
    }).catch(err => {
      console.error("Failed to save master attendance");
      alert("Failed to save attendance. Please ensure the value is between 0 and 100.");
    });
  };

  const getMasterAttendance = (regNo: string) => {
    return state.masterAttendance.find(ma =>
      ma.studentRegNo === regNo && ma.semesterId === viewSemester && ma.internalId === viewInternal
    )?.percentage ?? '';
  };

  // Detailed Analysis Reporting
  const getDetailedReportForInternal = (regNo: string, semesterId: number, internalId: number) => {
    const relevantSubjects = state.subjects.filter(s => s.semesterId === semesterId);
    const marks = state.marks.filter(m => m.studentRegNo === regNo && m.semesterId === semesterId && m.internalId === internalId);
    const labMarks = state.labMarks.filter(l => l.studentRegNo === regNo && l.semesterId === semesterId && l.internalId === internalId);
    const masterAtt = state.masterAttendance.find(ma => ma.studentRegNo === regNo && ma.semesterId === semesterId && ma.internalId === internalId)?.percentage ?? 0;

    const totalMarks = marks.reduce((acc, curr) => acc + curr.marks, 0);
    const avgMarks = marks.length > 0 ? totalMarks / marks.length : 0;

    const subjectBreakdown = relevantSubjects.map(sub => ({
      name: sub.name,
      code: sub.code,
      mark: marks.find(m => m.subjectId === sub.id)?.marks ?? '-',
      labMark: labMarks.find(l => l.subjectId === sub.id)?.marks ?? '-',
    }));

    return { totalMarks, avgMarks, masterAtt, subjectBreakdown };
  };

  // Class Statistics Calculations
  const classStats = useMemo(() => {
    if (state.students.length === 0) return { avgMark: 0, avgAtt: 0, studentCount: 0 };

    let totalAvgMark = 0;
    let totalAvgAtt = 0;

    state.students.forEach(s => {
      const report = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal);
      totalAvgMark += report.avgMarks;
      totalAvgAtt += report.masterAtt;
    });

    return {
      avgMark: totalAvgMark / state.students.length,
      avgAtt: totalAvgAtt / state.students.length,
      studentCount: state.students.length
    };
  }, [state.students, state.marks, state.masterAttendance, viewSemester, viewInternal]);

  // CSV Export Logic
  const handleExportCSV = () => {
    const relevantSubjects = state.subjects.filter(s => s.semesterId === viewSemester);
    const headers = ["Register Number", "Roll Number", "Name"];

    relevantSubjects.forEach(sub => {
      headers.push(`${sub.name} (Marks)`);
      if (isEvenInternal) headers.push(`${sub.name} (Lab)`);
    });

    headers.push("Total Marks", "Average Marks", "Attendance (%)");

    const rows = state.students.map(s => {
      const report = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal);
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
  const broadcastToAll = () => {
    const lockKey = `sem-${viewSemester}-int-${viewInternal}`;
    if (broadcastLocked[lockKey]) {
      alert(`Broadcast for Semester ${viewSemester} Internal ${viewInternal} is already sent and locked.`);
      return;
    }

    if (state.students.length === 0) {
      alert("No students registered.");
      return;
    }

    // Count how many parents have WhatsApp numbers
    const parentsWithWhatsApp = state.students.filter(s => s.parentWhatsApp && s.parentWhatsApp.trim() !== '').length;

    if (parentsWithWhatsApp === 0) {
      alert("No parent WhatsApp numbers are registered. Please add parent contact numbers before broadcasting.");
      return;
    }

    // Simplified confirmation
    if (!confirm(`Are you sure you want to send reports to all ${parentsWithWhatsApp} parents? This will lock the broadcast for this session.`)) return;

    // Lock broadcast
    setBroadcastLocked(prev => ({ ...prev, [lockKey]: true }));

    state.students.forEach((student, index) => {
      if (student.parentWhatsApp && student.parentWhatsApp.trim() !== '') {
        setTimeout(() => {
          const message = generateMessage(student, viewSemester, viewInternal);
          const encoded = encodeURIComponent(message);
          window.open(`https://wa.me/${student.parentWhatsApp}?text=${encoded}`, '_blank');
        }, index * 1200);
      }
    });
  };

  const broadcastSemesterSummary = () => {
    const lockKey = `sem-${viewSemester}-summary`;
    if (broadcastLocked[lockKey]) {
      alert(`Semester ${viewSemester} Summary has already been sent.`);
      return;
    }

    const parentsWithWhatsApp = state.students.filter(s => s.parentWhatsApp && s.parentWhatsApp.trim() !== '').length;
    if (parentsWithWhatsApp === 0) {
      alert("No parent contact numbers found.");
      return;
    }

    if (!confirm(`⚠️ CONSOLIDATED BROADCAST\n\nThis will send a full Semester ${viewSemester} report (Int 1, Int 2, Attendance & Univ. Grades) to ${parentsWithWhatsApp} parents.\n\nProceed?`)) return;

    setBroadcastLocked(prev => ({ ...prev, [lockKey]: true }));

    state.students.forEach((student, index) => {
      if (student.parentWhatsApp && student.parentWhatsApp.trim() !== '') {
        setTimeout(() => {
          const message = generateSemesterSummaryMessage(student, viewSemester);
          const encoded = encodeURIComponent(message);
          window.open(`https://wa.me/${student.parentWhatsApp}?text=${encoded}`, '_blank');
        }, index * 1500); // Slightly longer delay for heavy messaging
      }
    });
  };

  const generateSemesterSummaryMessage = (student: Student, semesterId: number) => {
    const int1 = getDetailedReportForInternal(student.registerNumber, semesterId, 1);
    const int2 = getDetailedReportForInternal(student.registerNumber, semesterId, 2);

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
    const report = getDetailedReportForInternal(student.registerNumber, semesterId, internalId);
    const prevInternal = internalId > 1 ? getDetailedReportForInternal(student.registerNumber, semesterId, internalId - 1) : null;

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
    window.open(`https://wa.me/${student.parentWhatsApp}?text=${encoded}`, '_blank');
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
        <button onClick={() => setActiveTab('subjects')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'subjects' ? 'bg-brand-primary text-white shadow-lg' : 'bg-white hover:bg-brand-light'}`}><Book className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Subjects & Staff</span></button>
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
                <select value={viewSemester} onChange={(e) => setViewSemester(parseInt(e.target.value))} className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer">
                  {[...Array(state.config.semesters)].map((_, i) => (<option key={i + 1} value={i + 1}>Semester {i + 1}</option>))}
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
                  <input placeholder="WhatsApp (91...)" className="px-3 py-2 border rounded-xl text-sm outline-brand-primary bg-white" value={newStudent.parentWhatsApp} onChange={e => setNewStudent({ ...newStudent, parentWhatsApp: e.target.value })} />
                  <button onClick={addStudent} className="lg:col-span-4 bg-brand-primary hover:bg-brand-secondary text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest shadow-lg transition-all active:scale-[0.98]"><Plus className="w-5 h-5" /> Register Student</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search by Reg No or Name..." className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-brand-light outline-none" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} /></div>
              <div className="overflow-x-auto border rounded-2xl shadow-sm bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">Reg No</th>
                      <th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">Roll No</th>
                      <th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">Name</th>
                      <th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">WhatsApp</th>
                      <th className="px-6 py-4 text-right font-black text-[10px] uppercase text-gray-400">Actions</th>
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

        {activeTab === 'subjects' && (
          <div className="space-y-8">
            <h3 className="text-xl font-bold text-gray-900 leading-tight flex items-center gap-2"><Book className="w-6 h-6" /> Faculty Assignments</h3>

            {/* Addition Form */}
            {!editingSubjectId && (
              <div className="bg-brand-light p-6 rounded-2xl border border-brand-primary/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in duration-300">
                <div className="space-y-1"><label className="text-[10px] font-black text-brand-primary/50 uppercase">Internal ID</label><input placeholder="Unique ID (e.g. SUB001)" className="w-full px-3 py-2 border rounded-md text-sm outline-brand-primary bg-white" value={newSubject.id} onChange={e => setNewSubject({ ...newSubject, id: e.target.value })} /></div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-brand-primary/50 uppercase">Subject Selection</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md text-sm outline-brand-primary bg-white"
                    value={`${newSubject.code}-${newSubject.name}`}
                    onChange={e => {
                      const [code, ...nameParts] = e.target.value.split('-');
                      setNewSubject({ ...newSubject, code: code.trim(), name: nameParts.join('-').trim() });
                    }}
                  >
                    <option value="">Select Subject</option>
                    <option value="cs3451-os">CS3451 - OS</option>
                    <option value="cs3452-toc">CS3452 - TOC</option>
                    <option value="ge3451-ess">GE3451 - ESS</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-brand-primary/50 uppercase">Semester</label>
                  <select className="w-full px-3 py-2 border rounded-md text-sm outline-brand-primary bg-white" value={newSubject.semesterId} onChange={e => setNewSubject({ ...newSubject, semesterId: parseInt(e.target.value) })}>
                    {[...Array(state.config.semesters)].map((_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-brand-primary/50 uppercase">Staff Name</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md text-sm outline-brand-primary bg-white"
                    value={newSubject.assignedStaff}
                    onChange={e => setNewSubject({ ...newSubject, assignedStaff: e.target.value })}
                  >
                    <option value="">Select Staff</option>
                    <option value="vasuki">Vasuki</option>
                    <option value="kalaivani s">Kalaivani S</option>
                    <option value="gv">GV</option>
                    <option value="rss">RSS</option>
                    <option value="rk">RK</option>
                    <option value="viji">Viji</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-black text-brand-primary/50 uppercase">Login Password</label><input placeholder="Password" type="password" className="w-full px-3 py-2 border rounded-md text-sm outline-brand-primary bg-white" value={newSubject.staffPassword} onChange={e => setNewSubject({ ...newSubject, staffPassword: e.target.value })} /></div>
                <button onClick={addSubject} className="lg:col-span-3 bg-brand-primary text-white py-2.5 rounded-xl hover:bg-brand-secondary flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95"><Plus className="w-4 h-4" /> Add Subject Mapping</button>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border">
                <Contact className="w-5 h-5 text-brand-primary ml-2" />
                <span className="text-sm font-black text-gray-500 uppercase">Filter View by Semester:</span>
                <select value={subjectViewSemester} onChange={e => setSubjectViewSemester(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className="bg-white border rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm outline-none">
                  <option value="all">All Semesters</option>
                  {[...Array(state.config.semesters)].map((_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSubjects.map(sub => {
                  const isEditing = editingSubjectId === sub.id;
                  return (
                    <div key={sub.id} className={`p-5 border rounded-2xl group transition-all shadow-sm bg-white ${isEditing ? 'border-brand-primary ring-2 ring-brand-light' : 'hover:border-brand-primary/20'}`}>
                      {isEditing ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-brand-primary uppercase">Edit Subject Mapping</span>
                            <div className="flex gap-2">
                              <button onClick={saveEditedSubject} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600" title="Save Changes"><Check className="w-4 h-4" /></button>
                              <button onClick={cancelEditingSubject} className="p-2 bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200" title="Cancel"><X className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <select
                                className="w-full text-sm font-bold border rounded p-2"
                                value={`${editSubjectData?.code}-${editSubjectData?.name}`}
                                onChange={e => {
                                  const [code, ...nameParts] = e.target.value.split('-');
                                  setEditSubjectData({ ...editSubjectData!, code: code.trim(), name: nameParts.join('-').trim() });
                                }}
                              >
                                <option value="cs3451-os">CS3451 - OS</option>
                                <option value="cs3452-toc">CS3452 - TOC</option>
                                <option value="ge3451-ess">GE3451 - ESS</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <select
                                className="w-full text-xs border rounded p-2"
                                value={editSubjectData?.assignedStaff}
                                onChange={e => setEditSubjectData({ ...editSubjectData!, assignedStaff: e.target.value })}
                              >
                                <option value="vasuki">Vasuki</option>
                                <option value="kalaivani s">Kalaivani S</option>
                                <option value="gv">GV</option>
                                <option value="rss">RSS</option>
                                <option value="rk">RK</option>
                                <option value="viji">Viji</option>
                              </select>
                            </div>
                            <input placeholder="Password" type="password" className="w-full text-xs border rounded p-2 col-span-2" value={editSubjectData?.staffPassword} onChange={e => setEditSubjectData({ ...editSubjectData!, staffPassword: e.target.value })} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-4">
                            <div><div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-black px-2 py-0.5 bg-brand-light text-brand-primary rounded uppercase">Sem {sub.semesterId}</span><h4 className="font-bold text-gray-900 leading-tight">{sub.name}</h4></div><p className="text-xs text-gray-400 font-mono tracking-tighter uppercase">{sub.code}</p></div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => startEditingSubject(sub)} className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => removeSubject(sub.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div>
                          </div>
                          <div className="text-xs font-bold text-brand-primary bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                            <span className="flex items-center gap-2"><UserCheck className="w-3 h-3 text-brand-primary/50" /> Faculty: {sub.assignedStaff}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 leading-tight flex items-center gap-2"><ClipboardList className="w-6 h-6" /> Master Attendance Entry</h3>
            <p className="text-sm text-brand-primary bg-brand-light p-4 rounded-xl border border-brand-primary/10">Advisor marks the <b>overall</b> attendance for this internal assessment period. This percentage will be visible to parents.</p>
            <div className="overflow-x-auto border rounded-2xl shadow-sm bg-white">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">Reg No</th><th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">Name</th><th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">Total Att %</th><th className="px-6 py-4 text-right font-black text-[10px] uppercase text-gray-400">Sync Status</th></tr></thead>
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

            {/* Class Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Score Distribution (Internal {viewInternal})</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={state.students.map(s => {
                      const rep = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal);
                      return { name: s.name.split(' ')[0], Score: rep.avgMarks };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="Score" fill="#046e84" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Attendance Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={state.students.map(s => {
                      const rep = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal);
                      return { name: s.name.split(' ')[0], Attendance: rep.masterAtt };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="Attendance" fill="#fbbf24" radius={[6, 6, 0, 0]} barSize={20} />
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

            <div className="overflow-x-auto border rounded-3xl shadow-xl bg-white scrollbar-thin scrollbar-thumb-brand-light">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-accent text-white border-b-2 border-brand-primary">
                  <tr>
                    <th className="px-6 py-5 font-black uppercase tracking-widest sticky left-0 bg-brand-accent shadow-[2px_0_5px_rgba(0,0,0,0.1)] z-10">Reg No</th>
                    <th className="px-6 py-5 font-black uppercase tracking-widest">Roll No</th>
                    <th className="px-6 py-5 font-black uppercase tracking-widest">Name</th>
                    {state.subjects.filter(s => s.semesterId === viewSemester).map(sub => (
                      <React.Fragment key={sub.id}>
                        <th className="px-6 py-5 font-black uppercase tracking-widest text-center min-w-[120px] bg-white/10 whitespace-nowrap">{sub.name} (M)</th>
                        {isEvenInternal && <th className="px-6 py-5 font-black uppercase tracking-widest text-center min-w-[120px] bg-emerald-800/20 text-emerald-100 whitespace-nowrap">{sub.name} (L)</th>}
                      </React.Fragment>
                    ))}
                    <th className="px-6 py-5 font-black uppercase tracking-widest text-center bg-brand-deep">Total</th>
                    <th className="px-6 py-5 font-black uppercase tracking-widest text-center bg-brand-deep">Avg</th>
                    <th className="px-6 py-5 font-black uppercase tracking-widest text-center bg-brand-deep">Att %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {state.students.map((s, idx) => {
                    const report = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal);
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
                  onClick={broadcastSemesterSummary}
                  disabled={broadcastLocked[`sem-${viewSemester}-summary`]}
                  className={`${broadcastLocked[`sem-${viewSemester}-summary`] ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-deep hover:bg-brand-primary'} text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2`}
                >
                  <FileText className="w-4 h-4" />
                  {broadcastLocked[`sem-${viewSemester}-summary`] ? 'Summary Sent' : 'Broadcast Semester Summary'}
                </button>
                <button
                  onClick={broadcastToAll}
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
                const stats = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal);
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
              <div className="flex flex-wrap gap-6 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-black text-brand-primary uppercase mb-2">Select Semester</label>
                  <select
                    value={uploadSem}
                    onChange={(e) => setUploadSem(parseInt(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    {[...Array(state.config.semesters)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[300px]">
                  <label className="block text-[10px] font-black text-brand-primary uppercase mb-2">Upload Grade Sheet (PDF)</label>
                  <label
                    className={`flex items-center justify-center gap-3 w-full border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all ${uploadFile ? 'border-brand-primary bg-white text-brand-primary' : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-brand-primary/40'}`}
                  >
                    <Upload className="w-5 h-5" />
                    <span className="font-bold text-sm truncate">{uploadFile ? uploadFile.name : 'Click to select PDF'}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <button
                  onClick={handleGradeUpload}
                  disabled={uploadLoading || !uploadFile}
                  className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2 ${uploadLoading || !uploadFile ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand-primary text-white hover:bg-brand-secondary'}`}
                >
                  {uploadLoading ? 'Processing...' : 'Auto-Map Grades'}
                  <FileCheck className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-brand-primary/10">
                <div className="p-2 bg-brand-light rounded-lg"><Settings className="w-4 h-4 text-brand-primary" /></div>
                <p className="text-xs text-brand-accent italic leading-relaxed">
                  Our AI scanner automatically maps grades to students based on Register Numbers and Subject Codes found in the document. <b>Zero manual mapping required.</b>
                </p>
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
              <div className="overflow-x-auto border rounded-2xl shadow-sm bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">Student Reg No</th>
                      <th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400 border-x text-center">Semester</th>
                      {gradeViewSubject === 'all' ? (
                        <th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">Grades Summary</th>
                      ) : (
                        <th className="px-6 py-4 font-black text-[10px] uppercase text-brand-primary bg-brand-light/50 border-x text-center">{getSubjectName(gradeViewSubject)} ({gradeViewSubject})</th>
                      )}
                      <th className="px-6 py-4 text-right font-black text-[10px] uppercase text-gray-400">Status</th>
                      <th className="px-6 py-4 text-right font-black text-[10px] uppercase text-gray-400">Display</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {state.semesterGrades?.length > 0 ? (
                      state.semesterGrades
                        .filter(g => g.semesterId === uploadSem)
                        .map(g => (
                          <tr key={g.id} className="hover:bg-brand-light/30 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-brand-primary border-r">{g.studentRegNo}</td>
                            <td className="px-6 py-4 font-bold text-gray-600 border-r text-center">Sem {g.semesterId}</td>
                            <td className="px-6 py-4">
                              {gradeViewSubject === 'all' ? (
                                <div className="flex flex-wrap gap-2 text-center">
                                  {Object.entries(JSON.parse(g.results)).map(([code, grade]) => (
                                    <span key={code} className={`px-2 py-0.5 rounded text-[10px] font-bold ${grade === 'U' || grade === 'UA' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-gray-100'}`} title={getSubjectName(code)}>
                                      {code}: {grade as string}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center">
                                  {(() => {
                                    const res = JSON.parse(g.results);
                                    const grade = res[gradeViewSubject];
                                    return grade ? (
                                      <span className={`px-4 py-1.5 rounded-lg text-lg font-black ${grade === 'U' || grade === 'UA' ? 'text-red-500 bg-red-50 border-2 border-red-200 animate-pulse' : 'text-brand-primary'}`}>
                                        {grade}
                                      </span>
                                    ) : (
                                      <span className="text-gray-300 font-bold">N/A</span>
                                    );
                                  })()}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-green-500 bg-green-50 px-2 py-1 rounded-full text-[10px] font-black uppercase">Mapped</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setViewingGradeDetails(g)}
                                className="text-brand-primary hover:text-brand-secondary transition-colors"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr><td colSpan={4} className="py-12 text-center text-gray-400 italic">No grade data processed for Semester {uploadSem}.</td></tr>
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
                    {Object.entries(JSON.parse(viewingGradeDetails.results)).map(([code, grade]) => (
                      <div key={code} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div>
                          <p className="font-black text-gray-900 leading-tight">{getSubjectName(code)}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase font-mono">{code}</p>
                        </div>
                        <div className={`text-2xl font-black ${grade === 'U' || grade === 'UA' ? 'text-red-500' : 'text-brand-primary'}`}>{grade as string}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setViewingGradeDetails(null)} className="w-full mt-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl">Close Profile</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};

export default AdvisorDashboard;
