
import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { 
  Trophy, TrendingUp, Calendar, BookOpen, 
  BarChart2, Award, ChevronDown, CheckCircle, Layers, Hash
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface StudentDashboardProps {
  state: AppState;
  studentRegNo: string;
  onLogout: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ state, studentRegNo }) => {
  const [viewSemester, setViewSemester] = useState<number>(1);
  const [viewInternal, setViewInternal] = useState<number>(1);

  const student = useMemo(() => state.students.find(s => s.registerNumber === studentRegNo), [state.students, studentRegNo]);
  
  const relevantMarks = useMemo(() => 
    state.marks.filter(m => m.studentRegNo === studentRegNo && m.semesterId === viewSemester && m.internalId === viewInternal),
    [state.marks, studentRegNo, viewSemester, viewInternal]
  );

  const relevantMasterAtt = useMemo(() => 
    state.masterAttendance.find(ma => ma.studentRegNo === studentRegNo && ma.semesterId === viewSemester && ma.internalId === viewInternal),
    [state.masterAttendance, studentRegNo, viewSemester, viewInternal]
  );

  const relevantSubjects = useMemo(() => 
    state.subjects.filter(s => s.semesterId === viewSemester),
    [state.subjects, viewSemester]
  );

  const stats = useMemo(() => {
    const totalMarks = relevantMarks.reduce((acc, curr) => acc + curr.marks, 0);
    const avgMarks = relevantMarks.length > 0 ? totalMarks / relevantMarks.length : 0;
    const attPercentage = relevantMasterAtt?.percentage ?? 0;
    return { totalMarks, avgMarks, attPercentage };
  }, [relevantMarks, relevantMasterAtt]);

  if (!student) return <div className="p-8 text-center text-red-500">Student profile not found.</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="bg-gradient-to-r from-indigo-700 to-blue-600 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 text-3xl font-black">
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight">{student.name}</h2>
              <div className="flex gap-4 mt-1 text-indigo-100 font-medium">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Reg: {student.registerNumber}</span>
                <span className="flex items-center gap-1.5"><Award className="w-4 h-4" /> Roll: {student.rollNumber}</span>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg px-6 py-3 rounded-2xl border border-white/20 flex gap-8">
            <div className="text-center">
              <p className="text-[10px] uppercase font-black text-indigo-200">Current Attendance</p>
              <p className="text-2xl font-black">{stats.attPercentage.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-black text-indigo-200">Avg Marks</p>
              <p className="text-2xl font-black">{stats.avgMarks.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </header>

      {/* View Selection Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-8">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-indigo-600" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase">Select Semester</span>
            <select 
              value={viewSemester} 
              onChange={(e) => setViewSemester(parseInt(e.target.value))}
              className="font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
            >
              {[...Array(state.config.semesters)].map((_, i) => (
                <option key={i+1} value={i+1}>Semester {i+1}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-px h-10 bg-gray-100 hidden md:block"></div>

        <div className="flex items-center gap-3">
          <Hash className="w-5 h-5 text-indigo-600" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase">Select Internal</span>
            <div className="flex gap-2 mt-1">
              {[...Array(state.config.internalsPerSem)].map((_, i) => (
                <button 
                  key={i+1}
                  onClick={() => setViewInternal(i+1)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${viewInternal === i+1 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                >
                  INT {i+1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Academic Records */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                 <BookOpen className="w-5 h-5 text-indigo-600" /> Subject-wise Marks - Internal {viewInternal}
               </h3>
             </div>
             
             <div className="space-y-4">
                {relevantSubjects.map(sub => {
                   const subMark = relevantMarks.find(m => m.subjectId === sub.id);
                   const labMark = state.labMarks.find(l => l.studentRegNo === studentRegNo && l.subjectId === sub.id && l.semesterId === viewSemester && l.internalId === viewInternal);
                   return (
                     <div key={sub.id} className="p-4 bg-gray-50 rounded-xl border border-transparent hover:border-indigo-200 transition-all flex justify-between items-center">
                       <div>
                          <h4 className="font-bold text-gray-900 leading-tight">{sub.name}</h4>
                          <p className="text-xs text-gray-500 font-mono">{sub.code}</p>
                       </div>
                       <div className="flex gap-6 items-center">
                          <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase">Marks</p>
                            <p className="font-black text-lg text-indigo-700">{subMark?.marks ?? '--'}</p>
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
                {relevantSubjects.length === 0 && (
                   <div className="text-center py-10">
                     <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                     <p className="text-gray-400 italic text-sm">No subjects registered for Semester {viewSemester}.</p>
                   </div>
                )}
             </div>
          </section>
        </div>

        {/* Sidebar / Internal Summary */}
        <div className="space-y-8">
           <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                <BarChart2 className="w-8 h-8 text-yellow-400" />
                <h3 className="font-black text-xl italic uppercase tracking-tighter">Internal Stats</h3>
             </div>
             <div className="space-y-4">
                <div className="p-4 bg-white/10 rounded-2xl flex flex-col items-center text-center">
                   <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Internal Attendance</p>
                   <p className={`text-4xl font-black ${stats.attPercentage < 75 ? 'text-red-400' : 'text-green-400'}`}>
                      {stats.attPercentage.toFixed(1)}%
                   </p>
                   <p className="text-[10px] text-white/50 mt-2 italic">Uploaded by Class Advisor</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <p className="text-[9px] font-black text-indigo-300 uppercase">Total Marks</p>
                    <p className="font-black text-lg">{stats.totalMarks}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <p className="text-[9px] font-black text-indigo-300 uppercase">Avg Mark</p>
                    <p className="font-black text-lg">{stats.avgMarks.toFixed(1)}</p>
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
                  <span className="font-black text-blue-600">PENDING</span>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
