
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

const StudentDashboard: React.FC<StudentDashboardProps> = ({ state, studentRegNo }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'marks_ledger'>('overview');
  const [viewSemester, setViewSemester] = useState<number>(1);
  const [viewInternal, setViewInternal] = useState<number>(1);

  const student = useMemo(() => state.students.find(s => s.registerNumber === studentRegNo), [state.students, studentRegNo]);

  const relevantMarks = useMemo(() =>
    state.marks.filter(m => m.studentRegNo === studentRegNo && Number(m.semesterId) === Number(viewSemester) && Number(m.internalId) === Number(viewInternal)),
    [state.marks, studentRegNo, viewSemester, viewInternal]
  );

  const relevantMasterAtt = useMemo(() =>
    state.masterAttendance.find(ma => ma.studentRegNo === studentRegNo && Number(ma.semesterId) === Number(viewSemester) && Number(ma.internalId) === Number(viewInternal)),
    [state.masterAttendance, studentRegNo, viewSemester, viewInternal]
  );

  const relevantSubjects = useMemo(() =>
    state.subjects.filter(s => Number(s.semesterId) === Number(viewSemester)),
    [state.subjects, viewSemester]
  );

  const stats = useMemo(() => {
    const totalMarks = relevantMarks.reduce((acc, curr) => acc + curr.marks, 0);
    const avgMarks = relevantMarks.length > 0 ? totalMarks / relevantMarks.length : 0;
    const attPercentage = relevantMasterAtt?.percentage ?? 0;

    const pieData = relevantMarks.map((m, i) => ({
      name: state.subjects.find(s => s.id === m.subjectId)?.name || m.subjectId,
      value: m.marks
    }));

    const attendanceData = [
      { name: 'Attended', value: attPercentage },
      { name: 'Absent', value: 100 - attPercentage }
    ];

    return { totalMarks, avgMarks, attPercentage, pieData, attendanceData };
  }, [relevantMarks, relevantMasterAtt, state.subjects]);

  const semesterGrade = useMemo(() =>
    state.semesterGrades?.find(g => g.studentRegNo === studentRegNo && Number(g.semesterId) === Number(viewSemester)),
    [state.semesterGrades, studentRegNo, viewSemester]
  );

  const performanceTrends = useMemo(() => {
    return state.subjects.filter(s => Number(s.semesterId) === Number(viewSemester)).map(sub => {
      const int1 = state.marks.find(m => m.studentRegNo === studentRegNo && (m.subjectId === sub.id || m.subjectId === sub.code) && Number(m.internalId) === 1)?.marks || 0;
      const int2 = state.marks.find(m => m.studentRegNo === studentRegNo && (m.subjectId === sub.id || m.subjectId === sub.code) && Number(m.internalId) === 2)?.marks || 0;
      return {
        name: sub.code,
        'Internal 1': int1,
        'Internal 2': int2
      };
    });
  }, [state.marks, state.subjects, studentRegNo, viewSemester]);

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
              <div className="flex gap-4 mt-1 text-brand-accent/80 font-medium">
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
              <p className="text-[10px] uppercase font-black text-brand-accent/60">Avg Marks</p>
              <p className="text-2xl font-black">{stats.avgMarks.toFixed(1)}</p>
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
              className="font-bold text-white bg-[#131b2e] outline-none cursor-pointer p-1 rounded border border-gray-700"
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
                      return state.subjects.filter(s => Number(s.semesterId) === Number(viewSemester)).map(sub => {
                        const gradeKey = Object.keys(results).find(k => k.toLowerCase() === sub.code.toLowerCase());
                        const grade = gradeKey ? results[gradeKey] : null;

                        if (!grade) return null;

                        return (
                          <div key={sub.code} className="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm">
                            <span className="text-[10px] font-black text-gray-400 uppercase">{sub.code}</span>
                            <span className={`font-black text-lg ${['U', 'UA', 'RA', 'AB'].includes(grade) ? 'text-red-500' : 'text-brand-deep'}`}>{grade}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {state.subjects.filter(s => Number(s.semesterId) === viewSemester).map(sub => {
                  const subMark = relevantMarks.find(m => m.subjectId === sub.id || m.subjectId === sub.code);
                  const labMark = state.labMarks.find(l => l.studentRegNo === studentRegNo && (l.subjectId === sub.id || l.subjectId === sub.code) && l.semesterId === viewSemester && l.internalId === viewInternal);
                  return (
                    <div key={sub.id} className="p-4 bg-gray-50 rounded-xl border border-transparent hover:border-brand-primary/20 transition-all flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-gray-900 leading-tight">{sub.name}</h4>
                        <p className="text-xs text-gray-500 font-mono">{sub.code}</p>
                      </div>
                      <div className="flex gap-6 items-center">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Marks</p>
                          <p className="font-black text-lg text-brand-secondary">{subMark?.marks ?? '--'}</p>
                        </div>
                        {labMark && (
                          <div className="text-right border-l pl-6 border-gray-200">
                            <p className="text-[10px] font-black text-emerald-500 uppercase">Lab Marks</p>
                            <p className="font-black text-lg text-emerald-600">{labMark.marks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {state.subjects.filter(s => Number(s.semesterId) === viewSemester).length === 0 && (
                  <div className="text-center py-10">
                    <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 italic text-sm">No subjects registered for Semester {viewSemester}.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Performance Improvement Trend */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-brand-primary" /> Performance Improvement Trend
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontStyle="bold" />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} fontSize={10} tickFormatter={(val) => `${val}%`} />
                    <ReTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                    <ReLegend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                    <Bar name="Internal 1" dataKey="Internal 1" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar name="Internal 2" dataKey="Internal 2" fill="#046e84" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-6 text-[10px] text-gray-400 font-black uppercase tracking-widest text-center">Internal 1 vs Internal 2 Progress Analysis</p>
            </div>
          </div>

          {/* Sidebar / Internal Summary */}
          <div className="space-y-8">
            <div className="bg-brand-primary text-white p-6 rounded-3xl shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <BarChart2 className="w-8 h-8 text-yellow-400" />
                <h3 className="font-black text-xl italic uppercase tracking-tighter">Internal Stats</h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white/10 rounded-2xl flex flex-col items-center text-center">
                  <p className="text-[10px] font-black text-brand-accent/30 uppercase tracking-widest mb-1">Internal Attendance</p>
                  <p className={`text-4xl font-black ${stats.attPercentage < 75 ? 'text-red-400' : 'text-green-400'}`}>
                    {stats.attPercentage.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-white/50 mt-2 italic">Uploaded by Class Advisor</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <p className="text-[9px] font-black text-brand-accent/30 uppercase">Total Marks</p>
                    <p className="font-black text-lg">{stats.totalMarks}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <p className="text-[9px] font-black text-brand-accent/30 uppercase">Avg Mark</p>
                    <p className="font-black text-lg">{stats.avgMarks.toFixed(1)}</p>
                    <p className="text-[8px] text-brand-accent/30">Excludes Lab</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" /> Official Status
              </h4>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500">Eligibility</span>
                  <span className={`font-black px-2 py-0.5 rounded ${stats.attPercentage >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {stats.attPercentage >= 75 ? 'ELIGIBLE' : 'LOW ATTENDANCE'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500">Exam Clearance</span>
                  <span className="font-black text-brand-accent">PENDING</span>
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
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-black uppercase text-xs text-gray-500">Subject Code</th>
                    <th className="px-6 py-4 font-black uppercase text-xs text-gray-500">Subject Name</th>
                    <th className="px-6 py-4 font-black uppercase text-xs text-center text-gray-500">Internal 1</th>
                    <th className="px-6 py-4 font-black uppercase text-xs text-center text-gray-500">Internal 2</th>
                    <th className="px-6 py-4 font-black uppercase text-xs text-center text-gray-500">Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {state.subjects.filter(s => Number(s.semesterId) === Number(viewSemester)).map(sub => {
                    const m1 = state.marks.find(m => m.studentRegNo === studentRegNo && (m.subjectId === sub.id || m.subjectId === sub.code || m.subjectId.includes(sub.code)) && Number(m.internalId) === 1)?.marks;
                    const m2 = state.marks.find(m => m.studentRegNo === studentRegNo && (m.subjectId === sub.id || m.subjectId === sub.code || m.subjectId.includes(sub.code)) && Number(m.internalId) === 2)?.marks;

                    const v1 = m1 !== undefined ? m1 : 0;
                    const v2 = m2 !== undefined ? m2 : 0;

                    const avg = (v1 + v2) / 2;

                    return (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono font-bold text-gray-600">{sub.code}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{sub.name}</td>
                        <td className="px-6 py-4 text-center">
                          {m1 !== undefined ? <span className="font-bold text-gray-700">{m1}</span> : <span className="text-gray-300">--</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {m2 !== undefined ? <span className="font-bold text-gray-700">{m2}</span> : <span className="text-gray-300">--</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-black px-3 py-1 rounded-full text-xs ${avg >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {avg.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {state.subjects.filter(s => Number(s.semesterId) === Number(viewSemester)).length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400 italic">No subjects enrolled for this semester.</td></tr>
                  )}
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
                <h3 className="text-2xl font-black text-gray-900 leading-tight">University Results</h3>
                <p className="text-sm text-gray-500">Official semester grade sheet mapped from University PDF.</p>
              </div>
              {semesterGrade && (
                <button className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-secondary transition-all">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              )}
            </div>

            {semesterGrade ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(JSON.parse(semesterGrade.results)).map(([code, grade]) => {
                  const subName = state.subjects.find(s => s.code === code)?.name || "Subject";
                  return (
                    <div key={code} className="p-6 bg-gray-50 rounded-2xl border border-transparent hover:border-brand-primary/20 transition-all">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{code}</p>
                      <h4 className="font-bold text-gray-800 mb-4 line-clamp-1">{subName}</h4>
                      <div className="flex items-end justify-between">
                        <span className={`text-4xl font-black ${grade === 'U' || grade === 'UA' ? 'text-red-500' : 'text-brand-primary'}`}>
                          {grade as string}
                        </span>
                        <span className="text-[10px] font-black px-2 py-1 bg-white rounded-lg shadow-sm border text-gray-400">GRADE</span>
                      </div>
                    </div>
                  );
                })}
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
                  <BarChart data={state.subjects.filter(s => Number(s.semesterId) === Number(viewSemester)).map(sub => {
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
