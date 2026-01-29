
export enum UserRole {
  STUDENT = 'STUDENT',
  ADVISOR = 'ADVISOR',
  STAFF = 'STAFF'
}

export interface Student {
  registerNumber: string;
  rollNumber: string;
  name: string;
  parentWhatsApp: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  semesterId: number;
  assignedStaff: string; // Staff Name
  staffPassword: string;
}

export interface MarkRecord {
  studentRegNo: string;
  subjectId: string;
  semesterId: number;
  internalId: number; // 1 or 2
  marks: number;
}

export interface LabMarkRecord {
  studentRegNo: string;
  subjectId: string;
  semesterId: number;
  internalId: number;
  marks: number;
}

export interface AttendanceRecord {
  studentRegNo: string;
  subjectId: string;
  semesterId: number;
  internalId: number;
  percentage: number;
}

// Advisor uploaded master attendance for an entire internal period
export interface MasterAttendanceRecord {
  studentRegNo: string;
  semesterId: number;
  internalId: number;
  percentage: number;
}

export interface SemesterGrade {
  id?: number;
  studentRegNo: string;
  semesterId: number;
  results: string; // JSON string
  pdfPath?: string;
}

export interface Staff {
  id?: number;
  name: string;
  semesterId: number;
  subjectCode: string;
  subjectName: string;
}

export interface AppState {
  students: Student[];
  subjects: Subject[];
  marks: MarkRecord[];
  labMarks: LabMarkRecord[];
  attendance: AttendanceRecord[];
  masterAttendance: MasterAttendanceRecord[];
  semesterGrades: SemesterGrade[];
  staff: Staff[];
  config: {
    years: number;
    semesters: number;
    internalsPerSem: number;
  };
}
