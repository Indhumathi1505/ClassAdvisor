package com.classadvisor.service;

import com.classadvisor.dto.AppStateDTO;
import com.classadvisor.entity.*;
import com.classadvisor.repository.*;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.Loader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DataService {

    @Autowired
    private StudentRepository studentRepository;
    @Autowired
    private SubjectRepository subjectRepository;
    @Autowired
    private MarkRecordRepository markRecordRepository;
    @Autowired
    private LabMarkRecordRepository labMarkRecordRepository;
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    @Autowired
    private MasterAttendanceRecordRepository masterAttendanceRecordRepository;
    @Autowired
    private SemesterGradeRepository semesterGradeRepository;

    public AppStateDTO getAllData() {
        AppStateDTO dto = new AppStateDTO();
        dto.setStudents(studentRepository.findAll());
        dto.setSubjects(subjectRepository.findAll());
        dto.setMarks(markRecordRepository.findAll());
        dto.setLabMarks(labMarkRecordRepository.findAll());
        dto.setAttendance(attendanceRecordRepository.findAll());
        dto.setMasterAttendance(masterAttendanceRecordRepository.findAll());
        dto.setSemesterGrades(semesterGradeRepository.findAll());
        dto.setConfig(new AppStateDTO.ConfigDTO()); // Default config for now
        return dto;
    }

    // Individual CRUD Operations

    public Student saveStudent(Student student) {
        return studentRepository.save(student);
    }

    @Transactional
    public void deleteStudent(String regNo) {
        // Cascade delete logical associations
        markRecordRepository.deleteByStudentRegNo(regNo);
        labMarkRecordRepository.deleteByStudentRegNo(regNo);
        attendanceRecordRepository.deleteByStudentRegNo(regNo);
        masterAttendanceRecordRepository.deleteByStudentRegNo(regNo);
        studentRepository.deleteById(regNo);
    }

    public Subject saveSubject(Subject subject) {
        return subjectRepository.save(subject);
    }

    @Transactional
    public void deleteSubject(String subjectId) {
        markRecordRepository.deleteBySubjectId(subjectId);
        labMarkRecordRepository.deleteBySubjectId(subjectId);
        attendanceRecordRepository.deleteBySubjectId(subjectId);
        subjectRepository.deleteById(subjectId);
    }

    public MarkRecord saveMark(MarkRecord record) {
        if (record.getMarks() != null && (record.getMarks() < 0 || record.getMarks() > 100)) {
            throw new IllegalArgumentException("Marks must be between 0 and 100");
        }
        Optional<MarkRecord> existing = markRecordRepository.findByStudentRegNoAndSubjectIdAndSemesterIdAndInternalId(
                record.getStudentRegNo(), record.getSubjectId(), record.getSemesterId(), record.getInternalId());
        if (existing.isPresent()) {
            MarkRecord toUpdate = existing.get();
            toUpdate.setMarks(record.getMarks());
            return markRecordRepository.save(toUpdate);
        }
        return markRecordRepository.save(record);
    }

    public LabMarkRecord saveLabMark(LabMarkRecord record) {
        if (record.getMarks() != null && (record.getMarks() < 0 || record.getMarks() > 100)) {
            throw new IllegalArgumentException("Lab marks must be between 0 and 100");
        }
        Optional<LabMarkRecord> existing = labMarkRecordRepository.findByStudentRegNoAndSubjectIdAndSemesterIdAndInternalId(
                record.getStudentRegNo(), record.getSubjectId(), record.getSemesterId(), record.getInternalId());
        if (existing.isPresent()) {
            LabMarkRecord toUpdate = existing.get();
            toUpdate.setMarks(record.getMarks());
            return labMarkRecordRepository.save(toUpdate);
        }
        return labMarkRecordRepository.save(record);
    }

    public AttendanceRecord saveAttendance(AttendanceRecord record) {
        if (record.getPercentage() != null && (record.getPercentage() < 0 || record.getPercentage() > 100)) {
            throw new IllegalArgumentException("Attendance percentage must be between 0 and 100");
        }
        Optional<AttendanceRecord> existing = attendanceRecordRepository.findByStudentRegNoAndSubjectIdAndSemesterIdAndInternalId(
                record.getStudentRegNo(), record.getSubjectId(), record.getSemesterId(), record.getInternalId());
        if (existing.isPresent()) {
            AttendanceRecord toUpdate = existing.get();
            toUpdate.setPercentage(record.getPercentage());
            return attendanceRecordRepository.save(toUpdate);
        }
        return attendanceRecordRepository.save(record);
    }


    public MasterAttendanceRecord saveMasterAttendance(MasterAttendanceRecord record) {
        if (record.getPercentage() != null && (record.getPercentage() < 0 || record.getPercentage() > 100)) {
            throw new IllegalArgumentException("Master attendance percentage must be between 0 and 100");
        }
        Optional<MasterAttendanceRecord> existing = masterAttendanceRecordRepository.findByStudentRegNoAndSemesterIdAndInternalId(
                record.getStudentRegNo(), record.getSemesterId(), record.getInternalId());
        if (existing.isPresent()) {
            MasterAttendanceRecord toUpdate = existing.get();
            toUpdate.setPercentage(record.getPercentage());
            return masterAttendanceRecordRepository.save(toUpdate);
        }
        return masterAttendanceRecordRepository.save(record);
    }

    @Transactional
    public List<SemesterGrade> processSemesterGradePDF(MultipartFile file, Integer semesterId) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            // Patterns
            Pattern regNoPattern = Pattern.compile("(?<!\\d)(\\d{12})(?!\\d)");
            Pattern subjectCodePattern = Pattern.compile("\\b([A-Z]{2,5}\\d{3,5})\\b");
            Pattern gradePattern = Pattern.compile("(?<![A-Z0-9])(O|A\\+?|B\\+?|C|U|UA)(?![A-Z0-9\\+])");

            String[] lines = text.split("\\r?\\n");
            List<String> headerSubjectCodes = new ArrayList<>();
            
            // Pass 1: Identify Subject Codes from Header
            for (String line : lines) {
                if (line.toLowerCase().contains("subject code") || line.toLowerCase().contains("sub.code") || line.contains("Code/Name")) {
                    Matcher m = subjectCodePattern.matcher(line);
                    while (m.find()) {
                        headerSubjectCodes.add(m.group(1));
                    }
                    if (!headerSubjectCodes.isEmpty()) break;
                }
            }

            // Pass 2: Extract grades aligned with subject codes
            for (String line : lines) {
                Matcher regMatcher = regNoPattern.matcher(line);
                if (regMatcher.find()) {
                    String regNo = regMatcher.group(1);
                    String remainder = line.substring(regMatcher.end());
                    
                    // If we found header codes, map by index
                    if (!headerSubjectCodes.isEmpty()) {
                        Matcher gm = gradePattern.matcher(remainder);
                        List<String> grades = new ArrayList<>();
                        while (gm.find()) {
                            grades.add(gm.group(1));
                        }
                        
                        if (!grades.isEmpty()) {
                            StringBuilder resultsJson = new StringBuilder("{");
                            for (int i = 0; i < Math.min(headerSubjectCodes.size(), grades.size()); i++) {
                                if (i > 0) resultsJson.append(",");
                                resultsJson.append("\"").append(headerSubjectCodes.get(i)).append("\":\"").append(grades.get(i)).append("\"");
                            }
                            saveSemesterGrade(regNo, semesterId, resultsJson);
                        }
                    } else {
                        // Fallback to key-value pairs if found in same line
                        StringBuilder resultsJson = new StringBuilder("{");
                        Pattern kvPattern = Pattern.compile("([A-Z]{2,5}\\d{3,5})\\s*[:\\-\\s]?\\s*(O|A\\+?|B\\+?|C|U|UA)");
                        Matcher kvm = kvPattern.matcher(line);
                        boolean found = false;
                        while(kvm.find()) {
                            if (found) resultsJson.append(",");
                            resultsJson.append("\"").append(kvm.group(1)).append("\":\"").append(kvm.group(2)).append("\"");
                            found = true;
                        }
                        if (found) {
                            saveSemesterGrade(regNo, semesterId, resultsJson);
                        }
                    }
                }
            }
        }
        return semesterGradeRepository.findAll();
    }

    private void saveSemesterGrade(String regNo, Integer semesterId, StringBuilder resultsJson) {
        resultsJson.append("}");
        if (!studentRepository.existsById(regNo)) {
            return; // Skip if student doesn't exist or log error
        }
        
        SemesterGrade grade = semesterGradeRepository.findByStudentRegNoAndSemesterId(regNo, semesterId)
                .orElse(new SemesterGrade());
        grade.setStudentRegNo(regNo);
        grade.setSemesterId(semesterId);
        grade.setResults(resultsJson.toString());
        semesterGradeRepository.save(grade);
    }

    public List<SemesterGrade> getStudentGrades(String regNo) {
        return semesterGradeRepository.findByStudentRegNo(regNo);
    }
}
