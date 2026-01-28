const API_BASE_URL = '/api';

import { AppState, Student, Subject, MarkRecord, LabMarkRecord, MasterAttendanceRecord, AttendanceRecord, SemesterGrade } from './types';

export const api = {
  // Fetch entire state
  getState: async (): Promise<AppState> => {
    const response = await fetch(`${API_BASE_URL}/state`);
    if (!response.ok) throw new Error('Failed to fetch state');
    return response.json();
  },

  // Students
  addStudent: async (student: Student): Promise<Student> => {
    const response = await fetch(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    if (!response.ok) throw new Error('Failed to add student');
    return response.json();
  },

  deleteStudent: async (regNo: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/students/${regNo}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete student');
  },

  // Subjects
  addSubject: async (subject: Subject): Promise<Subject> => {
    const response = await fetch(`${API_BASE_URL}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subject),
    });
    if (!response.ok) throw new Error('Failed to add subject');
    return response.json();
  },

  deleteSubject: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete subject');
  },

  // Marks & Attendance
  saveMark: async (record: MarkRecord): Promise<MarkRecord> => {
    const response = await fetch(`${API_BASE_URL}/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error('Failed to save mark');
    return response.json();
  },

  saveLabMark: async (record: LabMarkRecord): Promise<LabMarkRecord> => {
    const response = await fetch(`${API_BASE_URL}/lab-marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error('Failed to save lab mark');
    return response.json();
  },

  saveAttendance: async (record: AttendanceRecord): Promise<AttendanceRecord> => {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error('Failed to save attendance');
    return response.json();
  },

  saveMasterAttendance: async (record: MasterAttendanceRecord): Promise<MasterAttendanceRecord> => {
    const response = await fetch(`${API_BASE_URL}/master-attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error('Failed to save attendance');
    return response.json();
  },

  uploadGrades: async (file: File, semesterId: number): Promise<SemesterGrade[]> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('semesterId', semesterId.toString());

    const response = await fetch(`${API_BASE_URL}/upload-grades`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload grades');
    return response.json();
  },

  fetchMyGrades: async (regNo: string): Promise<SemesterGrade[]> => {
    const response = await fetch(`${API_BASE_URL}/my-grades/${regNo}`);
    if (!response.ok) throw new Error('Failed to fetch student grades');
    return response.json();
  }
};
