package com.classadvisor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "master_attendance_records", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"studentRegNo", "semesterId", "internalId"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MasterAttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String studentRegNo;
    private Integer semesterId;
    private Integer internalId;
    private Double percentage;
}
