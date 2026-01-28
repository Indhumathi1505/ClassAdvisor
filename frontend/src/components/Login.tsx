import React, { useState } from 'react';
import { UserRole, AppState } from '../types';
import { User, Lock, ShieldCheck, BookOpen, Hash, Layers } from 'lucide-react';

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

  const [error, setError] = useState('');

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
    <div className="max-w-md mx-auto mt-12 mb-12">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* HEADER */}
        <div className="bg-gradient-to-br from-brand-primary to-brand-secondary p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold">Academic Portal</h2>
          <p className="opacity-80">Secure Login for Students & Faculty</p>
        </div>

        <div className="p-8">

          {/* ROLE SWITCH */}
          <div className="flex gap-2 p-1 bg-brand-primary rounded-lg mb-8">
            <button
              onClick={() => { setRole(UserRole.STUDENT); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${role === UserRole.STUDENT
                ? 'bg-white shadow text-brand-primary'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              STUDENT
            </button>

            <button
              onClick={() => { setRole(UserRole.STAFF); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${role === UserRole.STAFF
                ? 'bg-white shadow text-brand-primary'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              STAFF
            </button>

            <button
              onClick={() => { setRole(UserRole.ADVISOR); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${role === UserRole.ADVISOR
                ? 'bg-white shadow text-brand-primary'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              ADVISOR
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {role !== UserRole.STAFF && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    {role === UserRole.STUDENT
                      ? 'Register Number'
                      : 'Advisor Username'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg
                      focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
                      outline-none transition-all text-sm"
                      placeholder={role === UserRole.STUDENT ? "Enter Reg No" : "Enter Name"}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    {role === UserRole.STUDENT ? 'Roll Number' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg
                      focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
                      outline-none transition-all text-sm"
                      placeholder="Enter password"
                    />
                  </div>
                </div>
              </>
            )}

            {role === UserRole.STAFF && (
              <div className="space-y-4 pt-2 border-t mt-4">
                

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Staff Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <select
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg
                      focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
                      outline-none transition-all text-sm appearance-none bg-white"
                    >
                      <option value="">Select Staff Name</option>
                      <option value="vasuki">Vasuki</option>
                      <option value="kalaivani s">Kalaivani S</option>
                      <option value="gv">GV</option>
                      <option value="rss">RSS</option>
                      <option value="rk">RK</option>
                      <option value="viji">Viji</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Semester
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg
                      focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
                      outline-none transition-all text-sm appearance-none bg-white"
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
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Select Subject
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <select
                      value={`${subjectCode}-${subjectName}`}
                      onChange={(e) => {
                        const [code, ...nameParts] = e.target.value.split('-');
                        setSubjectCode(code.trim());
                        setSubjectName(nameParts.join('-').trim());
                      }}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg
                      focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
                      outline-none transition-all text-sm appearance-none bg-white"
                    >
                      <option value="-">Select Subject</option>
                      <option value="cs3451-os">CS3451 - OS</option>
                      <option value="cs3452-toc">CS3452 - TOC</option>
                      <option value="ge3451-ess">GE3451 - ESS</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-brand-primary text-xs bg-red-50 p-3 rounded-lg border border-red-100 font-medium leading-tight">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-brand-primary text-white font-bold rounded-lg
              hover:bg-brand-secondary active:transform active:scale-[0.98]
              transition-all shadow-lg mt-4"
            >
              SIGN IN
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
