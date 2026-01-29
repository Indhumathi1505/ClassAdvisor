package com.classadvisor.service;

import com.classadvisor.dto.AppStateDTO;
import com.classadvisor.entity.*;
import com.classadvisor.repository.*;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.Loader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

@Service
public class DataService {

    @Autowired
    private StudentRepository studentRepository;
    @Autowired
    private SubjectRepository subjectRepository;
    @Autowired
    private MarkRecordRepository markRecordRepository;
    @Autowired
    private LabMarkRecordRepository labMarkRecordRepository;
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    @Autowired
    private MasterAttendanceRecordRepository masterAttendanceRecordRepository;
    @Autowired
    private SemesterGradeRepository semesterGradeRepository;
    @Autowired
    private StaffRepository staffRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public AppStateDTO getAllData() {
        AppStateDTO dto = new AppStateDTO();
        dto.setStudents(studentRepository.findAll());
        dto.setSubjects(subjectRepository.findAll());
        dto.setMarks(markRecordRepository.findAll());
        dto.setLabMarks(labMarkRecordRepository.findAll());
        dto.setAttendance(attendanceRecordRepository.findAll());
        dto.setMasterAttendance(masterAttendanceRecordRepository.findAll());
        dto.setSemesterGrades(semesterGradeRepository.findAll());
        dto.setStaff(staffRepository.findAll());
        dto.setConfig(new AppStateDTO.ConfigDTO()); // Default config for now
        return dto;
    }

    // Individual CRUD Operations

    public Student saveStudent(Student student) {
        return studentRepository.save(student);
    }

    @Transactional
    public void deleteStudent(String regNo) {
        // Cascade delete logical associations
        markRecordRepository.deleteByStudentRegNo(regNo);
        labMarkRecordRepository.deleteByStudentRegNo(regNo);
        attendanceRecordRepository.deleteByStudentRegNo(regNo);
        masterAttendanceRecordRepository.deleteByStudentRegNo(regNo);
        studentRepository.deleteById(regNo);
    }

    public Subject saveSubject(Subject subject) {
        return subjectRepository.save(subject);
    }

    @Transactional
    public void deleteSubject(String subjectId) {
        markRecordRepository.deleteBySubjectId(subjectId);
        labMarkRecordRepository.deleteBySubjectId(subjectId);
        attendanceRecordRepository.deleteBySubjectId(subjectId);
        subjectRepository.deleteById(subjectId);
    }

    public MarkRecord saveMark(MarkRecord record) {
        if (record.getMarks() != null && (record.getMarks() < 0 || record.getMarks() > 100)) {
            throw new IllegalArgumentException("Marks must be between 0 and 100");
        }
        Optional<MarkRecord> existing = markRecordRepository.findByStudentRegNoAndSubjectIdAndSemesterIdAndInternalId(
                record.getStudentRegNo(), record.getSubjectId(), record.getSemesterId(), record.getInternalId());
        if (existing.isPresent()) {
            MarkRecord toUpdate = existing.get();
            toUpdate.setMarks(record.getMarks());
            return markRecordRepository.save(toUpdate);
        }
        return markRecordRepository.save(record);
    }

    public LabMarkRecord saveLabMark(LabMarkRecord record) {
        if (record.getMarks() != null && (record.getMarks() < 0 || record.getMarks() > 100)) {
            throw new IllegalArgumentException("Lab marks must be between 0 and 100");
        }
        Optional<LabMarkRecord> existing = labMarkRecordRepository.findByStudentRegNoAndSubjectIdAndSemesterIdAndInternalId(
                record.getStudentRegNo(), record.getSubjectId(), record.getSemesterId(), record.getInternalId());
        if (existing.isPresent()) {
            LabMarkRecord toUpdate = existing.get();
            toUpdate.setMarks(record.getMarks());
            return labMarkRecordRepository.save(toUpdate);
        }
        return labMarkRecordRepository.save(record);
    }

    public AttendanceRecord saveAttendance(AttendanceRecord record) {
        if (record.getPercentage() != null && (record.getPercentage() < 0 || record.getPercentage() > 100)) {
            throw new IllegalArgumentException("Attendance percentage must be between 0 and 100");
        }
        Optional<AttendanceRecord> existing = attendanceRecordRepository.findByStudentRegNoAndSubjectIdAndSemesterIdAndInternalId(
                record.getStudentRegNo(), record.getSubjectId(), record.getSemesterId(), record.getInternalId());
        if (existing.isPresent()) {
            AttendanceRecord toUpdate = existing.get();
            toUpdate.setPercentage(record.getPercentage());
            return attendanceRecordRepository.save(toUpdate);
        }
        return attendanceRecordRepository.save(record);
    }


    public MasterAttendanceRecord saveMasterAttendance(MasterAttendanceRecord record) {
        if (record.getPercentage() != null && (record.getPercentage() < 0 || record.getPercentage() > 100)) {
            throw new IllegalArgumentException("Master attendance percentage must be between 0 and 100");
        }
        Optional<MasterAttendanceRecord> existing = masterAttendanceRecordRepository.findByStudentRegNoAndSemesterIdAndInternalId(
                record.getStudentRegNo(), record.getSemesterId(), record.getInternalId());
        if (existing.isPresent()) {
            MasterAttendanceRecord toUpdate = existing.get();
            toUpdate.setPercentage(record.getPercentage());
            return masterAttendanceRecordRepository.save(toUpdate);
        }
        return masterAttendanceRecordRepository.save(record);
    }

    @Transactional
    public List<SemesterGrade> processSemesterGradePDF(MultipartFile file, Integer semesterId) throws IOException {
        System.out.println("Processing PDF for Semester: " + semesterId);
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);

            Pattern regNoPattern = Pattern.compile("(?<!\\d)(\\d{12})(?!\\d)");
            Pattern subjectCodePattern = Pattern.compile("\\b([A-Z]{2,5}\\d{3,5})\\b");
            Pattern gradePattern = Pattern.compile("^(O|A\\+?|B\\+?|C|U|UA|W|I|RA|WH.*|SA|AB)$");
            Pattern semPattern = Pattern.compile("Semester No\\s*[:\\.]\\s*(\\d+)", Pattern.CASE_INSENSITIVE);

            String fullText = stripper.getText(document);
            String[] lines = fullText.split("\\r?\\n");

            Integer detectedSem = null;
            Matcher semMatcher = semPattern.matcher(fullText);
            if (semMatcher.find()) {
                detectedSem = Integer.parseInt(semMatcher.group(1));
            }
            final Integer finalSem = (semesterId != null) ? semesterId : (detectedSem != null ? detectedSem : 1);

            List<String> headerSubjectCodes = new ArrayList<>();
            
            for (String line : lines) {
                if (!regNoPattern.matcher(line).find()) {
                    Matcher mHead = subjectCodePattern.matcher(line);
                    List<String> foundCodes = new ArrayList<>();
                    while (mHead.find()) {
                        foundCodes.add(mHead.group(1));
                    }
                    if (foundCodes.size() >= 3) {
                        headerSubjectCodes = foundCodes;
                        System.out.println("Header Detected with Codes: " + headerSubjectCodes);
                    }
                }

                Matcher regMatcher = regNoPattern.matcher(line);
                if (regMatcher.find()) {
                    String regNo = regMatcher.group(1);
                    String remainder = line.substring(regMatcher.end()).trim();
                    
                    if (!headerSubjectCodes.isEmpty()) {
                        String[] tokens = remainder.split("\\s+");
                        int numSubjects = headerSubjectCodes.size();
                        
                        if (tokens.length >= numSubjects) {
                            Map<String, String> resultsMap = new LinkedHashMap<>();
                            int startTokenIndex = tokens.length - numSubjects;
                            boolean alignmentSeemsValid = true;
                            
                            for (int i = 0; i < numSubjects; i++) {
                                String token = tokens[startTokenIndex + i];
                                if (!gradePattern.matcher(token).matches()) {
                                    if (token.length() > 3 && !token.startsWith("WH")) {
                                         alignmentSeemsValid = false;
                                         break;
                                    }
                                }
                                resultsMap.put(headerSubjectCodes.get(i), token);
                            }
                            
                            if (alignmentSeemsValid) {
                                try {
                                    System.out.println("Saving grades for " + regNo + ": " + resultsMap);
                                    saveSemesterGrade(regNo, finalSem, objectMapper.writeValueAsString(resultsMap));
                                } catch (Exception e) {
                                    System.err.println("Error saving grades for " + regNo + ": " + e.getMessage());
                                }
                            }
                        }
                    } else {
                        Matcher sm = subjectCodePattern.matcher(remainder);
                        if (sm.find()) {
                             String subCode = sm.group(1);
                             String afterSub = remainder.substring(remainder.indexOf(subCode) + subCode.length()).trim();
                             String[] postTokens = afterSub.split("\\s+");
                             if (postTokens.length > 0 && gradePattern.matcher(postTokens[0]).matches()) {
                                 Map<String, String> singleMap = new LinkedHashMap<>();
                                 singleMap.put(subCode, postTokens[0]);
                                 try {
                                     saveSemesterGrade(regNo, finalSem, objectMapper.writeValueAsString(singleMap));
                                 } catch (Exception e) {}
                             }
                        }
                    }
                }
            }
        }
        return semesterGradeRepository.findAll();
    }

    private void saveSemesterGrade(String regNo, Integer semesterId, String resultsJson) {
        Optional<Student> studentOpt = studentRepository.findById(regNo);
        if (studentOpt.isEmpty()) {
            System.out.println("Skipping save: Student not found in DB for Reg No: " + regNo);
            return;
        }
        
        String dbRegNo = studentOpt.get().getRegisterNumber();
        SemesterGrade grade = semesterGradeRepository.findByStudentRegNoAndSemesterId(dbRegNo, semesterId)
                .orElse(new SemesterGrade());
        grade.setStudentRegNo(dbRegNo);
        grade.setSemesterId(semesterId);
        
        try {
            // Use LinkedHashMap to preserve order
            Map<String, String> currentResults = resultsJson == null ? new LinkedHashMap<>() : 
                objectMapper.readValue(resultsJson, new TypeReference<LinkedHashMap<String, String>>() {});
            
            Map<String, String> existingResults = new LinkedHashMap<>();
            if (grade.getResults() != null && !grade.getResults().isEmpty()) {
                existingResults = objectMapper.readValue(grade.getResults(), new TypeReference<LinkedHashMap<String, String>>() {});
            }
            
            existingResults.putAll(currentResults);
            grade.setResults(objectMapper.writeValueAsString(existingResults));
        } catch (Exception e) {
            grade.setResults(resultsJson);
        }
        
        semesterGradeRepository.save(grade);
    }

    public List<SemesterGrade> getStudentGrades(String regNo) {
        return semesterGradeRepository.findByStudentRegNo(regNo);
    }
    // --- PDF to Excel Conversion Logic (No Subject DB Required) ---
    public String convertPdfToCsv(MultipartFile file, Integer semesterId) throws IOException {
        StringBuilder csvOutput = new StringBuilder();
        
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            
            // Try to extract text from all pages
            String fullText = "";
            try {
                fullText = stripper.getText(document);
            } catch (Exception e) {
                System.err.println("Error extracting text with default stripper: " + e.getMessage());
            }
            
            // If no text extracted, try page by page
            if (fullText.trim().isEmpty() && document.getNumberOfPages() > 0) {
                System.out.println("No text with default extraction, trying page-by-page...");
                StringBuilder pageText = new StringBuilder();
                for (int i = 1; i <= document.getNumberOfPages(); i++) {
                    try {
                        stripper.setStartPage(i);
                        stripper.setEndPage(i);
                        String pageContent = stripper.getText(document);
                        pageText.append(pageContent);
                        System.out.println("Page " + i + " extracted " + pageContent.length() + " characters");
                    } catch (Exception e) {
                        System.err.println("Error extracting page " + i + ": " + e.getMessage());
                    }
                }
                fullText = pageText.toString();
            }
            
            System.out.println("Total text extracted: " + fullText.length() + " characters");
            
            String[] lines = fullText.split("\\r?\\n");

            Pattern regNoPattern = Pattern.compile("(?<!\\d)(\\d{12})(?!\\d)");
            // Very flexible pattern: 1-6 uppercase letters followed by 1-6 digits
            // Matches: CS3451, CB3401, MA8402, NM1074, GE3451, OS1234, etc.
            Pattern subjectCodePattern = Pattern.compile("\\b([A-Z]{1,6}\\d{1,6})\\b");
            Pattern gradePattern = Pattern.compile("^(O|A\\+?|B\\+?|C|U|UA|W|I|RA|WH.*|SA|AB)$");

            // Step 1: Find the header line with subject codes
            // Scan more lines (up to 50) to find the table header
            List<String> headerSubjectCodes = new ArrayList<>();
            
            System.out.println("=== Starting PDF Parsing ===");
            System.out.println("Total lines in PDF: " + lines.length);
            
            // Check if PDF is empty or image-based
            if (lines.length == 0 || (lines.length == 1 && lines[0].trim().isEmpty())) {
                System.err.println("ERROR: PDF appears to be empty or image-based (scanned document)");
                System.err.println("Number of pages: " + document.getNumberOfPages());
                return "Error: PDF contains no extractable text. This PDF might be:\n" +
                       "1. A scanned image (not text-based)\n" +
                       "2. Protected or encrypted\n" +
                       "3. Using special encoding\n\n" +
                       "Please try:\n" +
                       "- Using a text-based PDF (not scanned)\n" +
                       "- Converting the PDF using OCR software\n" +
                       "- Downloading the original PDF from the university portal";
            }
            
            for (int lineIdx = 0; lineIdx < Math.min(lines.length, 50); lineIdx++) {
                String line = lines[lineIdx];
                
                // Skip empty lines
                if (line.trim().isEmpty()) {
                    continue;
                }
                
                // Skip lines with registration numbers (data rows)
                if (regNoPattern.matcher(line).find()) {
                    System.out.println("Line " + lineIdx + " contains RegNo, skipping: " + line.substring(0, Math.min(50, line.length())));
                    continue;
                }
                
                // Look for lines with multiple subject codes
                Matcher mHead = subjectCodePattern.matcher(line);
                List<String> foundCodes = new ArrayList<>();
                while (mHead.find()) {
                    String code = mHead.group(1);
                    // Avoid duplicates
                    if (!foundCodes.contains(code)) {
                        foundCodes.add(code);
                    }
                }
                
                if (!foundCodes.isEmpty()) {
                    System.out.println("Line " + lineIdx + " found codes: " + foundCodes + " | Line: " + line.substring(0, Math.min(100, line.length())));
                }
                
                // If we found 3+ subject codes, this is likely the header
                if (foundCodes.size() >= 3) {
                    // If we already have codes, merge them (handles multi-line headers)
                    if (headerSubjectCodes.isEmpty()) {
                        headerSubjectCodes = foundCodes;
                    } else {
                        // Add any new codes not already in the list
                        for (String code : foundCodes) {
                            if (!headerSubjectCodes.contains(code)) {
                                headerSubjectCodes.add(code);
                            }
                        }
                    }
                    System.out.println(">>> Found subject codes in line " + lineIdx + ": " + foundCodes);
                }
            }

            if (headerSubjectCodes.isEmpty()) {
                System.err.println("ERROR: No subject codes detected!");
                System.err.println("First 10 lines of PDF:");
                for (int i = 0; i < Math.min(10, lines.length); i++) {
                    System.err.println("Line " + i + ": " + lines[i]);
                }
                return "Error: Could not detect subject codes in PDF header. Please ensure PDF has a header row with subject codes like CS3451, MA3451, CB3401, etc.";
            }

            System.out.println("=== Final detected subject codes: " + headerSubjectCodes + " ===");

            // Step 2: Build CSV Header
            csvOutput.append("Register Number,Student Name");
            for (String code : headerSubjectCodes) {
                csvOutput.append(",").append(code);
            }
            csvOutput.append("\n");

            // Step 3: Extract student data
            for (String line : lines) {
                Matcher regMatcher = regNoPattern.matcher(line);
                if (regMatcher.find()) {
                    String regNo = regMatcher.group(1);
                    
                    // Extract student name (usually between RegNo and first subject code or grade)
                    String remainder = line.substring(regMatcher.end()).trim();
                    String studentName = "";
                    
                    // Try to extract name: it's usually alphabetic text before grades start
                    String[] tokens = remainder.split("\\s+");
                    StringBuilder nameBuilder = new StringBuilder();
                    for (String token : tokens) {
                        // Stop when we hit a grade or subject code
                        if (gradePattern.matcher(token).matches() || subjectCodePattern.matcher(token).matches()) {
                            break;
                        }
                        // Accumulate name parts (alphabetic, can include dots and commas)
                        if (token.matches("[A-Za-z.,]+")) {
                            if (nameBuilder.length() > 0) nameBuilder.append(" ");
                            nameBuilder.append(token);
                        }
                    }
                    studentName = nameBuilder.toString().trim();
                    
                    // Extract grades
                    List<String> gradesFound = new ArrayList<>();
                    for (String token : tokens) {
                        if (gradePattern.matcher(token).matches()) {
                            gradesFound.add(token);
                        }
                    }

                    // Write CSV row
                    csvOutput.append(regNo).append(",").append(studentName.isEmpty() ? "Unknown" : studentName);
                    
                    // Align grades to subject codes (take last N grades matching header count)
                    int numSubjects = headerSubjectCodes.size();
                    int startIdx = Math.max(0, gradesFound.size() - numSubjects);
                    
                    for (int i = 0; i < numSubjects; i++) {
                        int gradeIdx = startIdx + i;
                        if (gradeIdx < gradesFound.size()) {
                            csvOutput.append(",").append(gradesFound.get(gradeIdx));
                        } else {
                            csvOutput.append(",");
                        }
                    }
                    csvOutput.append("\n");
                }
            }
        }
        
        return csvOutput.toString();
    }

    // --- CSV Processing Logic ---
    @Transactional
    public List<SemesterGrade> processCsvGradeSheet(MultipartFile file, Integer semesterId) throws IOException {
        String content = new String(file.getBytes());
        String[] lines = content.split("\\r?\\n");
        
        if (lines.length < 2) return semesterGradeRepository.findAll(); // Empty or just header

        String[] headers = lines[0].split(",");
        List<String> subjectCodes = new ArrayList<>();
        List<Integer> subjectIndices = new ArrayList<>();
        int regNoIndex = -1;

        // Parse Header
        for (int i = 0; i < headers.length; i++) {
            String h = headers[i].trim();
            if (h.equalsIgnoreCase("Register Number") || h.equalsIgnoreCase("Reg No") || h.equalsIgnoreCase("RegNo")) {
                regNoIndex = i;
            } else if (!h.equalsIgnoreCase("Name") && !h.equalsIgnoreCase("Student Name") && !h.equalsIgnoreCase("S.No")) {
                // Assume it's a subject code if it looks like one (or just use it as key)
                subjectCodes.add(h);
                subjectIndices.add(i);
            }
        }

        if (regNoIndex == -1) throw new IllegalArgumentException("CSV must contain a 'Register Number' column.");

        // Parse Rows
        for (int i = 1; i < lines.length; i++) {
            String[] tokens = lines[i].split(",");
            if (tokens.length <= regNoIndex) continue;

            String regNo = tokens[regNoIndex].trim();
            if (regNo.isEmpty()) continue;

            Map<String, String> resultsMap = new LinkedHashMap<>();
            for (int k = 0; k < subjectCodes.size(); k++) {
                int dataIndex = subjectIndices.get(k);
                if (dataIndex < tokens.length) {
                    String grade = tokens[dataIndex].trim();
                    if (!grade.isEmpty()) {
                        resultsMap.put(subjectCodes.get(k), grade);
                    }
                }
            }

            if (!resultsMap.isEmpty()) {
                try {
                    saveSemesterGrade(regNo, semesterId, objectMapper.writeValueAsString(resultsMap));
                } catch (Exception e) {
                    System.err.println("Error saving CSV row for " + regNo);
                }
            }
        }
        
        return semesterGradeRepository.findAll();
    }

    // --- Excel Export Logic ---
    public java.io.ByteArrayInputStream exportConsolidatedExcel() throws IOException {
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            
            boolean hasAnyData = false;
            
            // Loop through Semesters 1 to 8
            for (int sem = 1; sem <= 8; sem++) {
                final int currentSem = sem;
                List<SemesterGrade> semesterGrades = semesterGradeRepository.findAll().stream()
                        .filter(g -> g.getSemesterId() != null && g.getSemesterId() == currentSem)
                        .toList();

                // Skip empty semesters
                if (semesterGrades.isEmpty()) continue;

                hasAnyData = true;
                org.apache.poi.xssf.usermodel.XSSFSheet sheet = workbook.createSheet("Sem " + sem);

                // Collect all unique subject codes for this semester to build dynamic headers
                Set<String> subjectCodes = new TreeSet<>();
                for (SemesterGrade g : semesterGrades) {
                    try {
                        Map<String, String> results = objectMapper.readValue(g.getResults(), new TypeReference<Map<String, String>>() {});
                        subjectCodes.addAll(results.keySet());
                    } catch (Exception e) {
                        System.err.println("Error parsing results for student: " + g.getStudentRegNo());
                    }
                }
                
                if (subjectCodes.isEmpty()) {
                    System.out.println("Warning: No subject codes found for Semester " + sem);
                    continue;
                }
                
                List<String> sortedCodes = new ArrayList<>(subjectCodes);

                // Create Header Row with styling
                org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
                org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
                org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
                headerFont.setBold(true);
                headerStyle.setFont(headerFont);
                
                org.apache.poi.ss.usermodel.Cell cell0 = headerRow.createCell(0);
                cell0.setCellValue("Register Number");
                cell0.setCellStyle(headerStyle);
                
                org.apache.poi.ss.usermodel.Cell cell1 = headerRow.createCell(1);
                cell1.setCellValue("Student Name");
                cell1.setCellStyle(headerStyle);
                
                int colIdx = 2;
                for (String code : sortedCodes) {
                    org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(colIdx++);
                    cell.setCellValue(code);
                    cell.setCellStyle(headerStyle);
                }

                // Fill Data
                int rowIdx = 1;
                // Sort by Register Number
                List<SemesterGrade> sortedGrades = new ArrayList<>(semesterGrades);
                sortedGrades.sort(Comparator.comparing(SemesterGrade::getStudentRegNo));

                for (SemesterGrade gradeRecord : sortedGrades) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(gradeRecord.getStudentRegNo());
                    
                    // Fetch Student Name
                    String studentName = studentRepository.findById(gradeRecord.getStudentRegNo())
                            .map(Student::getName).orElse("Unknown");
                    row.createCell(1).setCellValue(studentName);

                    Map<String, String> results = new HashMap<>();
                    try {
                        results = objectMapper.readValue(gradeRecord.getResults(), new TypeReference<Map<String, String>>() {});
                    } catch (Exception e) {
                        System.err.println("Error parsing results for student: " + gradeRecord.getStudentRegNo());
                    }

                    int dataColIdx = 2;
                    for (String code : sortedCodes) {
                        String val = results.getOrDefault(code, "");
                        row.createCell(dataColIdx++).setCellValue(val);
                    }
                }
                
                // Auto-size columns for better readability
                for (int i = 0; i < colIdx; i++) {
                    sheet.autoSizeColumn(i);
                }
            }

            // If no data at all, create a summary sheet
            if (!hasAnyData) {
                org.apache.poi.xssf.usermodel.XSSFSheet sheet = workbook.createSheet("Info");
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(0);
                row.createCell(0).setCellValue("No semester grade data found in the system.");
                row.createCell(1).setCellValue("Please upload PDF grade sheets first.");
                sheet.autoSizeColumn(0);
                sheet.autoSizeColumn(1);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return new java.io.ByteArrayInputStream(out.toByteArray());
        }
    }

    // --- Staff Management Methods ---
    public List<Staff> getAllStaff() {
        return staffRepository.findAll();
    }

    public Staff saveStaff(Staff staff) {
        return staffRepository.save(staff);
    }

    public void deleteStaff(Long id) {
        staffRepository.deleteById(id);
    }
}
