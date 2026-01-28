package com.classadvisor.repository;

import com.classadvisor.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByStudentRegNo(String studentRegNo);
    List<AttendanceRecord> findBySubjectId(String subjectId);
    Optional<AttendanceRecord> findByStudentRegNoAndSubjectIdAndSemesterIdAndInternalId(String studentRegNo, String subjectId, Integer semesterId, Integer internalId);
    void deleteByStudentRegNo(String studentRegNo);
    void deleteBySubjectId(String subjectId);
}
