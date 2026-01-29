package com.classadvisor.dto;

import com.classadvisor.entity.*;
import lombok.Data;
import java.util.List;

@Data
public class AppStateDTO {
    private List<Student> students;
    private List<Subject> subjects;
    private List<MarkRecord> marks;
    private List<LabMarkRecord> labMarks;
    private List<AttendanceRecord> attendance;
    private List<MasterAttendanceRecord> masterAttendance;
    private List<SemesterGrade> semesterGrades;
    private List<Staff> staff;
    private ConfigDTO config;

    @Data
    public static class ConfigDTO {
        private int years = 4;
        private int semesters = 8;
        private int internalsPerSem = 2;
    }
}
