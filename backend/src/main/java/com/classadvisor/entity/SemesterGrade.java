package com.classadvisor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "semester_grades")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SemesterGrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String studentRegNo;
    private Integer semesterId;

    @Column(columnDefinition = "TEXT")
    private String results; // JSON representation of { subjectCode: grade }

    private String pdfPath;
}
