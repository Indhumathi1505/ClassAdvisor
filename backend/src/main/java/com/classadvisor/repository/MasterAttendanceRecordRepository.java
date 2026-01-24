package com.classadvisor.repository;

import com.classadvisor.entity.MasterAttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MasterAttendanceRecordRepository extends JpaRepository<MasterAttendanceRecord, Long> {
    List<MasterAttendanceRecord> findByStudentRegNo(String studentRegNo);
    void deleteByStudentRegNo(String studentRegNo);
}
