import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Archive,
  Download,
  ChevronDown,
  Edit,
  Trash2,
  Eye,
  Gift,
  CheckCircle,
} from "lucide-react";
import Button from "../../components/ui/Button";
import SearchBar from "../../components/ui/SearchBar";
import DataTable from "../../components/ui/DataTable";
import TableTabs from "../../components/ui/TableTabs";
import AnimatedContent from "../../components/ui/AnimatedContent";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";
import Modal, { ModalFooter } from "../../components/ui/Modal";
import EditUserModal from "@/components/modals/EditUserModal";
import AddUserModal from "@/components/modals/AddUserModal";
import { getAuditHeaders } from "@/lib/auditHeaders";

const EXPORT_HEADER_IMAGE_PATH = "/plpasig_header.png";
const EXCEL_HEADER_IMAGE_WIDTH_PX = 560;
const EXCEL_HEADER_IMAGE_HEIGHT_PX = 82;

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const getDataUrlDimensions = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = () => reject(new Error("Unable to load image dimensions."));
    img.src = dataUrl;
  });

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState("regular");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("A-Z");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);
  const [showCreateSuccessModal, setShowCreateSuccessModal] = useState(false);
  const [showDuplicateSchoolIdModal, setShowDuplicateSchoolIdModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("excel");
  const [isExporting, setIsExporting] = useState(false);
  const [showPromoteConfirmModal, setShowPromoteConfirmModal] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState(null);
  const [showPromoteResultModal, setShowPromoteResultModal] = useState(false);

  const [studentData, setStudentData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudents = async () => {
    setIsLoading(true);

    const degreeRank = {
      "First Degree": 1,
      "Second Degree": 2,
      "Third Degree": 3,
      "Fourth Degree": 4,
      "Fifth Degree": 5,
      "Sixth Degree": 6,
      "Seventh Degree": 7,
    };

    try {
      const [studentsRes, violationsRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/student-violations"),
      ]);

      const studentsResult = await studentsRes.json().catch(() => ({}));
      const violationsResult = await violationsRes.json().catch(() => ({}));

      if (!studentsRes.ok) {
        throw new Error(studentsResult?.message || "Failed to load students.");
      }

      if (!violationsRes.ok) {
        throw new Error(violationsResult?.message || "Failed to load violations.");
      }

      const violations = Array.isArray(violationsResult.records) ? violationsResult.records : [];
      const studentDegreeMap = violations.reduce((acc, record) => {
        if (record.student_id == null) return acc;
        if (record.cleared_at) return acc; // only active violations adjust risk color

        const rank = degreeRank[String(record.violation_degree)] || 0;
        acc[record.student_id] = Math.max(acc[record.student_id] || 0, rank);
        return acc;
      }, {});

      const rows = Array.isArray(studentsResult.students) ? studentsResult.students : [];
      setStudentData(
        rows.map((student) => {
          const maxDegreeRank = studentDegreeMap[student.id] || 0;
          const degreeName = Object.keys(degreeRank).find((key) => degreeRank[key] === maxDegreeRank) || "";
          return {
            id: Number(student.id),
            userId: student.user_id ? Number(student.user_id) : null,
            username: student.username || "",
            email: student.email || "",
            schoolId: student.school_id,
            studentName: student.full_name,
            firstName: student.first_name,
            lastName: student.last_name,
            program: student.program,
            yearSection: student.year_section,
            status: student.status,
            violationCount: Number(student.violation_count) || 0,
            maxViolationDegreeRank: maxDegreeRank,
            maxViolationDegree: degreeName,
          };
        }),
      );
    } catch (error) {
      alert(error.message || "Unable to fetch students.");
      setStudentData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Maps a raw student object from the API to the shape used in state.
  // Preserves violation-derived fields from the existing row when available.
  const mapStudentRow = (student, existing = null) => ({
    id: Number(student.id),
    userId: student.user_id ? Number(student.user_id) : null,
    username: student.username || "",
    email: student.email || "",
    schoolId: student.school_id,
    studentName: student.full_name,
    firstName: student.first_name,
    lastName: student.last_name,
    program: student.program,
    yearSection: student.year_section,
    status: student.status,
    violationCount: Number(student.violation_count) || 0,
    maxViolationDegreeRank: existing?.maxViolationDegreeRank ?? 0,
    maxViolationDegree: existing?.maxViolationDegree ?? "",
  });

  const handleSaveEdit = async (id, updatedData) => {
    const normalizedSchoolId = String(updatedData.schoolId || "")
      .trim()
      .toLowerCase();
    const duplicateSchoolId = studentData.some(
      (student) =>
        Number(student.id) !== Number(id) &&
        String(student.schoolId || "")
          .trim()
          .toLowerCase() === normalizedSchoolId,
    );

    if (duplicateSchoolId) {
      setShowDuplicateSchoolIdModal(true);
      return false;
    }

    try {
      const response = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
        body: JSON.stringify({
          username: String(updatedData.username || "").trim(),
          schoolId: String(updatedData.schoolId || "").trim(),
          email: String(updatedData.email || "").trim(),
          firstName: String(updatedData.firstName || "").trim(),
          lastName: String(updatedData.lastName || "").trim(),
          program: String(updatedData.program || "").trim(),
          yearSection: String(updatedData.yearSection || "").trim(),
          status: String(updatedData.status || "").trim(),
          violationCount: Number(updatedData.violationCount),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Failed to update student.");
      }

      if (result.student) {
        setStudentData((prev) =>
          prev.map((s) =>
            s.id === Number(result.student.id)
              ? mapStudentRow(result.student, s)
              : s,
          ),
        );
      }
      setShowEditSuccessModal(true);
      return true;
    } catch (error) {
      const message = String(error?.message || "");
      if (
        message.includes("School ID already exists") ||
        message.toLowerCase().includes("school_id")
      ) {
        setShowDuplicateSchoolIdModal(true);
      } else {
        alert(error.message || "Unable to update student.");
      }
      return false;
    }
  };

  const handleSaveNewUser = async (userData) => {
    const normalizedSchoolId = String(userData.schoolId || "")
      .trim()
      .toLowerCase();
    const duplicateSchoolId = studentData.some(
      (student) =>
        String(student.schoolId || "")
          .trim()
          .toLowerCase() === normalizedSchoolId,
    );

    if (duplicateSchoolId) {
      setShowDuplicateSchoolIdModal(true);
      return false;
    }

    setIsAddingUser(true);
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
        body: JSON.stringify({
          schoolId: String(userData.schoolId || "").trim(),
          email: String(userData.email || "").trim(),
          firstName: String(userData.firstName || "").trim(),
          lastName: String(userData.lastName || "").trim(),
          program: String(userData.program || "").trim(),
          yearSection: String(userData.yearSection || "").trim(),
          status: String(userData.status || "").trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Failed to add student.");
      }

      if (result.student) {
        setStudentData((prev) => [mapStudentRow(result.student), ...prev]);
      }
      setShowCreateSuccessModal(true);
      return true;
    } catch (error) {
      if (String(error?.message || "").includes("School ID already exists")) {
        setShowDuplicateSchoolIdModal(true);
      } else {
        alert(error.message || "Unable to add student.");
      }
      return false;
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteCandidate) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/students/${deleteCandidate.id}`, {
        method: "DELETE",
        headers: {
          ...getAuditHeaders(),
        },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Failed to delete student.");
      }

      setStudentData((prev) => prev.filter((s) => s.id !== deleteCandidate.id));
      setDeleteCandidate(null);
    } catch (error) {
      alert(error.message || "Unable to delete student.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePromoteAll = async () => {
    setIsPromoting(true);
    try {
      const response = await fetch("/api/students/promote-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Failed to promote students.");
      }

      setPromoteResult(result);
      setShowPromoteResultModal(true);
      setShowPromoteConfirmModal(false);

      // Refresh student data
      await fetchStudents();
    } catch (error) {
      alert(error.message || "Unable to promote students.");
      setShowPromoteConfirmModal(false);
    } finally {
      setIsPromoting(false);
    }
  };

  // Filters
  const filteredStudents = useMemo(() => {
    const toText = (value) => String(value || "").toLowerCase();
    const parseYearSection = (value) => {
      const text = String(value || "").trim();
      const match = text.match(/(\d+)\s*([a-zA-Z]+)/);
      if (!match) {
        return { year: "", section: "" };
      }

      return { year: match[1], section: match[2].toLowerCase() };
    };

    return studentData.filter((student) => {
      const parsedYearSection = parseYearSection(student.yearSection);

      // Tab filter
      if (activeTab === "regular" && student.status !== "Regular") return false;
      if (activeTab === "irregular" && student.status !== "Irregular")
        return false;

      // Program filter
      if (
        selectedProgram &&
        toText(student.program) !== selectedProgram.toLowerCase()
      )
        return false;

      // Year filter
      if (selectedYear) {
        const studentYear = parsedYearSection.year;
        if (studentYear !== selectedYear) return false;
      }

      // Section filter
      if (selectedSection) {
        const studentSection = parsedYearSection.section;
        if (studentSection !== selectedSection.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        return (
          toText(student.studentName).includes(query) ||
          toText(student.firstName).includes(query) ||
          toText(student.lastName).includes(query) ||
          toText(student.schoolId).includes(query) ||
          toText(student.program).includes(query) ||
          toText(student.yearSection).includes(query) ||
          toText(student.email).includes(query) ||
          toText(student.status).includes(query)
        );
      }

      return true;
    }).sort((a, b) => {
      const lastNameA = toText(a.lastName);
      const lastNameB = toText(b.lastName);
      const fullNameA = toText(a.studentName);
      const fullNameB = toText(b.studentName);

      if (lastNameA === lastNameB) {
        if (fullNameA === fullNameB) {
          return Number(a.id) - Number(b.id);
        }
        return sortOrder === "A-Z"
          ? fullNameA.localeCompare(fullNameB)
          : fullNameB.localeCompare(fullNameA);
      }

      if (sortOrder === "A-Z") {
        return lastNameA.localeCompare(lastNameB);
      }

      return lastNameB.localeCompare(lastNameA);
    });
  }, [
    studentData,
    activeTab,
    selectedProgram,
    selectedYear,
    selectedSection,
    searchQuery,
    sortOrder,
  ]);

  const statistics = useMemo(() => {
    const total = filteredStudents.length;
    const withViolations = filteredStudents.filter(
      (s) => s.violationCount > 0,
    ).length;
    
    // Count students by highest severity category
    const warning = filteredStudents.filter((s) => {
      if (s.violationCount >= 5 || (s.maxViolationDegreeRank >= 5 && s.maxViolationDegreeRank <= 7)) {
        return false; // high-risk
      }
      if ((s.violationCount >= 3 && s.violationCount <= 4) || (s.maxViolationDegreeRank >= 3 && s.maxViolationDegreeRank <= 4)) {
        return false; // at-risk
      }
      return s.violationCount === 2 || s.maxViolationDegreeRank === 2;
    }).length;

    const atRisk = filteredStudents.filter((s) => {
      if (s.violationCount >= 5 || (s.maxViolationDegreeRank >= 5 && s.maxViolationDegreeRank <= 7)) {
        return false; // high-risk
      }
      return (s.violationCount >= 3 && s.violationCount <= 4) || (s.maxViolationDegreeRank >= 3 && s.maxViolationDegreeRank <= 4);
    }).length;

    const highRisk = filteredStudents.filter((s) => {
      return s.violationCount >= 5 || (s.maxViolationDegreeRank >= 5 && s.maxViolationDegreeRank <= 7);
    }).length;

    return { total, withViolations, warning, atRisk, highRisk };
  }, [filteredStudents]);

  const exportRows = useMemo(
    () =>
      filteredStudents.map((student, index) => ({
        no: index + 1,
        schoolId: String(student.schoolId || ""),
        studentName: String(student.studentName || ""),
        program: String(student.program || ""),
        yearSection: String(student.yearSection || ""),
        status: String(student.status || ""),
        violationCount: Number(student.violationCount) || 0,
      })),
    [filteredStudents],
  );

  const formatDateForFileName = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const downloadBlob = useCallback((blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const resolveHeaderImage = useCallback(async () => {
    const response = await fetch(EXPORT_HEADER_IMAGE_PATH);
    if (!response.ok) {
      throw new Error(`Required header image not found: ${EXPORT_HEADER_IMAGE_PATH}`);
    }

    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    const dimensions = await getDataUrlDimensions(dataUrl);

    return { dataUrl, dimensions };
  }, []);

  const exportAsExcel = useCallback(async () => {
    const [{ Workbook }, { dataUrl, dimensions }] = await Promise.all([
      import("exceljs"),
      resolveHeaderImage(),
    ]);

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("User Management", {
      views: [{ state: "frozen", ySplit: 6 }],
    });

    sheet.columns = [
      { key: "no", width: 6 },
      { key: "schoolId", width: 18 },
      { key: "studentName", width: 30 },
      { key: "program", width: 14 },
      { key: "yearSection", width: 16 },
      { key: "status", width: 14 },
      { key: "violationCount", width: 16 },
    ];

    sheet.mergeCells("A1:G3");
    sheet.mergeCells("A4:G4");
    sheet.mergeCells("A5:G5");
    sheet.getRow(1).height = 26;
    sheet.getRow(2).height = 26;
    sheet.getRow(3).height = 26;
    sheet.getRow(4).height = 28;
    sheet.getRow(5).height = 18;

    const titleCell = sheet.getCell("A4");
    titleCell.value = "User Management Report";
    titleCell.font = { name: "Calibri", size: 18, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    const subtitleCell = sheet.getCell("A5");
    subtitleCell.value = `Generated: ${new Date().toLocaleString()}`;
    subtitleCell.font = { name: "Calibri", size: 11, color: { argb: "FF4B5563" } };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

    const headerRegionWidthPx = sheet.columns.reduce(
      (total, column) => total + (Number(column.width || 10) * 7.5),
      0,
    );
    const headerRegionHeightPx = [1, 2, 3].reduce(
      (total, rowNumber) => total + (Number(sheet.getRow(rowNumber).height || 15) * 1.333),
      0,
    );
    const imageScale = Math.min(
      (headerRegionWidthPx - 24) / dimensions.width,
      (headerRegionHeightPx - 6) / dimensions.height,
      EXCEL_HEADER_IMAGE_WIDTH_PX / dimensions.width,
      EXCEL_HEADER_IMAGE_HEIGHT_PX / dimensions.height,
      1,
    );
    const imageWidthPx = Math.max(8, Math.round(dimensions.width * imageScale));
    const imageHeightPx = Math.max(8, Math.round(dimensions.height * imageScale));
    const leftOffsetPx = Math.max((headerRegionWidthPx - imageWidthPx) / 2, 0);
    const topOffsetPx = Math.max((headerRegionHeightPx - imageHeightPx) / 2, 0);

    const toColCoordinate = (pixelOffset) => {
      let remaining = pixelOffset;
      for (let colIndex = 0; colIndex < sheet.columns.length; colIndex += 1) {
        const colPx = Number(sheet.columns[colIndex]?.width || 10) * 7.5;
        if (remaining <= colPx) {
          return colIndex + remaining / colPx;
        }
        remaining -= colPx;
      }
      return sheet.columns.length - 1;
    };

    const toRowCoordinate = (pixelOffset) => {
      let remaining = pixelOffset;
      for (let rowIndex = 1; rowIndex <= 3; rowIndex += 1) {
        const rowPx = Number(sheet.getRow(rowIndex).height || 15) * 1.333;
        if (remaining <= rowPx) {
          return (rowIndex - 1) + remaining / rowPx;
        }
        remaining -= rowPx;
      }
      return 2;
    };

    const imageId = workbook.addImage({ base64: dataUrl, extension: "png" });
    sheet.addImage(imageId, {
      tl: {
        col: toColCoordinate(leftOffsetPx),
        row: toRowCoordinate(topOffsetPx),
      },
      ext: {
        width: imageWidthPx,
        height: imageHeightPx,
      },
    });

    const headerRowNumber = 6;
    const headerRow = sheet.getRow(headerRowNumber);
    headerRow.values = [
      "No",
      "School ID",
      "Student Name",
      "Program",
      "Year/Section",
      "Status",
      "Violation Count",
    ];
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" },
      };
      cell.alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true,
        indent: 1,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    const firstDataRow = headerRowNumber + 1;
    for (const [index, row] of exportRows.entries()) {
      const excelRowNumber = firstDataRow + index;
      const excelRow = sheet.getRow(excelRowNumber);
      excelRow.values = [
        row.no,
        row.schoolId,
        row.studentName,
        row.program,
        row.yearSection,
        row.status,
        row.violationCount,
      ];
      excelRow.height = 28;

      excelRow.eachCell((cell) => {
        cell.font = { name: "Calibri", size: 11, color: { argb: "FF1F2937" } };
        cell.alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true,
          indent: 1,
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
        if (excelRowNumber % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        }
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const filename = `user_management_${formatDateForFileName()}.xlsx`;
    downloadBlob(blob, filename);
  }, [downloadBlob, exportRows, resolveHeaderImage]);

  const exportAsPdf = useCallback(async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const { dataUrl, dimensions } = await resolveHeaderImage();
    const tableMarginLeft = 10;
    const tableMarginRight = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - tableMarginLeft - tableMarginRight;
    const baseColumnWidths = [12, 28, 55, 24, 26, 24, 24];
    const baseTotalWidth = baseColumnWidths.reduce((sum, width) => sum + width, 0);
    const widthScale = tableWidth / baseTotalWidth;
    const tableColumnWidths = baseColumnWidths.map((width) => width * widthScale);
    const tableCenterX = tableMarginLeft + tableWidth / 2;
    let startY = 22;

    if (dataUrl) {
      const headerWidth = tableWidth;
      const headerHeight = (dimensions.height * headerWidth) / dimensions.width;
      const headerX = tableMarginLeft;
      doc.addImage(dataUrl, "PNG", headerX, 8, headerWidth, headerHeight);
      startY = 8 + headerHeight + 8;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("User Management Report", tableCenterX, startY, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, tableCenterX, startY + 5, {
      align: "center",
    });

    autoTable(doc, {
      startY: startY + 9,
      head: [["No", "School ID", "Student Name", "Program", "Year/Section", "Status", "Violation Count"]],
      body: exportRows.map((row) => [
        row.no,
        row.schoolId,
        row.studentName,
        row.program,
        row.yearSection,
        row.status,
        row.violationCount,
      ]),
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2.4,
        textColor: [31, 41, 55],
        halign: "left",
        valign: "middle",
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: tableMarginLeft, right: tableMarginRight },
      tableWidth,
      columnStyles: {
        0: { cellWidth: tableColumnWidths[0] },
        1: { cellWidth: tableColumnWidths[1] },
        2: { cellWidth: tableColumnWidths[2] },
        3: { cellWidth: tableColumnWidths[3] },
        4: { cellWidth: tableColumnWidths[4] },
        5: { cellWidth: tableColumnWidths[5] },
        6: { cellWidth: tableColumnWidths[6] },
      },
    });

    doc.save(`user_management_${formatDateForFileName()}.pdf`);
  }, [exportRows, resolveHeaderImage]);

  const handleConfirmExport = async () => {
    if (exportRows.length === 0) {
      alert("No rows available to export.");
      return;
    }

    setIsExporting(true);
    try {
      if (exportFormat === "excel") {
        await exportAsExcel();
      } else {
        await exportAsPdf();
      }

      setShowExportModal(false);
    } catch (error) {
      alert(error?.message || "Unable to export report.");
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      key: "no",
      label: "No",
      width: "w-12",
      render: (value, row) => {
        const index = filteredStudents.findIndex((s) => s.id === row.id);
        return <span>{index + 1}</span>;
      },
    },
    { key: "schoolId", label: "School ID" },
    {
      key: "studentName",
      label: "Student Name",
      render: (value) => <span className="text-gray font-bold">{value}</span>,
    },
    { key: "program", label: "Program" },
    { key: "yearSection", label: "Year/Section" },
    { key: "status", label: "Status" },
    {
      key: "violationCount",
      label: "Violation Count",
      render: (value, row) => {
        let bgColor = "bg-green-500";

        // Get color based on count
        let countColor = "bg-green-500";
        if (value >= 5) {
          countColor = "bg-red-500";
        } else if (value >= 3 && value <= 4) {
          countColor = "bg-orange-500";
        } else if (value === 2) {
          countColor = "bg-yellow-500";
        }

        // Get color based on degree rank (if available)
        const degreeRank = row.maxViolationDegreeRank || 0;
        let degreeColor = "bg-green-500";
        if (degreeRank >= 5 && degreeRank <= 7) {
          degreeColor = "bg-red-500";
        } else if (degreeRank >= 3 && degreeRank <= 4) {
          degreeColor = "bg-orange-500";
        } else if (degreeRank === 2) {
          degreeColor = "bg-yellow-500";
        }

        // Use the more severe color (degree takes priority if higher severity)
        const degreeOrder = { "bg-green-500": 0, "bg-yellow-500": 1, "bg-orange-500": 2, "bg-red-500": 3 };
        bgColor = degreeOrder[degreeColor] >= degreeOrder[countColor] ? degreeColor : countColor;

        return (
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-medium ${bgColor}`}
          >
            {value}
          </span>
        );
      },
    },
  ];

  const actions = [
    {
      label: "Edit",
      icon: <Edit className="w-4 h-4" />,
      onClick: (row) => {
        setSelectedUser(row);
        setIsEditOpen(true);
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: (row) => setDeleteCandidate(row),
      variant: "danger",
    },
  ];

  const tabs = [
    { key: "regular", label: "Regular" },
    { key: "irregular", label: "Irregular" },
  ];

  const resetFilters = () => {
    setSelectedProgram("");
    setSelectedYear("");
    setSelectedSection("");
    setSearchQuery("");
    setSortOrder("A-Z");
    setActiveTab("regular");
  };

  return (
    <div className="text-white relative">
      <AnimatedContent>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold tracking-wide">
            USER MANAGEMENT
          </h2>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-[#4A5568] hover:bg-[#3d4654] border-0"
            >
              <Plus className="w-4 h-4" />
              Import
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="gap-2 bg-[#4A5568] hover:bg-[#3d4654] border-0"
            >
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </div>
        </div>
      </AnimatedContent>

      <AnimatedContent distance={40} delay={0.1}>
        <p className="text-white font-semibold mb-4">S.Y. 2025-2026</p>
      </AnimatedContent>

      <AnimatedContent distance={40} delay={0.2}>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <SearchBar
            placeholder="Search by name, ID, program, or section"
            className="w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="min-w-[90px] justify-between"
              >
                {sortOrder}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortOrder("A-Z")}>A-Z</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("Z-A")}>Z-A</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Program Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="min-w-[120px] justify-between"
              >
                {selectedProgram
                  ? selectedProgram.toUpperCase()
                  : "All Programs"}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedProgram("")}>
                All Programs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedProgram("bsit")}>
                BSIT
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedProgram("bscs")}>
                BSCS
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Year Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="min-w-[120px] justify-between"
              >
                {selectedYear ? `${selectedYear} Year` : "All Years"}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedYear("")}>
                All Years
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedYear("1")}>
                1st Year
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedYear("2")}>
                2nd Year
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedYear("3")}>
                3rd Year
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedYear("4")}>
                4th Year
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Section Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="min-w-[120px] justify-between"
              >
                {selectedSection
                  ? `Section ${selectedSection.toUpperCase()}`
                  : "All Sections"}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedSection("")}>
                All Sections
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedSection("a")}>
                Section A
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedSection("b")}>
                Section B
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedSection("c")}>
                Section C
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedSection("d")}>
                Section D
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedSection("e")}>
                Section E
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {(selectedProgram ||
            selectedYear ||
            selectedSection ||
            sortOrder !== "A-Z" ||
            searchQuery ||
            activeTab !== "regular") && (
            <Button
              variant="secondary"
              size="sm"
              onClick={resetFilters}
              className="gap-2 bg-[#4A5568] hover:bg-[#3d4654] border-0"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </AnimatedContent>

      <AnimatedContent distance={40} delay={0.3}>
        <TableTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-4"
        />
      </AnimatedContent>

      <AnimatedContent distance={40} delay={0.4}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-gray-400">
              Total Students:{" "}
              <span className="text-white font-medium">{statistics.total}</span>
            </span>
            <span className="text-gray-400">
              Students with Violations:{" "}
              <span className="text-white font-medium">
                {statistics.withViolations}
              </span>
            </span>
            <span className="text-gray-400">
              Warning:{" "}
              <span className="text-white font-medium">
                {statistics.warning}
              </span>
            </span>
            <span className="text-gray-400">
              At-Risk Students:{" "}
              <span className="text-white font-medium">
                {statistics.atRisk}
              </span>
            </span>
            <span className="text-gray-400">
              High-Risk Students:{" "}
              <span className="text-white font-medium">
                {statistics.highRisk}
              </span>
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-[#4A9B9B] hover:bg-[#3d8585] border-0"
              onClick={() => setShowPromoteConfirmModal(true)}
            >
              <Gift className="w-4 h-4" />
              Promote
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-[#4A5568] hover:bg-[#3d4654] border-0"
            >
              <Archive className="w-4 h-4" />
              Archive
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-[#4A5568] hover:bg-[#3d4654] border-0"
              onClick={() => {
                setExportFormat("excel");
                setShowExportModal(true);
              }}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </AnimatedContent>

      <AnimatedContent distance={40} delay={0.5}>
        <DataTable
          columns={columns}
          data={isLoading ? [] : filteredStudents}
          actions={actions}
        />
      </AnimatedContent>

      {/* Add Modal */}
      <AddUserModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSaveNewUser}
        isSaving={isAddingUser}
      />

      {/* Edit Modal */}
      <EditUserModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        user={selectedUser}
        onSave={handleSaveEdit}
      />

      <Modal
        isOpen={Boolean(deleteCandidate)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteCandidate(null);
          }
        }}
        title={<span className="font-black font-inter">Delete Student</span>}
        size="md"
        showCloseButton={!isDeleting}
      >
        <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 mb-4">
          <p className="text-red-300 text-sm font-medium">
            This action permanently removes the student record from the database.
          </p>
        </div>
        <p className="text-gray-200 text-sm">
          Delete <span className="font-semibold text-white">{deleteCandidate?.studentName}</span>?
        </p>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteCandidate(null)}
            disabled={isDeleting}
            className="px-6 py-2.5"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDeleteStudent}
            disabled={isDeleting}
            className="px-6 py-2.5"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={showDuplicateSchoolIdModal}
        onClose={() => setShowDuplicateSchoolIdModal(false)}
        title={<span className="font-black font-inter">Duplicate School ID</span>}
        size="sm"
        showCloseButton
      >
        <div className="rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 mb-4">
          <p className="text-sm font-medium text-red-300">
            School ID already exists. Please use a unique School ID.
          </p>
        </div>
        <ModalFooter>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowDuplicateSchoolIdModal(false)}
            className="px-6 py-2.5"
          >
            OK
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={showEditSuccessModal}
        onClose={() => setShowEditSuccessModal(false)}
        title={
          <span className="font-black font-inter flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Saved Successfully
          </span>
        }
        size="sm"
        showCloseButton
      >
        <div className="rounded-lg border border-green-400/25 bg-green-500/10 px-4 py-3 mb-4">
          <p className="text-sm font-medium text-green-300">
            User changes were saved to the database.
          </p>
        </div>
        <ModalFooter>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowEditSuccessModal(false)}
            className="px-6 py-2.5"
          >
            OK
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={showExportModal}
        onClose={() => {
          if (!isExporting) {
            setShowExportModal(false);
          }
        }}
        title={<span className="font-black font-inter">Export User Management Report</span>}
        size="md"
        showCloseButton={!isExporting}
      >
        <p className="text-sm text-gray-300 mb-3">
          Choose a format for exporting the current table view.
        </p>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 mb-4">
          <p className="text-xs text-gray-300">
            Rows to export: <span className="font-semibold text-white">{exportRows.length}</span>
          </p>
        </div>

        <label className="block text-sm font-medium text-white mb-2">Format</label>
        <div className="relative">
          <select
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value)}
            disabled={isExporting}
            className="w-full cursor-pointer backdrop-blur-md border border-white/20 rounded-xl px-4 pr-11 py-3 text-[15px] text-white bg-[rgba(45,47,52,0.8)] focus:outline-none focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/30 transition-all appearance-none"
          >
            <option value="excel">Excel (.xlsx)</option>
            <option value="pdf">PDF</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-300" />
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowExportModal(false)}
            disabled={isExporting}
            className="px-6 py-2.5"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirmExport}
            disabled={isExporting}
            className="px-6 py-2.5"
          >
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={showCreateSuccessModal}
        onClose={() => setShowCreateSuccessModal(false)}
        title={
          <span className="font-black font-inter flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Successfully Created
          </span>
        }
        size="sm"
        showCloseButton
      >
        <div className="rounded-lg border border-green-400/25 bg-green-500/10 px-4 py-3 mb-4">
          <p className="text-sm font-medium text-green-300">
            Student account was created and credentials were sent.
          </p>
        </div>
        <ModalFooter>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowCreateSuccessModal(false)}
            className="px-6 py-2.5"
          >
            OK
          </Button>
        </ModalFooter>
      </Modal>

      {/* Promote Confirmation Modal */}
      <Modal
        isOpen={showPromoteConfirmModal}
        onClose={() => !isPromoting && setShowPromoteConfirmModal(false)}
        title="Confirm Year Level Promotion"
        size="sm"
        showCloseButton
      >
        <div className="rounded-lg border border-blue-400/25 bg-blue-500/10 px-4 py-3 mb-4">
          <p className="text-sm font-medium text-blue-300">
            This will promote all active Regular students to the next year level (1st → 2nd, etc.). 
            Students at 4th year will not be promoted to prevent overflow.
          </p>
        </div>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPromoteConfirmModal(false)}
            disabled={isPromoting}
            className="px-6 py-2.5"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handlePromoteAll}
            disabled={isPromoting}
            className="px-6 py-2.5"
          >
            {isPromoting ? "Promoting..." : "Confirm Promotion"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Promote Result Modal */}
      <Modal
        isOpen={showPromoteResultModal}
        onClose={() => setShowPromoteResultModal(false)}
        title={
          <span className="font-black font-inter flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Promotion Complete
          </span>
        }
        size="sm"
        showCloseButton
      >
        <div className="rounded-lg border border-green-400/25 bg-green-500/10 px-4 py-3 mb-4">
          <p className="text-sm font-medium text-green-300">
            {promoteResult?.message}
          </p>
          {promoteResult && (
            <div className="mt-3 space-y-1 text-xs text-green-200">
              <p>Students promoted: <span className="font-bold">{promoteResult.promotedCount}</span></p>
              <p>Total students: <span className="font-bold">{promoteResult.totalStudents}</span></p>
            </div>
          )}
        </div>
        <ModalFooter>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowPromoteResultModal(false)}
            className="px-6 py-2.5"
          >
            OK
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default UserManagement;
