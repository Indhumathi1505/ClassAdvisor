package com.classadvisor.controller;

import com.classadvisor.dto.AppStateDTO;
import com.classadvisor.entity.*;
import com.classadvisor.service.DataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(originPatterns = "*")
public class ApiController {

    @Autowired
    private DataService dataService;

    @GetMapping("/state")
    public AppStateDTO getFullState() {
        return dataService.getAllData();
    }

    @PostMapping("/students")
    public Student addStudent(@RequestBody Student student) {
        return dataService.saveStudent(student);
    }

    @DeleteMapping("/students/{regNo}")
    public void deleteStudent(@PathVariable String regNo) {
        dataService.deleteStudent(regNo);
    }

    @PostMapping("/subjects")
    public Subject addSubject(@RequestBody Subject subject) {
        return dataService.saveSubject(subject);
    }

    @DeleteMapping("/subjects/{id}")
    public void deleteSubject(@PathVariable String id) {
        dataService.deleteSubject(id);
    }

    @PostMapping("/marks")
    public MarkRecord saveMark(@RequestBody MarkRecord record) {
        return dataService.saveMark(record);
    }

    @PostMapping("/lab-marks")
    public LabMarkRecord saveLabMark(@RequestBody LabMarkRecord record) {
        return dataService.saveLabMark(record);
    }

    @PostMapping("/attendance")
    public AttendanceRecord saveAttendance(@RequestBody AttendanceRecord record) {
        return dataService.saveAttendance(record);
    }

    
    @PostMapping("/master-attendance")
    public MasterAttendanceRecord saveMasterAttendance(@RequestBody MasterAttendanceRecord record) {
        return dataService.saveMasterAttendance(record);
    }

    @PostMapping("/upload-grades")
    public List<SemesterGrade> uploadGrades(@RequestParam("file") MultipartFile file, @RequestParam("semesterId") Integer semesterId) throws IOException {
        return dataService.processSemesterGradePDF(file, semesterId);
    }
    
    @PostMapping("/convert-pdf-to-csv")
    public org.springframework.http.ResponseEntity<String> convertPdfToCsv(@RequestParam("file") MultipartFile file, @RequestParam("semesterId") Integer semesterId) throws IOException {
        String csvContent = dataService.convertPdfToCsv(file, semesterId);
        return org.springframework.http.ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"converted_grades_sem" + semesterId + ".csv\"")
                .header("Content-Type", "text/csv")
                .body(csvContent);
    }

    @PostMapping("/upload-grades-csv")
    public List<SemesterGrade> uploadGradesCsv(@RequestParam("file") MultipartFile file, @RequestParam("semesterId") Integer semesterId) throws IOException {
        return dataService.processCsvGradeSheet(file, semesterId);
    }

    @GetMapping("/my-grades/{regNo}")
    public List<SemesterGrade> getMyGrades(@PathVariable String regNo) {
        return dataService.getStudentGrades(regNo);
    }

    @GetMapping("/export-grades-excel")
    public org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> exportGradesExcel() throws IOException {
        java.io.ByteArrayInputStream stream = dataService.exportConsolidatedExcel();
        org.springframework.core.io.InputStreamResource file = new org.springframework.core.io.InputStreamResource(stream);

        return org.springframework.http.ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Semester_Grades_Consolidated.xlsx")
                .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(file);
    }

    // Staff Management Endpoints
    @GetMapping("/staff")
    public List<Staff> getAllStaff() {
        return dataService.getAllStaff();
    }

    @PostMapping("/staff")
    public Staff addStaff(@RequestBody Staff staff) {
        return dataService.saveStaff(staff);
    }

    @DeleteMapping("/staff/{id}")
    public void deleteStaff(@PathVariable Long id) {
        dataService.deleteStaff(id);
    }
}
