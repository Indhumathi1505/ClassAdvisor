package com.classadvisor.controller;

import com.classadvisor.dto.AppStateDTO;
import com.classadvisor.entity.*;
import com.classadvisor.service.DataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

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
}
