package com.classadvisor.repository;

import com.classadvisor.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByStudentRegNo(String studentRegNo);
    List<AttendanceRecord> findBySubjectId(String subjectId);
    void deleteByStudentRegNo(String studentRegNo);
    void deleteBySubjectId(String subjectId);
}
