package com.classadvisor.repository;

import com.classadvisor.entity.LabMarkRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LabMarkRecordRepository extends JpaRepository<LabMarkRecord, Long> {
    List<LabMarkRecord> findByStudentRegNo(String studentRegNo);
    List<LabMarkRecord> findBySubjectId(String subjectId);
    void deleteByStudentRegNo(String studentRegNo);
    void deleteBySubjectId(String subjectId);
}
