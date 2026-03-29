import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import AdminStatCard from "../../components/ui/AdminStatCard";
import {
  AddViolationButton,
  ViewStudentsButton,
} from "../../components/ui/QuickActionButton";
import AnimatedContent from "../../components/ui/AnimatedContent";
import Modal, { ModalFooter } from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import DataTable, {
  TableCellText,
  TableCellDateTime,
  TableCellBadge,
} from "../../components/ui/DataTable";
import SearchBar from "../../components/ui/SearchBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  AlertTriangle,
  Users,
  Trash2,
  Maximize2,
  X,
  Download,
  Search,
} from "lucide-react";

const RANKING_EXPORT_HEADER_IMAGE_PATH = "/plpasig_header.jpg";
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

const parseYearSection = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) {
    return { year: "", section: "", normalized: "" };
  }

  const compact = normalized.replace(/\s+/g, "");
  const match = compact.match(/^(\d+)([A-Z]+)?$/);
  if (match) {
    return {
      year: match[1] || "",
      section: match[2] || "",
      normalized: `${match[1] || ""}${match[2] || ""}`,
    };
  }

  const yearMatch = compact.match(/\d+/);
  const sectionMatch = compact.match(/[A-Z]+/);
  const year = yearMatch ? yearMatch[0] : "";
  const section = sectionMatch ? sectionMatch[0] : "";
  return {
    year,
    section,
    normalized: `${year}${section}`,
  };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedSemester, setSelectedSemester] = useState("1st Sem");
  const [trendModalOpen, setTrendModalOpen] = useState(false);
  const [rankingModalOpen, setRankingModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("All");
  const [yearLevelFilter, setYearLevelFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [violationMetrics, setViolationMetrics] = useState({
    activeViolations: 0,
    warningStudents: 0,
    atRiskStudents: 0,
    highRiskStudents: 0,
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  const [rankingData, setRankingData] = useState([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(true);
  const [showRankingExportModal, setShowRankingExportModal] = useState(false);
  const [rankingExportFormat, setRankingExportFormat] = useState("excel");
  const [isExportingRanking, setIsExportingRanking] = useState(false);

  const filteredRankingData = rankingData.filter((student) => {
    const matchesSearch = student.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesProgram =
      programFilter === "All" || student.program === programFilter;
    const matchesYear =
      yearLevelFilter === "All" || student.year === yearLevelFilter;
    const matchesSection =
      sectionFilter === "All" || student.section === sectionFilter;
    return matchesSearch && matchesProgram && matchesYear && matchesSection;
  });

  const programFilterOptions = useMemo(
    () =>
      Array.from(new Set(rankingData.map((student) => String(student.program || "").trim()).filter(Boolean))).sort(),
    [rankingData],
  );

  const yearFilterOptions = useMemo(
    () =>
      Array.from(new Set(rankingData.map((student) => String(student.year || "").trim()).filter(Boolean))).sort(
        (a, b) => Number(a) - Number(b),
      ),
    [rankingData],
  );

  const sectionFilterOptions = useMemo(
    () =>
      Array.from(new Set(rankingData.map((student) => String(student.section || "").trim()).filter(Boolean))).sort(),
    [rankingData],
  );

  const rankingExportRows = useMemo(
    () =>
      filteredRankingData.map((student) => ({
        rank: student.rank,
        studentName: student.name,
        schoolId: student.id,
        program: student.program,
        year: student.year,
        section: student.section,
        totalViolations: student.violations,
      })),
    [filteredRankingData],
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

  const resolveRankingHeaderImage = useCallback(async () => {
    const response = await fetch(RANKING_EXPORT_HEADER_IMAGE_PATH);
    if (!response.ok) {
      throw new Error(`Required header image not found: ${RANKING_EXPORT_HEADER_IMAGE_PATH}`);
    }

    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    const dimensions = await getDataUrlDimensions(dataUrl);
    const extension = String(blob.type || "").toLowerCase().includes("png") ? "png" : "jpeg";
    const imageFormat = extension === "png" ? "PNG" : "JPEG";

    return { dataUrl, dimensions, extension, imageFormat };
  }, []);

  const exportRankingAsExcel = useCallback(async () => {
    const [{ Workbook }, { dataUrl, dimensions, extension }] = await Promise.all([
      import("exceljs"),
      resolveRankingHeaderImage(),
    ]);

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Violation Ranking", {
      views: [{ state: "frozen", ySplit: 6 }],
    });

    sheet.columns = [
      { key: "rank", width: 10 },
      { key: "studentName", width: 30 },
      { key: "schoolId", width: 18 },
      { key: "program", width: 14 },
      { key: "year", width: 10 },
      { key: "section", width: 10 },
      { key: "totalViolations", width: 20 },
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
    titleCell.value = "Student Violation Ranking Report";
    titleCell.font = { name: "Calibri", size: 18, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    const subtitleCell = sheet.getCell("A5");
    subtitleCell.value = `Generated: ${new Date().toLocaleString()}`;
    subtitleCell.font = { name: "Calibri", size: 11, color: { argb: "FF4B5563" } };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

    const headerRegionWidthPx = sheet.columns.reduce(
      (total, column) => total + Number(column.width || 10) * 7.5,
      0,
    );
    const headerRegionHeightPx = [1, 2, 3].reduce(
      (total, rowNumber) => total + Number(sheet.getRow(rowNumber).height || 15) * 1.333,
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
          return rowIndex - 1 + remaining / rowPx;
        }
        remaining -= rowPx;
      }
      return 2;
    };

    const imageId = workbook.addImage({ base64: dataUrl, extension });
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
      "Rank",
      "Student Name",
      "School ID",
      "Program",
      "Year",
      "Section",
      "Total Violations",
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
    for (const [index, row] of rankingExportRows.entries()) {
      const excelRowNumber = firstDataRow + index;
      const excelRow = sheet.getRow(excelRowNumber);
      excelRow.values = [
        row.rank,
        row.studentName,
        row.schoolId,
        row.program,
        row.year,
        row.section,
        row.totalViolations,
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
    downloadBlob(blob, `student_violation_ranking_${formatDateForFileName()}.xlsx`);
  }, [downloadBlob, rankingExportRows, resolveRankingHeaderImage]);

  const exportRankingAsPdf = useCallback(async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const { dataUrl, dimensions, imageFormat } = await resolveRankingHeaderImage();
    const tableMarginLeft = 10;
    const tableMarginRight = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - tableMarginLeft - tableMarginRight;
    const baseColumnWidths = [14, 58, 30, 24, 16, 16, 28];
    const baseTotalWidth = baseColumnWidths.reduce((sum, width) => sum + width, 0);
    const widthScale = tableWidth / baseTotalWidth;
    const tableColumnWidths = baseColumnWidths.map((width) => width * widthScale);
    const tableCenterX = tableMarginLeft + tableWidth / 2;
    let startY = 22;

    if (dataUrl) {
      const headerWidth = tableWidth;
      const headerHeight = (dimensions.height * headerWidth) / dimensions.width;
      const headerX = tableMarginLeft;
      doc.addImage(dataUrl, imageFormat, headerX, 8, headerWidth, headerHeight);
      startY = 8 + headerHeight + 8;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Student Violation Ranking Report", tableCenterX, startY, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, tableCenterX, startY + 5, {
      align: "center",
    });

    autoTable(doc, {
      startY: startY + 9,
      head: [["Rank", "Student Name", "School ID", "Program", "Year", "Section", "Total Violations"]],
      body: rankingExportRows.map((row) => [
        row.rank,
        row.studentName,
        row.schoolId,
        row.program,
        row.year,
        row.section,
        row.totalViolations,
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

    doc.save(`student_violation_ranking_${formatDateForFileName()}.pdf`);
  }, [rankingExportRows, resolveRankingHeaderImage]);

  const handleConfirmRankingExport = async () => {
    if (rankingExportRows.length === 0) {
      alert("No rows available to export.");
      return;
    }

    setIsExportingRanking(true);
    try {
      if (rankingExportFormat === "excel") {
        await exportRankingAsExcel();
      } else {
        await exportRankingAsPdf();
      }
      setShowRankingExportModal(false);
    } catch (error) {
      alert(error?.message || "Unable to export report.");
    } finally {
      setIsExportingRanking(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const degreeRank = {
      "First Degree": 1,
      "Second Degree": 2,
      "Third Degree": 3,
      "Fourth Degree": 4,
      "Fifth Degree": 5,
      "Sixth Degree": 6,
      "Seventh Degree": 7,
    };

    const getRiskColor = (rank) => {
      if (rank >= 5 && rank <= 7) return "bg-red-500";
      if (rank >= 3 && rank <= 4) return "bg-orange-500";
      if (rank === 2) return "bg-yellow-500";
      if (rank === 1) return "bg-green-500";
      return "bg-gray-500";
    };

    const fetchDashboardViolationData = async () => {
      setIsLoadingMetrics(true);
      setIsLoadingRanking(true);

      try {
        const [studentsRes, violationsRes] = await Promise.all([
          fetch("/api/students"),
          fetch("/api/student-violations"),
        ]);

        const studentsResult = await studentsRes.json().catch(() => ({}));
        const violationsResult = await violationsRes.json().catch(() => ({}));

        if (!studentsRes.ok || !Array.isArray(studentsResult?.students)) {
          throw new Error("Failed to load students.");
        }
        if (!violationsRes.ok || !Array.isArray(violationsResult?.records)) {
          throw new Error("Failed to load violations.");
        }

        const students = studentsResult.students || [];
        const activeRecords = violationsResult.records.filter((rec) => !rec.cleared_at);

        const studentById = new Map(students.map((student) => [Number(student.id), student]));

        const studentMaxDegree = activeRecords.reduce((acc, rec) => {
          const studentId = Number(rec.student_id);
          if (!studentId) return acc;

          const rank = degreeRank[String(rec.violation_degree)] || 0;
          acc[studentId] = Math.max(acc[studentId] || 0, rank);
          return acc;
        }, {});

        const violationCountMap = {};
        students.forEach((student) => {
          violationCountMap[student.id] = Number(student.violation_count) || 0;
        });

        let warningStudents = 0;
        let atRiskStudents = 0;
        let highRiskStudents = 0;

        Object.entries(studentMaxDegree).forEach(([studentId, degree]) => {
          const count = violationCountMap[studentId] || 0;

          if (count >= 5 || (degree >= 5 && degree <= 7)) {
            highRiskStudents += 1;
          } else if ((count >= 3 && count <= 4) || (degree >= 3 && degree <= 4)) {
            atRiskStudents += 1;
          } else if (count === 2 || degree === 2) {
            warningStudents += 1;
          }
        });

        const rankingStats = activeRecords.reduce((acc, rec) => {
          const studentId = Number(rec.student_id);
          if (!studentId || !studentById.has(studentId)) return acc;

          if (!acc[studentId]) {
            acc[studentId] = {
              count: 0,
              maxDegreeRank: 0,
            };
          }

          acc[studentId].count += 1;
          const rank = degreeRank[String(rec.violation_degree)] || 0;
          if (rank > acc[studentId].maxDegreeRank) {
            acc[studentId].maxDegreeRank = rank;
          }
          return acc;
        }, {});

        const newRankingData = Object.entries(rankingStats)
          .map(([studentId, data]) => {
            const student = studentById.get(Number(studentId));
            const parsedYearSection = parseYearSection(student?.year_section);
            return {
              rank: "",
              name: student?.full_name || student?.username || "Unknown",
              violations: data.count,
              color: getRiskColor(data.maxDegreeRank),
              id: student?.school_id || "",
              program: student?.program || "",
              year: parsedYearSection.year,
              section: parsedYearSection.section,
              yearSection: parsedYearSection.normalized,
              maxDegreeRank: data.maxDegreeRank,
            };
          })
          .sort((a, b) => b.violations - a.violations || b.maxDegreeRank - a.maxDegreeRank)
          .map((item, index) => ({
            ...item,
            rank: String(index + 1).padStart(2, "0"),
          }));

        if (isMounted) {
          setViolationMetrics({
            activeViolations: activeRecords.length,
            warningStudents,
            atRiskStudents,
            highRiskStudents,
          });
          setRankingData(newRankingData);
        }
      } catch (_error) {
        if (isMounted) {
          setViolationMetrics({
            activeViolations: 0,
            warningStudents: 0,
            atRiskStudents: 0,
            highRiskStudents: 0,
          });
          setRankingData([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingMetrics(false);
          setIsLoadingRanking(false);
        }
      }
    };

    fetchDashboardViolationData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const formatAuditDateTime = (isoValue) => {
      const dateObj = isoValue ? new Date(isoValue) : new Date();
      if (Number.isNaN(dateObj.getTime())) {
        return { date: "-", time: "-" };
      }

      return {
        date: dateObj.toLocaleDateString("en-GB"),
        time: dateObj.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      };
    };

    const fetchRecentActivity = async ({ silent = false } = {}) => {
      if (!silent && isMounted) {
        setIsLoadingActivity(true);
      }

      try {
        const response = await fetch("/api/audit-logs?limit=100");
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result?.status !== "ok") {
          throw new Error(result?.message || "Failed to load activity logs.");
        }

        if (!isMounted) {
          return;
        }

        const logs = Array.isArray(result.logs) ? result.logs : [];
        const mapped = logs.map((log) => {
          const { date, time } = formatAuditDateTime(log.created_at);
          return {
            id: log.id,
            date,
            time,
            actorName: log.actor_name || "Admin User",
            actorRole: log.actor_role || "admin",
            action: String(log.action || "").replaceAll("_", " "),
            target:
              log.target_id != null && String(log.target_id).length > 0
                ? `${log.target_type} #${log.target_id}`
                : log.target_type || "system",
            details: log.details || "No additional details",
          };
        });

        setRecentActivity(mapped);
      } catch (_error) {
        if (isMounted) {
          setRecentActivity([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingActivity(false);
        }
      }
    };

    fetchRecentActivity();

    const intervalId = setInterval(() => {
      fetchRecentActivity({ silent: true });
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const recentActivityColumns = [
    {
      key: "date",
      label: "Date",
      render: (_, row) => <TableCellDateTime date={row.date} time={row.time} />,
    },
    {
      key: "actorName",
      label: "Admin",
      render: (_, row) => (
        <TableCellText
          primary={row.actorName}
          secondary={String(row.actorRole || "").toUpperCase()}
        />
      ),
    },
    { key: "target", label: "Target" },
    {
      key: "action",
      label: "Action",
      render: (value) => (
        <TableCellBadge
          label={value}
          variant={
            String(value || "").includes("DELETE")
              ? "danger"
              : String(value || "").includes("CREATE") ||
                String(value || "").includes("UPLOAD")
                ? "success"
                : String(value || "").includes("UPDATE")
                  ? "warning"
                  : "info"
          }
        />
      ),
    },
    { key: "details", label: "Details" },
  ];

  const recentActivityPreview = recentActivity.slice(0, 5);

  return (
    <div className="text-white">
      {/* Header */}
      <AnimatedContent
        distance={50}
        direction="vertical"
        duration={0.6}
        delay={0}
      >
        <div className="mb-6">
          <h1 className="text-page-title">Dashboard</h1>
          <p className="text-page-subtitle mt-1">
            Monitor violations and student activity at a glance
          </p>
        </div>
      </AnimatedContent>

      {/* Stats and Actions Row */}
      <AnimatedContent
        distance={50}
        direction="vertical"
        duration={0.6}
        delay={0.1}
      >
        <div className="flex gap-4 mb-6">
          {/* Stats Cards */}
          <div className="flex gap-4 flex-1">
            <AdminStatCard
              title="Active Violations"
              value={
                isLoadingMetrics ? "-" : violationMetrics.activeViolations.toString()
              }
              percentage={0}
              comparisonLabel="vs last semester"
              icon={<AlertTriangle className="w-5 h-5 text-orange-400" />}
              iconBgColor="bg-orange-500/20"
              className="flex-1"
            />
            <AdminStatCard
              title="Warning Students"
              value={
                isLoadingMetrics ? "-" : violationMetrics.warningStudents.toString()
              }
              percentage={0}
              comparisonLabel="vs last semester"
              icon={<AlertTriangle className="w-5 h-5 text-yellow-400" />}
              iconBgColor="bg-yellow-500/20"
              className="flex-1"
            />
            <AdminStatCard
              title="At-Risk Students"
              value={
                isLoadingMetrics ? "-" : violationMetrics.atRiskStudents.toString()
              }
              percentage={0}
              comparisonLabel="vs last semester"
              icon={<Users className="w-5 h-5 text-orange-400" />}
              iconBgColor="bg-orange-500/20"
              className="flex-1"
            />
            <AdminStatCard
              title="High-Risk Students"
              value={
                isLoadingMetrics ? "-" : violationMetrics.highRiskStudents.toString()
              }
              percentage={0}
              comparisonLabel="vs last semester"
              icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
              iconBgColor="bg-red-500/20"
              className="flex-1"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <AddViolationButton
              onClick={() =>
                navigate("/admin/student-violation", {
                  state: { openLogModal: true },
                })
              }
              className="flex-1"
            />
            <ViewStudentsButton
              onClick={() => navigate("/admin/user-management")}
              className="flex-1"
            />
          </div>
        </div>
      </AnimatedContent>

      {/* Charts Row */}
      <AnimatedContent
        distance={50}
        direction="vertical"
        duration={0.6}
        delay={0.2}
      >
        <div className="flex gap-4 mb-6">
          {/* Violation Trends Chart */}
          <Card variant="glass" padding="md" className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-section-title">
                Violation trends over the semester
              </h3>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-lg border border-white/10">
                      {selectedSemester}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setSelectedSemester("1st Sem")}
                    >
                      1st Sem
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedSemester("2nd Sem")}
                    >
                      2nd Sem
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={() => setTrendModalOpen(true)}
                >
                  <Maximize2 className="ml-5 w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Chart Placeholder */}
            <div className="h-48 flex items-end justify-between px-4 relative">
              <svg
                className="w-full h-full absolute inset-0"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="lineGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20 140 Q 80 120, 120 130 T 200 80 T 280 90 T 360 60 T 440 70"
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="2"
                />
                <circle
                  cx="120"
                  cy="130"
                  r="6"
                  fill="#fff"
                  stroke="#06b6d4"
                  strokeWidth="2"
                />
                <circle
                  cx="200"
                  cy="80"
                  r="6"
                  fill="#fff"
                  stroke="#06b6d4"
                  strokeWidth="2"
                />
                <circle
                  cx="360"
                  cy="60"
                  r="6"
                  fill="#fff"
                  stroke="#06b6d4"
                  strokeWidth="2"
                />
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-muted px-2">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
            </div>
          </Card>

          {/* Student Violation Ranking */}
          <Card variant="glass" padding="md" className="w-[460px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-section-title">Student Violation Ranking</h3>
              <button
                className="text-gray-400 hover:text-white transition-colors"
                onClick={() => setRankingModalOpen(true)}
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-[32px_1fr_160px] text-table-header mt-7 mb-2">
                <span>#</span>
                <span>Name</span>
                <span className="text-right">Total of Violations</span>
              </div>
              {rankingData.slice(0, 5).map((student) => {
                const textSize =
                  student.rank === "01"
                    ? "text-lg font-semibold"
                    : student.rank === "02"
                      ? "text-base font-medium"
                      : student.rank === "03"
                        ? "text-[15px] font-medium"
                        : "text-[15px]";
                const rankNumSize =
                  student.rank === "01"
                    ? "text-lg font-bold text-white"
                    : student.rank === "02"
                      ? "text-base font-semibold text-gray-300"
                      : student.rank === "03"
                        ? "text-[15px] font-medium text-gray-400"
                        : "text-[15px] text-gray-400";
                const barHeight =
                  student.rank === "01"
                    ? "h-3"
                    : student.rank === "02"
                      ? "h-2.5"
                      : "h-2";

                return (
                  <div
                    key={student.rank}
                    className="grid grid-cols-[32px_1fr_160px] items-center"
                  >
                    <span className={rankNumSize}>{student.rank}</span>
                    <span className={textSize}>{student.name}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex-1 bg-white/10 rounded-full ${barHeight}`}
                      >
                        <div
                          className={`${student.color} ${barHeight} rounded-full`}
                          style={{
                            width: `${(student.violations / 6) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[13px] bg-white/10 px-2 py-1 rounded min-w-[28px] text-center">
                        {student.violations}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </AnimatedContent>

      {/* Recent Activity Table */}
      <AnimatedContent
        distance={50}
        direction="vertical"
        duration={0.6}
        delay={0.3}
      >
        <Card variant="glass" padding="md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-section-title">Recent Activity</h3>
            <button
              type="button"
              onClick={() => setActivityModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-gray-200 hover:text-white hover:bg-white/15 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              View All
            </button>
          </div>
          <DataTable
            columns={recentActivityColumns}
            data={isLoadingActivity ? [] : recentActivityPreview}
            onRowClick={(row) => console.log("Row clicked", row)}
          />
        </Card>
      </AnimatedContent>

      {/* Modals */}
      {/* Violation Trends Modal */}
      <Modal
        isOpen={trendModalOpen}
        onClose={() => setTrendModalOpen(false)}
        title={"Violation Trends Over the Semester"}
        size="2xl"
        className="max-w-[1100px] max-h-[80vh] overflow-y-auto scrollbar-hide"
      >
        <p className="text-sm text-gray-400 mb-4">
          This chart visualizes violation trends for the selected semester.
        </p>
        {/* Semester Dropdown & Actions */}
        <div className="flex items-center gap-2 mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg border border-white/10 h-10">
                {selectedSemester}
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedSemester("1st Sem")}>
                1st Sem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedSemester("2nd Sem")}>
                2nd Sem
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium px-4 py-2 rounded-lg border border-cyan-700 shadow transition-colors h-10"
            onClick={() => {
              /* Add export logic here */
            }}
          >
            Export
          </button>
        </div>
        {/* Chart Area */}
        <div className="h-[320px] flex items-end justify-between px-4 relative mb-6">
          <svg
            className="w-full h-full absolute inset-0"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="modalLineGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <path
              d="M 10 140 Q 100 120, 150 130 T 250 80 T 350 90 T 450 60 T 550 75 T 650 50 T 750 65 T 850 55 T 950 70"
              fill="none"
              stroke="url(#modalLineGradient)"
              strokeWidth="2"
            />
            <circle
              cx="150"
              cy="130"
              r="6"
              fill="#fff"
              stroke="#06b6d4"
              strokeWidth="2"
            />
            <circle
              cx="250"
              cy="80"
              r="6"
              fill="#fff"
              stroke="#06b6d4"
              strokeWidth="2"
            />
            <circle
              cx="450"
              cy="60"
              r="6"
              fill="#fff"
              stroke="#06b6d4"
              strokeWidth="2"
            />
            <circle
              cx="650"
              cy="50"
              r="6"
              fill="#fff"
              stroke="#06b6d4"
              strokeWidth="2"
            />
            <circle
              cx="850"
              cy="55"
              r="6"
              fill="#fff"
              stroke="#06b6d4"
              strokeWidth="2"
            />
          </svg>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-muted px-2">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </div>
        {/* Analytics Description */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-gray-300">
          This chart visualizes the trend of recorded student violations
          throughout the selected semester. Administrators can analyze patterns
          of misconduct over time and identify months where violations increase,
          allowing earlier intervention strategies.
        </div>
      </Modal>

      {/* Student Violation Ranking Modal */}
      <Modal
        isOpen={rankingModalOpen}
        onClose={() => setRankingModalOpen(false)}
        title={"Student Violation Ranking"}
        size="2xl"
        className="max-w-[1100px] max-h-[80vh] overflow-y-auto scrollbar-hide"
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-400">
            This list shows the ranking of students based on recorded
            violations.
          </p>
          <button
            className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium px-4 py-2 rounded-lg border border-cyan-700 shadow transition-colors inline-flex items-center gap-2"
            onClick={() => {
              setRankingExportFormat("excel");
              setShowRankingExportModal(true);
            }}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
        {/* Filter Row */}
        <div className="flex gap-3 mb-6">
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name"
            className="flex-1"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg border border-white/10 whitespace-nowrap">
                Program: {programFilter}
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setProgramFilter("All")}>
                All
              </DropdownMenuItem>
              {programFilterOptions.map((program) => (
                <DropdownMenuItem key={program} onClick={() => setProgramFilter(program)}>
                  {program}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg border border-white/10 whitespace-nowrap">
                Year: {yearLevelFilter}
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setYearLevelFilter("All")}>
                All
              </DropdownMenuItem>
              {yearFilterOptions.map((year) => (
                <DropdownMenuItem key={year} onClick={() => setYearLevelFilter(year)}>
                  {year}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg border border-white/10 whitespace-nowrap">
                Section: {sectionFilter}
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSectionFilter("All")}>
                All
              </DropdownMenuItem>
              {sectionFilterOptions.map((section) => (
                <DropdownMenuItem key={section} onClick={() => setSectionFilter(section)}>
                  {section}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Ranking List Section */}
        <div className="space-y-4">
          {filteredRankingData.length > 0 ? (
            filteredRankingData.map((student) => {
              const textSize =
                student.rank === "01"
                  ? "text-lg font-semibold"
                  : student.rank === "02"
                    ? "text-base font-medium"
                    : student.rank === "03"
                      ? "text-[15px] font-medium"
                      : "text-[15px]";
              const rankNumSize =
                student.rank === "01"
                  ? "text-lg font-bold text-white"
                  : student.rank === "02"
                    ? "text-base font-semibold text-gray-300"
                    : student.rank === "03"
                      ? "text-[15px] font-medium text-gray-400"
                      : "text-[15px] text-gray-400";
              const barHeight =
                student.rank === "01"
                  ? "h-3"
                  : student.rank === "02"
                    ? "h-2.5"
                    : "h-2";

              return (
                <div
                  key={student.rank}
                  className="border-b border-white/5 pb-4 last:border-b-0"
                >
                  {/* Rank and Name */}
                  <div className="flex items-start gap-3 mb-2">
                    <span className={rankNumSize}>{student.rank}</span>
                    <div>
                      <p className={textSize}>{student.name}</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">
                        Program: {student.program} | Year/Section: {student.yearSection || `${student.year}${student.section}`}
                      </p>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="flex items-center gap-2 ml-7">
                    <div
                      className={`flex-1 bg-white/10 rounded-full ${barHeight}`}
                    >
                      <div
                        className={`${student.color} ${barHeight} rounded-full`}
                        style={{
                          width: `${(student.violations / 6) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[13px] bg-white/10 px-2 py-1 rounded min-w-[28px] text-center">
                      {student.violations}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">
                No students found
              </div>
              <div className="text-gray-500 text-sm">
                Try adjusting your search or filter criteria
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title={"Recent Activity"}
        size="2xl"
        className="max-w-[1200px] max-h-[80vh]"
      >
        <p className="text-sm text-gray-400 mb-4">
          Full audit trail of recent admin actions.
        </p>
        <div className="max-h-[60vh] overflow-auto rounded-xl">
          <DataTable
            columns={recentActivityColumns}
            data={isLoadingActivity ? [] : recentActivity}
            onRowClick={(row) => console.log("Row clicked", row)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showRankingExportModal}
        onClose={() => {
          if (!isExportingRanking) {
            setShowRankingExportModal(false);
          }
        }}
        title={<span className="font-black font-inter">Export Student Violation Ranking Report</span>}
        size="md"
        showCloseButton={!isExportingRanking}
      >
        <p className="text-sm text-gray-300 mb-3">
          Choose a format for exporting the current table view.
        </p>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 mb-4">
          <p className="text-xs text-gray-300">
            Rows to export: <span className="font-semibold text-white">{rankingExportRows.length}</span>
          </p>
        </div>

        <label className="block text-sm font-medium text-white mb-2">Format</label>
        <div className="relative">
          <select
            value={rankingExportFormat}
            onChange={(event) => setRankingExportFormat(event.target.value)}
            disabled={isExportingRanking}
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
            onClick={() => setShowRankingExportModal(false)}
            disabled={isExportingRanking}
            className="px-6 py-2.5"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirmRankingExport}
            disabled={isExportingRanking}
            className="px-6 py-2.5"
          >
            {isExportingRanking ? "Exporting..." : "Export"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default Dashboard;
