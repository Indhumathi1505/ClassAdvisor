package com.classadvisor.service;

import com.classadvisor.dto.AppStateDTO;
import com.classadvisor.entity.*;
import com.classadvisor.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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

    public AppStateDTO getAllData() {
        AppStateDTO dto = new AppStateDTO();
        dto.setStudents(studentRepository.findAll());
        dto.setSubjects(subjectRepository.findAll());
        dto.setMarks(markRecordRepository.findAll());
        dto.setLabMarks(labMarkRecordRepository.findAll());
        dto.setAttendance(attendanceRecordRepository.findAll());
        dto.setMasterAttendance(masterAttendanceRecordRepository.findAll());
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
        return markRecordRepository.save(record);
    }

    public LabMarkRecord saveLabMark(LabMarkRecord record) {
        return labMarkRecordRepository.save(record);
    }

    public AttendanceRecord saveAttendance(AttendanceRecord record) {
        return attendanceRecordRepository.save(record);
    }


    public MasterAttendanceRecord saveMasterAttendance(MasterAttendanceRecord record) {
        return masterAttendanceRecordRepository.save(record);
    }
}
