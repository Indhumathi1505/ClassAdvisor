package com.classadvisor.repository;

import com.classadvisor.entity.SemesterGrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SemesterGradeRepository extends JpaRepository<SemesterGrade, Long> {
    Optional<SemesterGrade> findByStudentRegNoAndSemesterId(String studentRegNo, Integer semesterId);
    List<SemesterGrade> findByStudentRegNo(String studentRegNo);
}
