package com.classadvisor.repository;

import com.classadvisor.entity.MarkRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarkRecordRepository extends JpaRepository<MarkRecord, Long> {
    List<MarkRecord> findByStudentRegNo(String studentRegNo);
    List<MarkRecord> findBySubjectId(String subjectId);
    void deleteByStudentRegNo(String studentRegNo);
    void deleteBySubjectId(String subjectId);
}
