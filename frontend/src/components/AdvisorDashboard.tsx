
import React, { useState, useMemo } from 'react';
import { AppState, Student, Subject, UserRole, MasterAttendanceRecord } from '../types';
import {
  Users, Book, FileText, Settings, Plus, Send,
  Trash2, Download, Search, LayoutDashboard, ChevronRight, MessageCircle,
  Megaphone, Filter, Layers, Hash, PieChart, BarChart3, Beaker, Edit2, Check, X, ClipboardList, UserCheck, FileSpreadsheet, Contact, GraduationCap
} from 'lucide-react';
import { api } from '../api.ts';

interface AdvisorDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
}

const AdvisorDashboard: React.FC<AdvisorDashboardProps> = ({ state, updateState }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'students' | 'subjects' | 'attendance' | 'reports' | 'messaging'>('config');
  const [newStudent, setNewStudent] = useState<Student>({ registerNumber: '', rollNumber: '', name: '', parentWhatsApp: '' });
  const [newSubject, setNewSubject] = useState<Subject>({ id: '', code: '', name: '', semesterId: 1, assignedStaff: '', staffPassword: '' });

  // Filter & Search States
  const [viewSemester, setViewSemester] = useState<number>(1);
  const [viewInternal, setViewInternal] = useState<number>(1);
  const [subjectViewSemester, setSubjectViewSemester] = useState<number | 'all'>('all');
  const [studentSearch, setStudentSearch] = useState('');

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
    const percentage = parseFloat(val) || 0;
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
    }).catch(err => console.error("Failed to save master attendance"));
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
    if (state.students.length === 0) {
      alert("No students registered.");
      return;
    }
    const confirmation = confirm(`BROADCAST ALERT\n\nReporting for: Semester ${viewSemester}, Internal ${viewInternal}\n\nProceed?`);
    if (!confirmation) return;
    state.students.forEach((student, index) => {
      setTimeout(() => {
        const message = generateMessage(student, viewSemester, viewInternal);
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/${student.parentWhatsApp}?text=${encoded}`, '_blank');
      }, index * 1200);
    });
  };

  const generateMessage = (student: Student, semesterId: number, internalId: number) => {
    const report = getDetailedReportForInternal(student.registerNumber, semesterId, internalId);
    const subjectList = report.subjectBreakdown.map(item => `*${item.name}*: ${item.mark}`).join("\n");
    return `*Academic Report - Sem ${semesterId} Int ${internalId}*\n\n*Name*: ${student.name}\n*Reg No*: ${student.registerNumber}\n\n*Marks*:\n${subjectList}\n\n*Total*: ${report.totalMarks}\n*Avg*: ${report.avgMarks.toFixed(2)}\n*Attendance*: ${report.masterAtt}%`;
  };

  const sendWhatsApp = (student: Student) => {
    const message = generateMessage(student, viewSemester, viewInternal);
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${student.parentWhatsApp}?text=${encoded}`, '_blank');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Nav */}
      <aside className="w-full lg:w-64 flex flex-col gap-2">
        <button onClick={() => setActiveTab('config')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'config' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'}`}><Settings className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Configuration</span></button>
        <button onClick={() => setActiveTab('students')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'}`}><Users className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Students</span></button>
        <button onClick={() => setActiveTab('subjects')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'subjects' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'}`}><Book className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Subjects & Staff</span></button>
        <button onClick={() => setActiveTab('attendance')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'attendance' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'}`}><ClipboardList className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Master Attendance</span></button>
        <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'}`}><BarChart3 className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Analysis</span></button>
        <button onClick={() => setActiveTab('messaging')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'messaging' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'}`}><MessageCircle className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-tight">Parent Portal</span></button>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 bg-white rounded-xl shadow-md p-6 border border-gray-100 overflow-x-hidden">

        {/* SHARED FILTER BAR */}
        {(activeTab === 'reports' || activeTab === 'messaging' || activeTab === 'attendance') && (
          <div className="mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-200 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border"><Layers className="w-4 h-4 text-indigo-600" /></div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Semester</label>
                <select value={viewSemester} onChange={(e) => setViewSemester(parseInt(e.target.value))} className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer">
                  {[...Array(state.config.semesters)].map((_, i) => (<option key={i + 1} value={i + 1}>Semester {i + 1}</option>))}
                </select>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border"><Hash className="w-4 h-4 text-indigo-600" /></div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Internal Exam</label>
                <div className="flex bg-white p-1 rounded-lg border">
                  {[...Array(state.config.internalsPerSem)].map((_, i) => (
                    <button key={i + 1} onClick={() => setViewInternal(i + 1)} className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${viewInternal === i + 1 ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Int {i + 1}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-800"><Settings className="w-6 h-6" /> Academic Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100"><p className="text-xs text-indigo-600 font-black uppercase tracking-widest mb-2">Duration</p><div className="text-3xl font-black text-indigo-900">{state.config.years} Years</div></div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100"><p className="text-xs text-blue-600 font-black uppercase tracking-widest mb-2">Structure</p><div className="text-3xl font-black text-blue-900">{state.config.semesters} Semesters</div></div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100"><p className="text-xs text-purple-600 font-black uppercase tracking-widest mb-2">Assessment</p><div className="text-3xl font-black text-purple-900">{state.config.internalsPerSem} per Sem</div></div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-indigo-800 flex items-center gap-2"><Users className="w-6 h-6" /> Student Management</h3>
              <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">{state.students.length} Enrolled</span>
            </div>

            {/* Addition Form */}
            {!editingStudentReg && (
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 animate-in fade-in zoom-in duration-300">
                <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">Register New Student</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input placeholder="Reg Number" className="px-3 py-2 border rounded-xl text-sm outline-indigo-500 font-mono bg-white" value={newStudent.registerNumber} onChange={e => setNewStudent({ ...newStudent, registerNumber: e.target.value })} />
                  <input placeholder="Roll Number" className="px-3 py-2 border rounded-xl text-sm outline-indigo-500 bg-white" value={newStudent.rollNumber} onChange={e => setNewStudent({ ...newStudent, rollNumber: e.target.value })} />
                  <input placeholder="Full Name" className="px-3 py-2 border rounded-xl text-sm outline-indigo-500 bg-white" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} />
                  <input placeholder="WhatsApp (91...)" className="px-3 py-2 border rounded-xl text-sm outline-indigo-500 bg-white" value={newStudent.parentWhatsApp} onChange={e => setNewStudent({ ...newStudent, parentWhatsApp: e.target.value })} />
                  <button onClick={addStudent} className="lg:col-span-4 bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest shadow-lg transition-all active:scale-[0.98]"><Plus className="w-5 h-5" /> Register Student</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search by Reg No or Name..." className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} /></div>
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
                        <tr key={s.registerNumber} className={`hover:bg-indigo-50/30 transition-colors ${isEditing ? 'bg-indigo-50' : ''}`}>
                          <td className="px-6 py-4 font-mono font-bold text-indigo-600">
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
                                  <button onClick={() => startEditingStudent(s)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit Student"><Edit2 className="w-4 h-4" /></button>
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
            <h3 className="text-xl font-bold text-indigo-800 flex items-center gap-2"><Book className="w-6 h-6" /> Faculty Assignments</h3>

            {/* Addition Form */}
            {!editingSubjectId && (
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in duration-300">
                <div className="space-y-1"><label className="text-[10px] font-black text-indigo-400 uppercase">Internal ID</label><input placeholder="Unique ID (e.g. SUB001)" className="w-full px-3 py-2 border rounded-md text-sm outline-indigo-500 bg-white" value={newSubject.id} onChange={e => setNewSubject({ ...newSubject, id: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-indigo-400 uppercase">Subject Code</label><input placeholder="Code (e.g. CS101)" className="w-full px-3 py-2 border rounded-md text-sm outline-indigo-500 bg-white" value={newSubject.code} onChange={e => setNewSubject({ ...newSubject, code: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-indigo-400 uppercase">Subject Name</label><input placeholder="Full Name" className="w-full px-3 py-2 border rounded-md text-sm outline-indigo-500 bg-white" value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} /></div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase">Semester</label>
                  <select className="w-full px-3 py-2 border rounded-md text-sm outline-indigo-500 bg-white" value={newSubject.semesterId} onChange={e => setNewSubject({ ...newSubject, semesterId: parseInt(e.target.value) })}>
                    {[...Array(state.config.semesters)].map((_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-black text-indigo-400 uppercase">Staff Name</label><input placeholder="Name" className="w-full px-3 py-2 border rounded-md text-sm outline-indigo-500 bg-white" value={newSubject.assignedStaff} onChange={e => setNewSubject({ ...newSubject, assignedStaff: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-indigo-400 uppercase">Login Password</label><input placeholder="Password" type="password" className="w-full px-3 py-2 border rounded-md text-sm outline-indigo-500 bg-white" value={newSubject.staffPassword} onChange={e => setNewSubject({ ...newSubject, staffPassword: e.target.value })} /></div>
                <button onClick={addSubject} className="lg:col-span-3 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95"><Plus className="w-4 h-4" /> Add Subject Mapping</button>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border">
                <Contact className="w-5 h-5 text-indigo-600 ml-2" />
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
                    <div key={sub.id} className={`p-5 border rounded-2xl group transition-all shadow-sm bg-white ${isEditing ? 'border-indigo-500 ring-2 ring-indigo-50' : 'hover:border-indigo-200'}`}>
                      {isEditing ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-indigo-600 uppercase">Edit Subject Mapping</span>
                            <div className="flex gap-2">
                              <button onClick={saveEditedSubject} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600" title="Save Changes"><Check className="w-4 h-4" /></button>
                              <button onClick={cancelEditingSubject} className="p-2 bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200" title="Cancel"><X className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2"><input placeholder="Subject Name" className="w-full text-sm font-bold border rounded p-2" value={editSubjectData?.name} onChange={e => setEditSubjectData({ ...editSubjectData!, name: e.target.value })} /></div>
                            <input placeholder="Code" className="w-full text-xs font-mono border rounded p-2" value={editSubjectData?.code} onChange={e => setEditSubjectData({ ...editSubjectData!, code: e.target.value })} />
                            <input placeholder="Staff" className="w-full text-xs border rounded p-2" value={editSubjectData?.assignedStaff} onChange={e => setEditSubjectData({ ...editSubjectData!, assignedStaff: e.target.value })} />
                            <input placeholder="Password" type="password" className="w-full text-xs border rounded p-2 col-span-2" value={editSubjectData?.staffPassword} onChange={e => setEditSubjectData({ ...editSubjectData!, staffPassword: e.target.value })} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-4">
                            <div><div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded uppercase">Sem {sub.semesterId}</span><h4 className="font-bold text-gray-900 leading-tight">{sub.name}</h4></div><p className="text-xs text-gray-400 font-mono tracking-tighter uppercase">{sub.code}</p></div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => startEditingSubject(sub)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => removeSubject(sub.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div>
                          </div>
                          <div className="text-xs font-bold text-indigo-700 bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                            <span className="flex items-center gap-2"><UserCheck className="w-3 h-3 text-indigo-400" /> Faculty: {sub.assignedStaff}</span>
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
            <h3 className="text-xl font-bold text-indigo-800 flex items-center gap-2"><ClipboardList className="w-6 h-6" /> Master Attendance Entry</h3>
            <p className="text-sm text-gray-500 bg-blue-50 p-4 rounded-xl border border-blue-100">Advisor marks the <b>overall</b> attendance for this internal assessment period. This percentage will be visible to parents.</p>
            <div className="overflow-x-auto border rounded-2xl shadow-sm bg-white">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">Reg No</th><th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">Name</th><th className="px-6 py-4 font-black text-[10px] uppercase text-gray-400">Total Att %</th><th className="px-6 py-4 text-right font-black text-[10px] uppercase text-gray-400">Sync Status</th></tr></thead>
                <tbody className="divide-y">
                  {state.students.map(s => {
                    const val = getMasterAttendance(s.registerNumber);
                    return (<tr key={s.registerNumber} className="hover:bg-gray-50 transition-colors"><td className="px-6 py-4 font-mono font-bold text-xs">{s.registerNumber}</td><td className="px-6 py-4 font-bold text-gray-900">{s.name}</td><td className="px-6 py-4"><input type="number" max={100} min={0} className="w-24 px-3 py-1.5 border rounded-lg font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none" value={val} onChange={(e) => handleMasterAttendanceChange(s.registerNumber, e.target.value)} placeholder="0-100" /></td><td className="px-6 py-4 text-right">{val !== '' ? <span className="text-green-500 bg-green-50 px-2 py-1 rounded-full text-[10px] font-black uppercase">Recorded</span> : '--'}</td></tr>)
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-xl font-bold text-indigo-800 flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Semester Performance Ledger</h3>
              <div className="flex gap-2">
                <button onClick={handleExportCSV} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95"><FileSpreadsheet className="w-4 h-4" /> Export CSV Report</button>
              </div>
            </div>

            {/* Class Stats Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-3xl border border-indigo-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600"><Users className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Enrolled</p><p className="text-3xl font-black text-indigo-900">{classStats.studentCount}</p></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-3xl border border-blue-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600"><GraduationCap className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Class Avg Mark</p><p className="text-3xl font-black text-blue-900">{classStats.avgMark.toFixed(2)}</p></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-3xl border border-purple-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-purple-600"><PieChart className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Class Avg Att%</p><p className={`text-3xl font-black ${classStats.avgAtt < 75 ? 'text-red-600' : 'text-purple-900'}`}>{classStats.avgAtt.toFixed(2)}%</p></div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-3xl shadow-xl bg-white scrollbar-thin scrollbar-thumb-indigo-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-indigo-900 text-white border-b-2 border-indigo-700">
                  <tr>
                    <th className="px-6 py-5 font-black uppercase tracking-widest sticky left-0 bg-indigo-900 shadow-[2px_0_5px_rgba(0,0,0,0.1)] z-10">Reg No</th>
                    <th className="px-6 py-5 font-black uppercase tracking-widest">Roll No</th>
                    <th className="px-6 py-5 font-black uppercase tracking-widest">Name</th>
                    {state.subjects.filter(s => s.semesterId === viewSemester).map(sub => (
                      <React.Fragment key={sub.id}>
                        <th className="px-6 py-5 font-black uppercase tracking-widest text-center min-w-[120px] bg-indigo-800/30 whitespace-nowrap">{sub.name} (M)</th>
                        {isEvenInternal && <th className="px-6 py-5 font-black uppercase tracking-widest text-center min-w-[120px] bg-emerald-800/20 text-emerald-100 whitespace-nowrap">{sub.name} (L)</th>}
                      </React.Fragment>
                    ))}
                    <th className="px-6 py-5 font-black uppercase tracking-widest text-center bg-indigo-950">Total</th>
                    <th className="px-6 py-5 font-black uppercase tracking-widest text-center bg-indigo-950">Avg</th>
                    <th className="px-6 py-5 font-black uppercase tracking-widest text-center bg-indigo-950">Att %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {state.students.map((s, idx) => {
                    const report = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal);
                    return (
                      <tr key={s.registerNumber} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50/20'} hover:bg-indigo-100/50 transition-colors`}>
                        <td className="px-6 py-4 font-mono font-black text-indigo-700 border-r sticky left-0 bg-inherit shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10">{s.registerNumber}</td>
                        <td className="px-6 py-4 text-gray-400 font-medium">{s.rollNumber}</td>
                        <td className="px-6 py-4 font-black text-gray-900 truncate max-w-[150px]">{s.name}</td>
                        {report.subjectBreakdown.map((item, bidx) => (
                          <React.Fragment key={bidx}>
                            <td className="px-6 py-4 text-center font-bold text-gray-600">{item.mark}</td>
                            {isEvenInternal && <td className="px-6 py-4 text-center font-bold text-emerald-600 bg-emerald-50/20">{item.labMark}</td>}
                          </React.Fragment>
                        ))}
                        <td className="px-6 py-4 text-center font-black text-indigo-900 bg-indigo-50/50">{report.totalMarks}</td>
                        <td className="px-6 py-4 text-center font-black text-indigo-900 bg-indigo-50/50">{report.avgMarks.toFixed(1)}</td>
                        <td className={`px-6 py-4 text-center font-black bg-indigo-50/50 ${report.masterAtt < 75 ? 'text-red-500' : 'text-green-600'}`}>{report.masterAtt}%</td>
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
            <div className="flex justify-between items-center"><h3 className="text-xl font-bold text-indigo-800 flex items-center gap-2"><MessageCircle className="w-6 h-6" /> Parent Portal Communication</h3><button onClick={broadcastToAll} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"><Megaphone className="w-4 h-4 mr-2 inline" /> Broadcast All</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.students.map(s => {
                const stats = getDetailedReportForInternal(s.registerNumber, viewSemester, viewInternal);
                return (
                  <div key={s.registerNumber} className="p-5 border rounded-2xl flex flex-col justify-between hover:shadow-xl transition-all bg-white border-gray-100 hover:border-indigo-200">
                    <div>
                      <h4 className="font-black text-gray-900 mb-1">{s.name}</h4>
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-4">{s.registerNumber}</p>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-2.5 bg-gray-50 rounded-xl text-center"><p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Avg Score</p><p className="font-black text-indigo-600">{stats.avgMarks.toFixed(1)}</p></div>
                        <div className="p-2.5 bg-gray-50 rounded-xl text-center"><p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Attendance</p><p className={`font-black ${stats.masterAtt < 75 ? 'text-red-500' : 'text-green-600'}`}>{stats.masterAtt}%</p></div>
                      </div>
                    </div>
                    <button onClick={() => sendWhatsApp(s)} className="w-full py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-bold uppercase text-[10px] tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4" /> Send Int {viewInternal} Report</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvisorDashboard;
