package com.classadvisor.repository;

import com.classadvisor.entity.LabMarkRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.Optional;

@Repository
public interface LabMarkRecordRepository extends JpaRepository<LabMarkRecord, Long> {
    List<LabMarkRecord> findByStudentRegNo(String studentRegNo);
    List<LabMarkRecord> findBySubjectId(String subjectId);
    Optional<LabMarkRecord> findByStudentRegNoAndSubjectIdAndSemesterIdAndInternalId(String studentRegNo, String subjectId, Integer semesterId, Integer internalId);
    void deleteByStudentRegNo(String studentRegNo);
    void deleteBySubjectId(String subjectId);
}
