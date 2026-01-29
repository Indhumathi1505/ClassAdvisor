import React, { useState, useEffect } from 'react';
import { UserRole, AppState, Staff } from '../types';
import { User, Lock, ShieldCheck, BookOpen, Layers } from 'lucide-react';
import { api } from '../api';

interface LoginProps {
  state: AppState;
  onLogin: (user: { role: UserRole; identifier: string; data?: any }) => void;
}

const Login: React.FC<LoginProps> = ({ state, onLogin }) => {
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [semester, setSemester] = useState('1');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);

  const [error, setError] = useState('');

  // Fetch staff data when component mounts or state.staff changes
  useEffect(() => {
    setStaffList(state.staff || []);
  }, [state.staff]);

  // Filter staff by selected semester
  useEffect(() => {
    if (semester) {
      const filtered = staffList.filter(s => s.semesterId === parseInt(semester));
      setFilteredStaff(filtered);
      // Reset selections when semester changes
      setUsername('');
      setSubjectCode('');
      setSubjectName('');
    }
  }, [semester, staffList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === UserRole.ADVISOR) {
      if (username === 'admin' && password === 'admin') {
        onLogin({ role: UserRole.ADVISOR, identifier: 'Advisor Admin' });
      } else {
        setError('Invalid Advisor Credentials (Try admin/admin)');
      }
    } else if (role === UserRole.STUDENT) {
      const student = state.students.find(
        s => s.registerNumber === username && s.rollNumber === password
      );
      if (student) {
        onLogin({
          role: UserRole.STUDENT,
          identifier: student.registerNumber,
          data: student,
        });
      } else {
        setError('Invalid Student Credentials. Use Register No / Roll No.');
      }
    } else if (role === UserRole.STAFF) {
      if (!username || !subjectCode || !subjectName) {
        setError('Please select Staff Name, Semester, and Subject.');
        return;
      }

      onLogin({
        role: UserRole.STAFF,
        identifier: username,
        data: {
          semesterId: parseInt(semester),
          subjectCode: subjectCode,
          subjectName: subjectName
        }
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-md bg-[#0F1523] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden p-8">

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0F1523] border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(103,232,249,0.15)]">
            <ShieldCheck className="w-8 h-8 text-brand-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Class Advisor Portal</h2>
          <p className="text-gray-500 text-sm">Access Management System</p>
        </div>

        {/* ROLE SWITCH */}
        <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
          Portal Access Role
        </div>
        <div className="flex bg-[#0b0f19] p-1.5 rounded-xl mb-8 border border-gray-800">
          <button
            onClick={() => { setRole(UserRole.STUDENT); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${role === UserRole.STUDENT
              ? 'bg-transparent border border-brand-primary text-brand-primary shadow-[0_0_10px_rgba(103,232,249,0.1)]'
              : 'text-gray-500 hover:text-gray-400'
              }`}
          >
            Student
          </button>

          <button
            onClick={() => { setRole(UserRole.STAFF); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${role === UserRole.STAFF
              ? 'bg-transparent border border-brand-primary text-brand-primary shadow-[0_0_10px_rgba(103,232,249,0.1)]'
              : 'text-gray-500 hover:text-gray-400'
              }`}
          >
            Faculty
          </button>

          <button
            onClick={() => { setRole(UserRole.ADVISOR); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${role === UserRole.ADVISOR
              ? 'bg-transparent border border-brand-primary text-brand-primary shadow-[0_0_10px_rgba(103,232,249,0.1)]'
              : 'text-gray-500 hover:text-gray-400'
              }`}
          >
            Advisor
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {role !== UserRole.STAFF && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  {role === UserRole.STUDENT
                    ? 'Student Register Number'
                    : 'Advisor Username'}
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-600 group-focus-within:text-brand-primary transition-colors" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#131b2e] border border-gray-800 rounded-xl
                    focus:ring-1 focus:ring-brand-primary focus:border-brand-primary
                    outline-none transition-all text-sm text-gray-200 placeholder-gray-600"
                    placeholder={role === UserRole.STUDENT ? "Enter Reg No" : "Enter Name"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  {role === UserRole.STUDENT ? 'Roll Number' : 'Password'}
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-600 group-focus-within:text-brand-primary transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#131b2e] border border-gray-800 rounded-xl
                    focus:ring-1 focus:ring-brand-primary focus:border-brand-primary
                    outline-none transition-all text-sm text-gray-200 placeholder-gray-600 tracking-widest"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          )}

          {role === UserRole.STAFF && (
            <div className="space-y-5">

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Faculty Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-600 group-focus-within:text-brand-primary transition-colors" />
                  <select
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#131b2e] border border-gray-800 rounded-xl
                    focus:ring-1 focus:ring-brand-primary focus:border-brand-primary
                    outline-none transition-all text-sm text-gray-200 appearance-none"
                  >
                    <option value="">Select Staff Name</option>
                    {[...new Set(filteredStaff.map(s => s.name))].map((name, idx) => (
                      <option key={idx} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Semester
                </label>
                <div className="relative group">
                  <Layers className="absolute left-4 top-3.5 w-5 h-5 text-gray-600 group-focus-within:text-brand-primary transition-colors" />
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#131b2e] border border-gray-800 rounded-xl
                    focus:ring-1 focus:ring-brand-primary focus:border-brand-primary
                    outline-none transition-all text-sm text-gray-200 appearance-none"
                  >
                    {[...Array(8)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Semester {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Select Subject
                </label>
                <div className="relative group">
                  <BookOpen className="absolute left-4 top-3.5 w-5 h-5 text-gray-600 group-focus-within:text-brand-primary transition-colors" />
                  <select
                    value={`${subjectCode}-${subjectName}`}
                    onChange={(e) => {
                      const [code, ...nameParts] = e.target.value.split('-');
                      setSubjectCode(code.trim());
                      setSubjectName(nameParts.join('-').trim());
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-[#131b2e] border border-gray-800 rounded-xl
                    focus:ring-1 focus:ring-brand-primary focus:border-brand-primary
                    outline-none transition-all text-sm text-gray-200 appearance-none"
                  >
                    <option value="-">Select Subject</option>



                  </select>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 font-medium leading-tight text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-brand-primary hover:bg-cyan-400 text-black font-bold rounded-xl
            active:transform active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(103,232,249,0.3)] mt-6 text-sm"
          >
            Sign In to {role === UserRole.STAFF ? 'Faculty' : role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()} Portal
          </button>

          <div className="text-center mt-6">
            <p className="text-[10px] text-gray-600">© 2024 Class Advisor Systems. All rights reserved.</p>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Login;
