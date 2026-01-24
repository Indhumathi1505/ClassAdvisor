
import React, { useState, useEffect } from 'react';
import { UserRole, AppState, Student, Subject, MarkRecord, AttendanceRecord } from './types';
import Login from './components/Login';
import AdvisorDashboard from './components/AdvisorDashboard';
import StaffDashboard from './components/StaffDashboard';
import StudentDashboard from './components/StudentDashboard';
import { LogOut, GraduationCap, LayoutDashboard } from 'lucide-react';

import { api } from './api.ts';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; identifier: string; data?: any } | null>(null);
  const [state, setState] = useState<AppState>({
    students: [],
    subjects: [],
    marks: [],
    labMarks: [],
    attendance: [],
    masterAttendance: [],
    config: {
      years: 4,
      semesters: 8,
      internalsPerSem: 2
    }
  });

  useEffect(() => {
    api.getState()
      .then(data => setState(data))
      .catch(err => console.error("Failed to load state from backend", err));
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const updateState = (newState: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const renderContent = () => {
    if (!currentUser) {
      return <Login state={state} onLogin={setCurrentUser} />;
    }

    switch (currentUser.role) {
      case UserRole.ADVISOR:
        return <AdvisorDashboard state={state} updateState={updateState} onLogout={handleLogout} />;
      case UserRole.STAFF:
        return <StaffDashboard state={state} updateState={updateState} staffName={currentUser.identifier} onLogout={handleLogout} />;
      case UserRole.STUDENT:
        return <StudentDashboard state={state} studentRegNo={currentUser.identifier} onLogout={handleLogout} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-indigo-700 text-white px-6 py-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Class Advisor Pro</h1>
        </div>

        {currentUser && (
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="opacity-70">Logged in as:</span>
              <span className="ml-1 font-semibold">{currentUser.identifier} ({currentUser.role})</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-md transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </nav>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        {renderContent()}
      </main>

      <footer className="bg-white border-t py-4 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Class Advisor Management System. Designed for Excellence.
      </footer>
    </div>
  );
};

export default App;
