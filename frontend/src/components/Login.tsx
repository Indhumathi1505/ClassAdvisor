
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
  
  // Additional fields for Staff Login
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
      const student = state.students.find(s => s.registerNumber === username && s.rollNumber === password);
      if (student) {
        onLogin({ role: UserRole.STUDENT, identifier: student.registerNumber, data: student });
      } else {
        setError('Invalid Student Credentials. Use Register No / Roll No.');
      }
    } else if (role === UserRole.STAFF) {
      // Staff login requires matching Name, Password, Semester, Subject Name, and Subject Code
      const subject = state.subjects.find(s => 
        s.assignedStaff.toLowerCase() === username.toLowerCase() && 
        s.staffPassword === password &&
        s.semesterId === parseInt(semester) &&
        s.name.toLowerCase() === subjectName.toLowerCase() &&
        s.code.toLowerCase() === subjectCode.toLowerCase()
      );

      if (subject) {
        onLogin({ role: UserRole.STAFF, identifier: username });
      } else {
        setError('Authentication failed. Please ensure Staff Name, Password, Semester, Subject Name, and Subject Code match the records created by the Advisor.');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 mb-12">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold">Academic Portal</h2>
          <p className="opacity-80">Secure Login for Students & Faculty</p>
        </div>

        <div className="p-8">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-8">
            <button 
              onClick={() => { setRole(UserRole.STUDENT); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${role === UserRole.STUDENT ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              STUDENT
            </button>
            <button 
              onClick={() => { setRole(UserRole.STAFF); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${role === UserRole.STAFF ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              STAFF
            </button>
            <button 
              onClick={() => { setRole(UserRole.ADVISOR); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${role === UserRole.ADVISOR ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ADVISOR
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {role === UserRole.STUDENT ? 'Register Number' : (role === UserRole.STAFF ? 'Staff Name' : 'Advisor Username')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  placeholder="Enter password"
                />
              </div>
            </div>

            {role === UserRole.STAFF && (
              <div className="space-y-4 pt-2 border-t mt-4">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Additional Credentials Required</p>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Semester</label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <select 
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm appearance-none bg-white"
                    >
                      {[...Array(8)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject Name</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      required
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                      placeholder="Enter Subject Name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject Code</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      required
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                      placeholder="Enter Subject Code"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded-lg border border-red-100 font-medium leading-tight">{error}</p>}

            <button 
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 active:transform active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 mt-4"
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
