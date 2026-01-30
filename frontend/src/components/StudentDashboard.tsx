
import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import {
  Trophy, TrendingUp, Calendar, BookOpen,
  BarChart2, Award, ChevronDown, CheckCircle, Layers, Hash, PieChart, Download, FileText
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart as RePieChart, Pie, Cell, Legend,
  BarChart, Bar, Legend as ReLegend, Tooltip as ReTooltip
} from 'recharts';


import { api } from '../api.ts';

interface StudentDashboardProps {
  state: AppState;
  studentRegNo: string;
  onLogout: () => void;
}

const COLORS = ['#046e84', '#0694b3', '#08b9e1', '#06cdee', '#00e5ff'];

const GRADE_POINTS: Record<string, number> = {
  'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5,
  'U': 0, 'UA': 0, 'RA': 0, 'AB': 0, 'W': 0, 'SA': 0
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({ state, studentRegNo }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'marks_ledger'>('overview');
  const [viewSemester, setViewSemester] = useState<number>(1);
  const [viewInternal, setViewInternal] = useState<number>(1);

  const student = useMemo(() => state.students.find(s => s.registerNumber === studentRegNo), [state.students, studentRegNo]);

  const allSemesterGrades = useMemo(() =>
    state.semesterGrades.filter(g => g.studentRegNo === studentRegNo),
    [state.semesterGrades, studentRegNo]
  );

  const stats = useMemo(() => {
    const relevantMarks = state.marks.filter(m => m.studentRegNo === studentRegNo && Number(m.semesterId) === Number(viewSemester) && Number(m.internalId) === Number(viewInternal));
    const relevantMasterAtt = state.masterAttendance.find(ma => ma.studentRegNo === studentRegNo && Number(ma.semesterId) === Number(viewSemester) && Number(ma.internalId) === Number(viewInternal));
    const subjects = state.subjects.filter(s => Number(s.semesterId) === Number(viewSemester));

    const subjectMarks = subjects.map(sub => {
      const record = relevantMarks.find(m => m.subjectId === sub.id || m.subjectId === sub.code);
      return record ? record.marks : null;
    }).filter(m => m !== null) as number[];

    const totalMarks = subjectMarks.reduce((acc, curr) => acc + curr, 0);
    const avgMarks = subjectMarks.length > 0 ? totalMarks / subjectMarks.length : 0;
    const attPercentage = relevantMasterAtt?.percentage ?? 0;

    const pieData = subjects.map((sub) => {
      const record = relevantMarks.find(m => m.subjectId === sub.id || m.subjectId === sub.code);
      if (!record) return null;
      return { name: sub.name, value: record.marks };
    }).filter(d => d !== null) as { name: string, value: number }[];

    return {
      totalMarks,
      avgMarks,
      attPercentage,
      pieData,
      attendanceData: [{ name: 'Attended', value: attPercentage }, { name: 'Absent', value: 100 - attPercentage }]
    };
  }, [state, studentRegNo, viewSemester, viewInternal]);

  const semesterGrade = useMemo(() =>
    allSemesterGrades.find(g => Number(g.semesterId) === Number(viewSemester)),
    [allSemesterGrades, viewSemester]
  );

  const cgpa = useMemo(() => {
    if (allSemesterGrades.length === 0) return 0;
    let totalPoints = 0;
    let totalSubjects = 0;
    allSemesterGrades.forEach(sg => {
      try {
        const results = JSON.parse(sg.results);
        Object.values(results).forEach(grade => {
          totalPoints += GRADE_POINTS[grade as string] || 0;
          totalSubjects++;
        });
      } catch (e) { }
    });
    return totalSubjects > 0 ? totalPoints / totalSubjects : 0;
  }, [allSemesterGrades]);

  const gpa = useMemo(() => {
    if (!semesterGrade) return 0;
    try {
      const results = JSON.parse(semesterGrade.results);
      const grades = Object.values(results) as string[];
      if (grades.length === 0) return 0;
      const totalPoints = grades.reduce((acc, g) => acc + (GRADE_POINTS[g] || 0), 0);
      return totalPoints / grades.length;
    } catch (e) { return 0; }
  }, [semesterGrade]);

  const handleDownloadPDF = async () => {
    if (!semesterGrade || !student) return;

    try {
      // @ts-ignore
      const jspdfModule = await import('jspdf');
      const autotableModule = await import('jspdf-autotable');

      const jsPDF = (jspdfModule.default || jspdfModule.jsPDF || jspdfModule) as any;
      const autoTable = (autotableModule.default || autotableModule) as any;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Premium Header
      doc.setFillColor(4, 110, 132); // #046e84
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('ACADEMIC GRADE SHEET', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Semester ${viewSemester} | Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });

      // Student Info
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Student: ${student.name}`, 14, 55);
      doc.text(`Reg No: ${student.registerNumber}`, 14, 62);
      doc.text(`Roll No: ${student.rollNumber}`, 14, 69);

      // GPA/CGPA Summary
      doc.setFillColor(248, 250, 252);
      doc.rect(140, 50, 56, 25, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(140, 50, 56, 25, 'S');

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text('SEMESTER GPA', 145, 58);
      doc.setTextColor(4, 110, 132);
      doc.setFontSize(16);
      doc.text(gpa.toFixed(2), 145, 68);

      // table data
      const results = JSON.parse(semesterGrade.results);
      const tableData = Object.entries(results).map(([code, grade]) => {
        const subName = state.subjects.find(s => s.code === code)?.name || 'N/A';
        return [code, subName, grade];
      });

      // @ts-ignore
      autoTable(doc, {
        startY: 85,
        head: [['Code', 'Subject Name', 'Grade']],
        body: tableData,
        headStyles: {
          fillColor: [4, 110, 132],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 20, fontStyle: 'bold', halign: 'center' }
        },
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 6,
          lineColor: [230, 230, 230],
          lineWidth: 0.1,
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        }
      });

      // CGPA Info
      // @ts-ignore
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Cumulative CGPA: ${cgpa.toFixed(2)}`, 14, finalY + 15);

      doc.save(`${student.registerNumber}_Sem${viewSemester}_Results.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('PDF Download failed. Please ensure jspdf and jspdf-autotable are installed.');
    }
  };

  const performanceTrends = useMemo(() => {
    const subjects = state.subjects.filter(s => Number(s.semesterId) === Number(viewSemester));
    return subjects.map(sub => {
      const int1 = state.marks.find(m => m.studentRegNo === studentRegNo && (m.subjectId === sub.id || m.subjectId === sub.code) && Number(m.internalId) === 1)?.marks || 0;
      const int2 = state.marks.find(m => m.studentRegNo === studentRegNo && (m.subjectId === sub.id || m.subjectId === sub.code) && Number(m.internalId) === 2)?.marks || 0;
      return {
        name: sub.code,
        'Internal 1': int1,
        'Internal 2': int2
      };
    });
  }, [state, viewSemester, studentRegNo]);

  const relevantSubjects = useMemo(() => state.subjects.filter(s => Number(s.semesterId) === Number(viewSemester)), [state.subjects, viewSemester]);

  if (!student) return <div className="p-8 text-center text-red-500">Student profile not found.</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="bg-gradient-to-r from-brand-primary to-brand-secondary p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 text-3xl font-black">
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight">{student.name}</h2>
              <div className="flex gap-4 mt-1 text-brand-accent/80 font-medium font-serif">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Reg: {student.registerNumber}</span>
                <span className="flex items-center gap-1.5"><Award className="w-4 h-4" /> Roll: {student.rollNumber}</span>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg px-6 py-3 rounded-2xl border border-white/20 flex gap-8">
            <div className="text-center">
              <p className="text-[10px] uppercase font-black text-brand-accent/60">Current Attendance</p>
              <p className="text-2xl font-black">{stats.attPercentage.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-black text-brand-accent/60">Overall CGPA</p>
              <p className="text-2xl font-black">{cgpa.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </header>

      {/* View Selection Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-8">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('overview')} className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500'}`}>Overview</button>
          <button onClick={() => setActiveTab('marks_ledger')} className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'marks_ledger' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500'}`}>Marks Ledger</button>
          <button onClick={() => setActiveTab('grades')} className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'grades' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500'}`}>Semester Grades</button>
        </div>
        <div className="w-px h-10 bg-gray-100 hidden md:block"></div>
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-brand-accent" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase">Select Semester</span>
            <select
              value={viewSemester}
              onChange={(e) => setViewSemester(parseInt(e.target.value))}
              className="font-bold text-white bg-[#131b2e] outline-none cursor-pointer p-1 rounded border border-gray-700 font-serif"
            >
              {[...Array(state.config.semesters)].map((_, i) => (
                <option key={i + 1} value={i + 1} className="bg-[#131b2e] text-white">Semester {i + 1}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-px h-10 bg-gray-100 hidden md:block"></div>

        <div className="flex items-center gap-3">
          <Hash className="w-5 h-5 text-brand-accent" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase">Select Internal</span>
            <div className="flex gap-2 mt-1">
              {[...Array(state.config.internalsPerSem)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setViewInternal(i + 1)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${viewInternal === i + 1 ? 'bg-brand-primary text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                >
                  INT {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Academic Records */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-accent" /> Subject-wise Marks - Internal {viewInternal}
                </h3>
              </div>

              {semesterGrade && (
                <div className="mb-8 p-6 bg-brand-light/20 rounded-2xl border border-brand-primary/10">
                  <h4 className="text-sm font-black text-brand-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4" /> University Results (Sem {viewSemester})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      const results = JSON.parse(semesterGrade.results);
                      return relevantSubjects.map(sub => {
                        const gradeKey = Object.keys(results).find(k => k.toLowerCase() === sub.code.toLowerCase());
                        const grade = gradeKey ? results[gradeKey] : null;

                        if (!grade) return null;

                        return (
                          <div key={sub.code} className="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm">
                            <span className="text-[10px] font-black text-gray-400 uppercase">{sub.code}</span>
                            <span className={`font-black text-lg ${['U', 'UA', 'RA', 'AB', 'W'].includes(grade) ? 'text-red-500' : 'text-brand-deep'}`}>{grade}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {relevantSubjects.map(sub => {
                  const subMark = state.marks.find(m => m.studentRegNo === studentRegNo && (m.subjectId === sub.id || m.subjectId === sub.code) && Number(m.semesterId) === Number(viewSemester) && Number(m.internalId) === Number(viewInternal));
                  const labMark = state.labMarks.find(l => l.studentRegNo === studentRegNo && (l.subjectId === sub.id || l.subjectId === sub.code) && l.semesterId === viewSemester && l.internalId === viewInternal);
                  return (
                    <div key={sub.id} className="p-4 bg-gray-50 rounded-xl border border-transparent hover:border-brand-primary/20 transition-all flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-gray-900 leading-tight">{sub.name}</h4>
                        <p className="text-xs text-gray-500 font-mono font-serif">{sub.code}</p>
                      </div>
                      <div className="flex gap-6 items-center">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marks</p>
                          <p className="font-black text-lg text-brand-secondary">{subMark?.marks ?? '--'}</p>
                        </div>
                        {labMark && (
                          <div className="text-right border-l pl-6 border-gray-200">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Lab Marks</p>
                            <p className="font-black text-lg text-emerald-600">{labMark.marks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <div className="bg-brand-primary text-white p-6 rounded-3xl shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <BarChart2 className="w-8 h-8 text-yellow-400" />
                <h3 className="font-black text-xl italic uppercase tracking-tighter">Performance</h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white/10 rounded-2xl flex flex-col items-center text-center">
                  <p className="text-[10px] font-black text-brand-accent/30 uppercase tracking-widest mb-1">Semester GPA</p>
                  <p className="text-4xl font-black text-white">{gpa.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-white/10 rounded-2xl flex flex-col items-center text-center">
                  <p className="text-[10px] font-black text-brand-accent/30 uppercase tracking-widest mb-1">Cumulative CGPA</p>
                  <p className="text-4xl font-black text-green-400">{cgpa.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'marks_ledger' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-brand-primary" /> Internal Marks Ledger</h3>
            <div className="overflow-x-auto border rounded-xl shadow-sm">
              <table className="w-full text-left text-sm font-serif">
                <thead className="bg-brand-deep text-white border-b">
                  <tr>
                    <th className="px-6 py-5 font-black uppercase text-[10px] tracking-[0.2em]">Subject Code</th>
                    <th className="px-6 py-5 font-black uppercase text-[10px] tracking-[0.2em]">Subject Name</th>
                    <th className="px-6 py-5 font-black uppercase text-[10px] tracking-[0.2em] text-center">Internal 1</th>
                    <th className="px-6 py-5 font-black uppercase text-[10px] tracking-[0.2em] text-center">Internal 2</th>
                    <th className="px-6 py-5 font-black uppercase text-[10px] tracking-[0.2em] text-center">Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans">
                  {relevantSubjects.map(sub => {
                    const m1 = state.marks.find(m => m.studentRegNo === studentRegNo && (m.subjectId === sub.id || m.subjectId === sub.code) && Number(m.internalId) === 1)?.marks;
                    const m2 = state.marks.find(m => m.studentRegNo === studentRegNo && (m.subjectId === sub.id || m.subjectId === sub.code) && Number(m.internalId) === 2)?.marks;
                    const v1 = m1 || 0; const v2 = m2 || 0;
                    const avg = (v1 + v2) / 2;
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono font-bold text-gray-600">{sub.code}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{sub.name}</td>
                        <td className="px-6 py-4 text-center font-bold">{m1 ?? '--'}</td>
                        <td className="px-6 py-4 text-center font-bold">{m2 ?? '--'}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-black px-3 py-1 rounded-full text-xs ${avg >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {avg.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight italic">University Results</h3>
                <p className="text-sm text-gray-500">Official semester grade sheet mapped from University records.</p>
              </div>
              {semesterGrade && (
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 bg-brand-primary hover:bg-brand-secondary text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-brand-primary/20"
                >
                  <Download className="w-4 h-4" /> Download PDF Report
                </button>
              )}
            </div>

            {semesterGrade ? (
              <div className="overflow-x-auto border rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left font-serif">
                  <thead className="bg-brand-deep text-white border-b">
                    <tr>
                      <th className="px-8 py-5 font-black uppercase text-[10px] tracking-[0.2em]">Subject Code</th>
                      <th className="px-8 py-5 font-black uppercase text-[10px] tracking-[0.2em]">Subject Name</th>
                      <th className="px-8 py-5 font-black uppercase text-[10px] tracking-[0.2em] text-center">Grade</th>
                      <th className="px-8 py-5 font-black uppercase text-[10px] tracking-[0.2em] text-center">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {Object.entries(JSON.parse(semesterGrade.results)).map(([code, grade]) => {
                      const subName = state.subjects.find(s => s.code === code)?.name || "Subject";
                      const points = GRADE_POINTS[grade as string] || 0;
                      return (
                        <tr key={code} className="hover:bg-brand-light/10 transition-colors">
                          <td className="px-8 py-5 font-mono font-bold text-brand-primary">{code}</td>
                          <td className="px-8 py-5 font-bold text-gray-800">{subName}</td>
                          <td className="px-8 py-5 text-center">
                            <span className={`text-xl font-black ${['U', 'UA', 'RA', 'AB', 'W'].includes(grade as string) ? 'text-red-500' : 'text-brand-deep'}`}>
                              {grade as string}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center font-black text-gray-400">{points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 font-sans">
                    <tr>
                      <td colSpan={2} className="px-8 py-6 text-right font-black text-gray-500 text-xs uppercase tracking-widest">Semester Performance Index (GPA)</td>
                      <td colSpan={2} className="px-8 py-6 text-center">
                        <span className="bg-brand-primary text-white px-6 py-2 rounded-xl font-black text-2xl shadow-lg">
                          {gpa.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium italic">Grade sheet for Semester {viewSemester} has not been uploaded yet.</p>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm md:col-span-2">
              <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-brand-primary" /> Subject Performance (Internal Avg)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relevantSubjects.map(sub => {
                    const int1 = state.marks.find(m => m.studentRegNo === studentRegNo && (m.subjectId === sub.id || m.subjectId === sub.code) && Number(m.internalId) === 1)?.marks || 0;
                    const int2 = state.marks.find(m => m.studentRegNo === studentRegNo && (m.subjectId === sub.id || m.subjectId === sub.code) && Number(m.internalId) === 2)?.marks || 0;
                    return { name: sub.code, Avg: (int1 + int2) / 2 };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="Avg" fill="#046e84" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-brand-primary" /> Mark Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-primary" /> Attendance Overview
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={stats.attendanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#046e84" />
                      <Cell fill="#f1f5f9" />
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                <span className="text-3xl font-black text-brand-primary">{stats.attPercentage.toFixed(1)}%</span>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Current Attendance</p>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
