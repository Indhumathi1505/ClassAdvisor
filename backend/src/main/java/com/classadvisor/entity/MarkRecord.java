package com.classadvisor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "mark_records", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"studentRegNo", "subjectId", "semesterId", "internalId"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarkRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String studentRegNo;
    private String subjectId;
    private Integer semesterId;
    private Integer internalId;
    private Double marks;
}
