package com.classadvisor.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "lab_mark_records", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"studentRegNo", "subjectId", "semesterId", "internalId"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LabMarkRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String studentRegNo;
    private String subjectId;
    private Integer semesterId;
    private Integer internalId;
    
    @Min(value = 0, message = "Lab marks must be at least 0")
    @Max(value = 100, message = "Lab marks must not exceed 100")
    private Double marks;
}
