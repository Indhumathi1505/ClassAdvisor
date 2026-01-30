
import React, { useState, useMemo } from 'react';
import { AppState, MarkRecord, AttendanceRecord, Subject, LabMarkRecord } from '../types';
import { BookOpen, Upload, ClipboardCheck, Users, ChevronRight, CheckCircle2, Beaker, FileCheck, Search, BarChart3, PieChart, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';
import { api } from '../api.ts';
import * as XLSX from 'xlsx';

interface StaffDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  staffName: string;
  loginSubject?: {
    semesterId: number;
    subjectCode: string;
    subjectName: string;
  };
  onLogout: () => void;
}

const COLORS = ['#046e84', '#0694b3', '#08b9e1', '#06cdee', '#00e5ff'];

const GenericInput: React.FC<{ initialValue: number | string, onSave: (val: number) => void, entryType: 'marks' | 'attendance' | 'lab' | 'grades' }> = ({ initialValue, onSave, entryType }) => {
  const [localVal, setLocalVal] = useState(initialValue.toString());

  React.useEffect(() => {
    setLocalVal(initialValue.toString());
  }, [initialValue]);

  const handleBlur = () => {
    if (localVal !== initialValue.toString()) {
      onSave(parseFloat(localVal) || 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(parseFloat(localVal) || 0);
    }
  };

  return (
    <input
      type="number"
      max={100}
      min={0}
      placeholder={entryType === 'marks' ? '0-100' : entryType === 'lab' ? 'Lab 0-100' : '0.00'}
      className={`w-32 px-4 py-2 border rounded-lg focus:ring-2 outline-none text-lg font-bold bg-white ${entryType === 'lab' ? 'focus:ring-emerald-500 border-emerald-100' : 'focus:ring-brand-primary border-gray-200'}`}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};

const StaffDashboard: React.FC<StaffDashboardProps> = ({ state, updateState, staffName, loginSubject }) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedInternalId, setSelectedInternalId] = useState<number>(1);
  const [entryType, setEntryType] = useState<'marks' | 'attendance' | 'lab' | 'grades'>('marks');
  const [successMsg, setSuccessMsg] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [entryMode, setEntryMode] = useState<'manual' | 'excel'>('manual');
  const [isUploading, setIsUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail'>('all');

  // Find subjects assigned to this staff or use virtual subject from login
  const assignedSubjects = useMemo(() => {
    const list = state.subjects.filter(s => s.assignedStaff.toLowerCase() === staffName.toLowerCase());

    // If loginSubject is provided
    if (loginSubject) {
      // 1. Try to find EXACT match in global subjects by Code & Semester (ignoring name if needed)
      // Note: usage of Number() for semesterId allows string/number comparison (e.g. "4" == 4)
      const realSubject = state.subjects.find(s =>
        s.code.toLowerCase().trim() === loginSubject.subjectCode.toLowerCase().trim() &&
        (Number(s.semesterId) === Number(loginSubject.semesterId))
      );

      if (realSubject) {
        // If found, ensure it's in the list (if not already added by filter above)
        if (!list.find(s => s.id === realSubject.id)) {
          list.unshift(realSubject);
        }
      } else {
        // 2. Only if NO real subject exists, create a virtual one (fallback)
        // Warning: Data saved to virtual subject won't appear in Student Dashboard unless subject is created there too.
        if (!list.find(s => s.code.toLowerCase() === loginSubject.subjectCode.toLowerCase() && (Number(s.semesterId) === Number(loginSubject.semesterId)))) {
          console.warn("Using Virtual Subject ID - Marks may not link to student view if subject is not in DB", loginSubject);
          list.push({
            id: `virtual-${loginSubject.subjectCode}-${loginSubject.semesterId}`,
            code: loginSubject.subjectCode,
            name: loginSubject.subjectName,
            semesterId: loginSubject.semesterId,
            assignedStaff: staffName,
            staffPassword: ''
          });
        }
      }
    }
    return list;
  }, [state.subjects, staffName, loginSubject]);

  // Set default selected subject on mount
  React.useEffect(() => {
    if (assignedSubjects.length > 0 && !selectedSubjectId) {
      // Auto-select the first valid subject
      setSelectedSubjectId(assignedSubjects[0].id);
    }
  }, [assignedSubjects, selectedSubjectId]);

  const selectedSubject = useMemo(() => {
    return assignedSubjects.find(s => s.id === selectedSubjectId);
  }, [assignedSubjects, selectedSubjectId]);

  // Only even internals allow lab marks (e.g., Internal 2)
  const isEvenInternal = selectedInternalId % 2 === 0;

  const handleUpdateData = async (regNo: string, value: number, skipStateUpdate = false): Promise<any> => {
    if (!selectedSubject) return null;

    // Validate and clamp value between 0 and 100
    let validatedValue = value;
    if (value < 0) {
      validatedValue = 0;
      if (!skipStateUpdate) alert(`${entryType === 'marks' ? 'Marks' : entryType === 'lab' ? 'Lab marks' : 'Attendance'} cannot be negative. Setting to 0.`);
    } else if (value > 100) {
      validatedValue = 100;
      if (!skipStateUpdate) alert(`${entryType === 'marks' ? 'Marks' : entryType === 'lab' ? 'Lab marks' : 'Attendance'} cannot exceed 100. Setting to 100.`);
    }

    try {
      if (entryType === 'marks') {
        const newMark: MarkRecord = {
          studentRegNo: regNo,
          subjectId: selectedSubjectId,
          semesterId: selectedSubject.semesterId,
          internalId: selectedInternalId,
          marks: validatedValue
        };
        const saved = await api.saveMark(newMark);
        if (!skipStateUpdate) {
          const existing = state.marks.filter(m => !(
            m.studentRegNo === regNo &&
            m.subjectId === selectedSubjectId &&
            Number(m.internalId) === Number(selectedInternalId) &&
            Number(m.semesterId) === Number(selectedSubject.semesterId)
          ));
          updateState({ marks: [...existing, saved] });
        }
        return saved;
      } else if (entryType === 'lab') {
        const newLabMark: LabMarkRecord = {
          studentRegNo: regNo,
          subjectId: selectedSubjectId,
          semesterId: selectedSubject.semesterId,
          internalId: selectedInternalId,
          marks: validatedValue
        };
        const saved = await api.saveLabMark(newLabMark);
        if (!skipStateUpdate) {
          const existing = state.labMarks.filter(l => !(
            l.studentRegNo === regNo &&
            l.subjectId === selectedSubjectId &&
            Number(l.internalId) === Number(selectedInternalId) &&
            Number(l.semesterId) === Number(selectedSubject.semesterId)
          ));
          updateState({ labMarks: [...existing, saved] });
        }
        return saved;
      } else {
        const newAtt: AttendanceRecord = {
          studentRegNo: regNo,
          subjectId: selectedSubjectId,
          semesterId: selectedSubject.semesterId,
          internalId: selectedInternalId,
          percentage: validatedValue
        };
        const saved = await api.saveAttendance(newAtt);
        if (!skipStateUpdate) {
          const existing = state.attendance.filter(a => !(
            a.studentRegNo === regNo &&
            a.subjectId === selectedSubjectId &&
            Number(a.internalId) === Number(selectedInternalId) &&
            Number(a.semesterId) === Number(selectedSubject.semesterId)
          ));
          updateState({ attendance: [...existing, saved] });
        }
        return saved;
      }
    } catch (err) {
      console.error("Failed to save data", err);
      if (!skipStateUpdate) alert(`Failed to save ${entryType}. Please ensure the value is between 0 and 100.`);
      return null;
    }
  };

  const getExistingValue = (regNo: string) => {
    if (entryType === 'marks') {
      return state.marks.find(m => m.studentRegNo === regNo && m.subjectId === selectedSubjectId && Number(m.internalId) === Number(selectedInternalId))?.marks ?? '';
    } else if (entryType === 'lab') {
      return state.labMarks.find(l => l.studentRegNo === regNo && l.subjectId === selectedSubjectId && Number(l.internalId) === Number(selectedInternalId))?.marks ?? '';
    }
    return state.attendance.find(a => a.studentRegNo === regNo && a.subjectId === selectedSubjectId && Number(a.internalId) === Number(selectedInternalId))?.percentage ?? '';
  };

  const getSemesterGradeForSubject = (regNo: string) => {
    if (!selectedSubject) return '-';
    const record = state.semesterGrades?.find(g => g.studentRegNo === regNo && g.semesterId === selectedSubject.semesterId);
    if (!record) return '-';
    try {
      const grades = JSON.parse(record.results);
      return grades[selectedSubject.code] || '-';
    } catch (e) {
      return '-';
    }
  };

  const stats = useMemo(() => {
    if (!selectedSubject) return { pass: 0, fail: 0 };
    const list = state.students.map(s => {
      const val = getExistingValue(s.registerNumber);
      if (val === '') return { isPass: false, recorded: false };

      let isPass = false;
      if (entryType === 'marks' || entryType === 'lab') {
        isPass = (Number(val) || 0) >= 50;
      } else if (entryType === 'attendance') {
        isPass = (Number(val) || 0) >= 75;
      } else if (entryType === 'grades') {
        const grade = getSemesterGradeForSubject(s.registerNumber);
        isPass = grade !== '-' && grade !== 'U' && grade !== 'W' && grade !== 'RA';
      }
      return { isPass, recorded: true };
    });

    return {
      pass: list.filter(l => l.recorded && l.isPass).length,
      fail: list.filter(l => l.recorded && !l.isPass).length
    };
  }, [state, selectedSubject, selectedInternalId, entryType]);

  const filteredStudents = useMemo(() => {
    let list = state.students.filter(s =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.registerNumber.toLowerCase().includes(studentSearch.toLowerCase())
    );

    if (statusFilter !== 'all') {
      list = list.filter(s => {
        const val = getExistingValue(s.registerNumber);
        if (val === '') return false;

        let isPass = false;
        if (entryType === 'marks' || entryType === 'lab') {
          isPass = (Number(val) || 0) >= 50;
        } else if (entryType === 'attendance') {
          isPass = (Number(val) || 0) >= 75;
        } else if (entryType === 'grades') {
          const grade = getSemesterGradeForSubject(s.registerNumber);
          isPass = grade !== '-' && grade !== 'U' && grade !== 'W' && grade !== 'RA';
        }

        return statusFilter === 'pass' ? isPass : !isPass;
      });
    }

    return list;
  }, [state.students, studentSearch, statusFilter, entryType, selectedSubject, selectedInternalId]);

  const onSave = () => {
    setSuccessMsg('All records saved successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-brand-light to-white p-6 rounded-2xl border border-brand-primary/10">
        <div>
          <h2 className="text-2xl font-black text-brand-deep">Faculty Workstation</h2>
          <p className="text-brand-accent flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Welcome, {staffName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {assignedSubjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${selectedSubjectId === sub.id ? 'bg-brand-primary text-white' : 'bg-white text-gray-600 border'}`}
            >
              {sub.code}: {sub.name}
            </button>
          ))}
        </div>
      </header>

      {!selectedSubjectId ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
          <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500">Select a subject from the list above to begin entry</h3>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
            <div className="flex bg-white p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setEntryMode('manual')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${entryMode === 'manual' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setEntryMode('excel')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${entryMode === 'excel' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Excel Upload
              </button>
            </div>
          </div>

          <div className="bg-white p-6 border-b flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-4 items-center">
              <div className="flex bg-white p-1 rounded-lg border">
                <button
                  onClick={() => { setSelectedInternalId(1); if (entryType === 'lab') setEntryType('marks'); }}
                  className={`px-4 py-1.5 rounded text-sm font-semibold ${selectedInternalId === 1 ? 'bg-brand-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Internal 1
                </button>
                <button
                  onClick={() => setSelectedInternalId(2)}
                  className={`px-4 py-1.5 rounded text-sm font-semibold ${selectedInternalId === 2 ? 'bg-brand-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Internal 2
                </button>
              </div>

              <div className="flex bg-white p-1 rounded-lg border">
                <button
                  onClick={() => setEntryType('marks')}
                  className={`px-4 py-1.5 rounded text-sm font-semibold ${entryType === 'marks' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Marks Entry
                </button>
                <button
                  onClick={() => setEntryType('attendance')}
                  className={`px-4 py-1.5 rounded text-sm font-semibold ${entryType === 'attendance' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Attendance %
                </button>
                {isEvenInternal && (
                  <button
                    onClick={() => setEntryType('lab')}
                    className={`px-4 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5 ${entryType === 'lab' ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50'}`}
                  >
                    <Beaker className="w-4 h-4" /> Lab Marks
                  </button>
                )}
                <button
                  onClick={() => setEntryType('grades')}
                  className={`px-4 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5 ${entryType === 'grades' ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-50'}`}
                >
                  <FileCheck className="w-4 h-4" /> Sem Grades
                </button>
              </div>

              <div className="flex bg-white p-1 rounded-lg border">
                <button
                  onClick={() => setStatusFilter(statusFilter === 'pass' ? 'all' : 'pass')}
                  className={`px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5 transition-all ${statusFilter === 'pass' ? 'bg-green-600 text-white shadow-md' : 'text-green-600 hover:bg-green-50'}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Pass:</span> {stats.pass}
                </button>
                <button
                  onClick={() => setStatusFilter(statusFilter === 'fail' ? 'all' : 'fail')}
                  className={`px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5 transition-all ${statusFilter === 'fail' ? 'bg-red-600 text-white shadow-md' : 'text-red-600 hover:bg-red-50'}`}
                >
                  <XCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Fail:</span> {stats.fail}
                </button>
              </div>
            </div>

            {successMsg && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-1.5 rounded-full text-sm font-bold border border-green-100 animate-bounce">
                <CheckCircle2 className="w-4 h-4" /> {successMsg}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                className="pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="p-0">
            {entryMode === 'manual' ? (
              <div className="overflow-x-auto border rounded-2xl shadow-sm bg-white overflow-hidden">
                <table className="w-full text-left font-serif">
                  <thead className="bg-brand-deep text-white border-b">
                    <tr>
                      <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Student Identity</th>
                      <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-center">
                        {entryType === 'marks' ? 'Internal Score (Max 100)' :
                          entryType === 'lab' ? 'Lab Score (Max 100)' :
                            entryType === 'attendance' ? 'Attendance Percentage' : 'Semester Grade'}
                      </th>
                      <th className="px-8 py-5 text-right font-black text-[10px] uppercase tracking-[0.2em]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStudents.map(s => (
                      <tr key={s.registerNumber} className="hover:bg-gray-50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-light rounded-full flex items-center justify-center text-brand-accent font-bold">
                              {s.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{s.name}</div>
                              <div className="text-xs text-gray-500 font-mono">{s.registerNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-center">
                          {entryType === 'grades' ? (
                            <div className="text-3xl font-black text-brand-primary">
                              {getSemesterGradeForSubject(s.registerNumber)}
                            </div>
                          ) : (
                            <GenericInput
                              initialValue={getExistingValue(s.registerNumber)}
                              onSave={(newVal) => handleUpdateData(s.registerNumber, newVal)}
                              entryType={entryType}
                            />
                          )}
                        </td>
                        <td className="px-8 py-4 text-right">
                          {entryType === 'grades' ? (
                            getSemesterGradeForSubject(s.registerNumber) !== '-' ? (
                              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Verified</span>
                            ) : (
                              <span className="text-xs font-bold text-gray-300">Not Available</span>
                            )
                          ) : (
                            getExistingValue(s.registerNumber) !== '' ? (
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${entryType === 'lab' ? 'text-emerald-600 bg-emerald-50' : 'text-green-600 bg-green-50'}`}>
                                <CheckCircle2 className="w-3 h-3" /> Recorded
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-gray-300">Pending</span>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center space-y-6">
                <div className="max-w-md mx-auto p-8 border-2 border-dashed border-emerald-200 rounded-3xl bg-emerald-50/30">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-gray-800 mb-2">Upload Excel Sheet</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Upload an Excel file (.xlsx) with <b>Register Number</b> and <b>Mark/Percentage</b> columns.
                  </p>

                  <input
                    type="file"
                    id="excel-upload"
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploading(true);
                      try {
                        const reader = new FileReader();
                        reader.onload = async (evt) => {
                          const data = evt.target?.result;
                          const workbook = XLSX.read(data, { type: 'binary' });
                          const sheetName = workbook.SheetNames[0];
                          const sheet = workbook.Sheets[sheetName];
                          const json = XLSX.utils.sheet_to_json(sheet) as any[];

                          const results = [];
                          for (const row of json) {
                            const keys = Object.keys(row);
                            const regNoKey = keys.find(k => k.toLowerCase().includes('reg') || k.toLowerCase().includes('roll'));
                            const valKey = keys.find(k => k.toLowerCase().includes(entryType === 'attendance' ? 'attend' : 'mark') || k.toLowerCase().includes('score'));

                            if (regNoKey && valKey) {
                              const regNo = String(row[regNoKey]).trim();
                              const value = parseFloat(row[valKey]);
                              if (!isNaN(value)) {
                                const saved = await handleUpdateData(regNo, value, true);
                                if (saved) results.push(saved);
                              }
                            }
                          }

                          if (results.length > 0) {
                            if (entryType === 'marks') {
                              const existingIds = new Set(results.map(r => r.studentRegNo));
                              const remaining = state.marks.filter(m => !(
                                existingIds.has(m.studentRegNo) &&
                                m.subjectId === selectedSubjectId &&
                                Number(m.internalId) === Number(selectedInternalId) &&
                                Number(m.semesterId) === Number(selectedSubject?.semesterId)
                              ));
                              updateState({ marks: [...remaining, ...results] });
                            } else if (entryType === 'lab') {
                              const existingIds = new Set(results.map(r => r.studentRegNo));
                              const remaining = state.labMarks.filter(l => !(
                                existingIds.has(l.studentRegNo) &&
                                l.subjectId === selectedSubjectId &&
                                Number(l.internalId) === Number(selectedInternalId) &&
                                Number(l.semesterId) === Number(selectedSubject?.semesterId)
                              ));
                              updateState({ labMarks: [...remaining, ...results] });
                            } else {
                              const existingIds = new Set(results.map(r => r.studentRegNo));
                              const remaining = state.attendance.filter(a => !(
                                existingIds.has(a.studentRegNo) &&
                                a.subjectId === selectedSubjectId &&
                                Number(a.internalId) === Number(selectedInternalId) &&
                                Number(a.semesterId) === Number(selectedSubject?.semesterId)
                              ));
                              updateState({ attendance: [...remaining, ...results] });
                            }
                          }
                          setSuccessMsg(`${results.length} records processed successfully!`);
                          setTimeout(() => setSuccessMsg(''), 5000);
                        };
                        reader.readAsBinaryString(file);
                      } catch (err) {
                        alert("Error parsing Excel file");
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                  />

                  <label
                    htmlFor="excel-upload"
                    className={`inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl cursor-pointer transition-all shadow-xl shadow-emerald-100 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {isUploading ? 'Processing...' : 'Choose File'}
                  </label>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      const templateData = state.students.map(s => ({
                        "Register Number": s.registerNumber,
                        "Name": s.name,
                        [entryType === 'attendance' ? 'Attendance %' : 'Marks']: ''
                      }));
                      const ws = XLSX.utils.json_to_sheet(templateData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Template");
                      XLSX.writeFile(wb, `${selectedSubject?.code}_${entryType}_template.xlsx`);
                    }}
                    className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-brand-primary transition-colors"
                  >
                    <FileCheck className="w-4 h-4" /> Download Template
                  </button>
                </div>
              </div>
            )}
          </div>

          {entryType !== 'grades' && (
            <div className="p-8 bg-gray-50 border-t flex justify-end">
              <button
                onClick={onSave}
                className={`px-10 py-3 text-white font-bold rounded-xl shadow-xl transition-all flex items-center gap-2 ${entryType === 'lab' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-brand-primary hover:bg-brand-secondary shadow-purple-100'}`}
              >
                <ClipboardCheck className="w-5 h-5" /> Save All Records
              </button>
            </div>
          )}
        </div>
      )}

      {selectedSubjectId && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-brand-deep flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-brand-primary" /> Subject Analysis: {selectedSubject?.code}
            </h3>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
              All Students Distribution
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2 h-80 bg-white p-6 rounded-3xl border shadow-sm">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Student Marks Comparison</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={state.students.map(s => {
                  const mark = state.marks.find(m => m.studentRegNo === s.registerNumber && m.subjectId === selectedSubjectId && m.internalId === selectedInternalId);
                  return { name: s.name.split(' ')[0], Mark: mark?.marks || 0 };
                })}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="Mark" radius={[4, 4, 0, 0]} barSize={25}>
                    {state.students.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-1 h-80 bg-white p-6 rounded-3xl border shadow-sm">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Mark Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={(() => {
                      const marks = state.marks.filter(m => m.subjectId === selectedSubjectId && m.internalId === selectedInternalId).map(m => m.marks);
                      const ranges = [
                        { name: '0-20', value: marks.filter(m => m <= 20).length },
                        { name: '21-40', value: marks.filter(m => m > 20 && m <= 40).length },
                        { name: '41-60', value: marks.filter(m => m > 40 && m <= 60).length },
                        { name: '61-80', value: marks.filter(m => m > 60 && m <= 80).length },
                        { name: '81-100', value: marks.filter(m => m > 80).length },
                      ].filter(r => r.value > 0);
                      return ranges;
                    })()}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-brand-light/20 p-6 rounded-3xl border border-brand-primary/10 flex flex-col justify-center text-center shadow-sm">
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-2">Subject Average</p>
              <p className="text-5xl font-black text-brand-deep">
                {(state.marks.filter(m => m.subjectId === selectedSubjectId && m.internalId === selectedInternalId).reduce((a, b) => a + b.marks, 0) / (state.students.length || 1)).toFixed(1)}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-[9px] font-black text-green-600 uppercase">Passed</span>
                  <span className="text-sm font-black text-green-700">{state.marks.filter(m => m.subjectId === selectedSubjectId && m.internalId === selectedInternalId && m.marks >= 50).length}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-[9px] font-black text-red-600 uppercase">Failed</span>
                  <span className="text-sm font-black text-red-700">{state.marks.filter(m => m.subjectId === selectedSubjectId && m.internalId === selectedInternalId && m.marks < 50).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
