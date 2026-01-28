package com.classadvisor.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
    
    @Min(value = 0, message = "Master attendance percentage must be at least 0")
    @Max(value = 100, message = "Master attendance percentage must not exceed 100")
    private Double percentage;
}
