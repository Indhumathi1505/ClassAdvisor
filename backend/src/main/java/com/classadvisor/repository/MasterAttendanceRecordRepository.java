package com.classadvisor.repository;

import com.classadvisor.entity.MasterAttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.Optional;

@Repository
public interface MasterAttendanceRecordRepository extends JpaRepository<MasterAttendanceRecord, Long> {
    List<MasterAttendanceRecord> findByStudentRegNo(String studentRegNo);
    Optional<MasterAttendanceRecord> findByStudentRegNoAndSemesterIdAndInternalId(String studentRegNo, Integer semesterId, Integer internalId);
    void deleteByStudentRegNo(String studentRegNo);
}
