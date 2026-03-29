import React, { useCallback, useState, useEffect, useMemo } from "react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import SearchBar from "../../components/ui/SearchBar";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import TableTabs from "../../components/ui/TableTabs";
import { Folder, Filter, Download, X, AlertCircle, MoreVertical, Edit, RotateCcw, Trash2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import EditArchiveModal from "@/components/modals/EditArchiveModal";
import { getAuditHeaders } from "@/lib/auditHeaders";

const semesterTabs = [
  { key: "1ST SEM", label: "1st Semester" },
  { key: "2ND SEM", label: "2nd Semester" },
];

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

const detectDataUrlImageFormat = (dataUrl) => {
  if (String(dataUrl || "").startsWith("data:image/jpeg")) {
    return "JPEG";
  }
  return "PNG";
};

// Helper function to safely format dates
const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "-";
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch (err) {
    console.warn("Date format error:", dateString, err);
    return "-";
  }
};

const Archives = () => {
  const [activeFolder, setActiveFolder] = useState("users");
  const [activeSemester, setActiveSemester] = useState("1ST SEM");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [isGlobalSearch, setIsGlobalSearch] = useState(false); // Default to current folder search

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [archivedViolations, setArchivedViolations] = useState([]);
  const [allArchivedViolations, setAllArchivedViolations] = useState([]); // For global search
  const [schoolYears, setSchoolYears] = useState([]);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editType, setEditType] = useState("user"); // "user" or "violation"
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [userToRestore, setUserToRestore] = useState(null);

  // School year management states
  const [isDeleteSchoolYearModalOpen, setIsDeleteSchoolYearModalOpen] = useState(false);
  const [schoolYearToDelete, setSchoolYearToDelete] = useState(null);
  const [isRenameSchoolYearModalOpen, setIsRenameSchoolYearModalOpen] = useState(false);
  const [schoolYearToRename, setSchoolYearToRename] = useState(null);
  const [newSchoolYearName, setNewSchoolYearName] = useState("");
  const [isSchoolYearActionLoading, setIsSchoolYearActionLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("excel");
  const [isExporting, setIsExporting] = useState(false);

  // Load archived users on mount
  useEffect(() => {
    const loadArchivedUsers = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch("/api/archive/users", {
          headers: { ...getAuditHeaders() },
        });
        const data = await response.json();

        if (response.ok && data.status === "ok") {
          setArchivedUsers(data.archivedUsers || []);
        } else {
          setError(data.message || "Failed to load archived users");
        }
      } catch (err) {
        setError("Failed to load archived users: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadArchivedUsers();
  }, []);

  // Listen for archive completion events from StudentViolation page
  useEffect(() => {
    const handleArchiveEvent = (event) => {
      console.log("Archive event received, refreshing school years and violations...", event.detail);
      
      // Force immediate refresh of school years
      const loadSchoolYears = async () => {
        try {
          const response = await fetch("/api/archive/school-years", {
            headers: { ...getAuditHeaders() },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("School years updated:", data.schoolYears);
            if (data.status === "ok" && Array.isArray(data.schoolYears)) {
              setSchoolYears(data.schoolYears || []);
              
              // Auto-select first folder if available
              if (data.schoolYears.length > 0 && activeFolder === "users") {
                console.log("Auto-selecting first folder:", data.schoolYears[0]);
                setActiveFolder(data.schoolYears[0]);
                setActiveSemester("1ST SEM");
              }
            }
          }
        } catch (err) {
          console.error("Error refreshing school years:", err);
        }
      };
      
      loadSchoolYears();
    };

    window.addEventListener("archiveCompleted", handleArchiveEvent);
    return () => {
      window.removeEventListener("archiveCompleted", handleArchiveEvent);
    };
  }, [activeFolder]);

  // Load school years on mount and set up periodic refresh
  useEffect(() => {
    const loadSchoolYears = async () => {
      try {
        const response = await fetch("/api/archive/school-years", {
          headers: { ...getAuditHeaders() },
        });
        
        if (!response.ok) {
          console.warn("Failed to load school years:", response.status);
          setSchoolYears([]);
          return;
        }
        
        const data = await response.json();
        console.log("Loaded archive school years:", data.schoolYears);

        if (data.status === "ok" && Array.isArray(data.schoolYears)) {
          const years = data.schoolYears || [];
          setSchoolYears(years);
          // Don't auto-select folder - keep users as default
        } else {
          setSchoolYears([]);
        }
      } catch (err) {
        console.error("Error loading school years:", err);
        setSchoolYears([]);
      }
    };

    loadSchoolYears();
    
    // Refresh school years more frequently to catch new archives
    const interval = setInterval(loadSchoolYears, 2000);
    
    // Listen for storage changes (for cross-tab communication)
    const handleStorageChange = () => {
      console.log("Storage changed, reloading school years");
      loadSchoolYears();
    };
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [activeFolder]);

  // Load violations when folder or semester changes
  useEffect(() => {
    const loadViolations = async () => {
      if (activeFolder === "users") {
        setArchivedViolations([]);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        console.log(`Loading violations for ${activeSemester} S.Y. ${activeFolder}`);

        const response = await fetch(
          `/api/archive/violations/${activeFolder}/${activeSemester}`,
          { headers: { ...getAuditHeaders() } },
        );
        const data = await response.json();

        if (response.ok && data.status === "ok") {
          const violations = data.violations || [];
          setArchivedViolations(violations);
          console.log(`✓ Loaded ${violations.length} archived violations for ${activeSemester} S.Y. ${activeFolder}`);
        } else {
          console.warn("Error loading violations:", data.message);
          setError(data.message || "Failed to load violations");
          setArchivedViolations([]);
        }
      } catch (err) {
        console.error("Error loading violations:", err);
        setError("Failed to load violations: " + err.message);
        setArchivedViolations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadViolations();
  }, [activeFolder, activeSemester]);

  // Load all violations for global search
  useEffect(() => {
    const loadAllViolations = async () => {
      if (!isGlobalSearch || allArchivedViolations.length > 0) return;

      try {
        setIsLoading(true);
        console.log("Loading all violations for global search...");

        const allViolations = [];
        for (const year of schoolYears) {
          try {
            const response1st = await fetch(`/api/archive/violations/${year}/1ST SEM`, {
              headers: { ...getAuditHeaders() },
            });
            const response2nd = await fetch(`/api/archive/violations/${year}/2ND SEM`, {
              headers: { ...getAuditHeaders() },
            });

            if (response1st.ok) {
              const data1st = await response1st.json();
              if (data1st.status === "ok" && Array.isArray(data1st.violations)) {
                allViolations.push(...(data1st.violations || []));
              }
            }

            if (response2nd.ok) {
              const data2nd = await response2nd.json();
              if (data2nd.status === "ok" && Array.isArray(data2nd.violations)) {
                allViolations.push(...(data2nd.violations || []));
              }
            }
          } catch (err) {
            console.warn(`Error loading violations for ${year}:`, err);
          }
        }

        setAllArchivedViolations(allViolations);
        console.log(`✓ Loaded ${allViolations.length} total archived violations for global search`);
      } catch (err) {
        console.error("Error loading all violations:", err);
        setAllArchivedViolations([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (isGlobalSearch && schoolYears.length > 0) {
      loadAllViolations();
    }
  }, [isGlobalSearch, schoolYears, allArchivedViolations.length]);

  // Load archived users when users folder is clicked
  useEffect(() => {
    const loadArchivedUsersData = async () => {
      if (activeFolder !== "users") {
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        console.log("Loading archived users...");
        
        const response = await fetch("/api/archive/users", {
          headers: { ...getAuditHeaders() },
        });
        const data = await response.json();

        if (response.ok && data.status === "ok") {
          setArchivedUsers(data.archivedUsers || []);
          console.log(`✓ Loaded ${(data.archivedUsers || []).length} archived users`);
        } else {
          setError(data.message || "Failed to load archived users");
          console.error("Error loading users:", data.message);
        }
      } catch (err) {
        setError("Failed to load archived users: " + err.message);
        console.error("Error loading users:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadArchivedUsersData();
  }, [activeFolder]);

  const handleSaveEdit = async (id, updatedRecord) => {
    try {
      if (editType === "user") {
        const response = await fetch(`/api/archive/users/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuditHeaders(),
          },
          body: JSON.stringify(updatedRecord),
        });

        if (response.ok) {
          const data = await response.json();
          setArchivedUsers((prev) =>
            prev.map((u) => (u.id === id ? data.user : u)),
          );
          setIsEditOpen(false);
          setSelectedRow(null);
        } else {
          const data = await response.json();
          setError(data.message || "Failed to save changes");
        }
      } else if (editType === "violation") {
        const response = await fetch(`/api/archive/violations/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuditHeaders(),
          },
          body: JSON.stringify(updatedRecord),
        });

        if (response.ok) {
          const data = await response.json();
          setArchivedViolations((prev) =>
            prev.map((v) => (v.id === id ? data.violation : v)),
          );
          setIsEditOpen(false);
          setSelectedRow(null);
        } else {
          const data = await response.json();
          setError(data.message || "Failed to save changes");
        }
      }
    } catch (err) {
      setError("Error saving edit: " + err.message);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!userToRestore) return;

    try {
      const response = await fetch(`/api/archive/users/${userToRestore.id}/restore`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
      });

      if (response.ok) {
        await response.json();
        // Remove the user from archived list
        setArchivedUsers((prev) => prev.filter((u) => u.id !== userToRestore.id));
        setIsRestoreModalOpen(false);
        setUserToRestore(null);
        // Show success message
        setError("");
      } else {
        const data = await response.json();
        setError(data.message || "Failed to restore user");
      }
    } catch (err) {
      setError("Error restoring user: " + err.message);
    }
  };

  const handleRestoreClick = (user) => {
    setUserToRestore(user);
    setIsRestoreModalOpen(true);
  };

  // School year management handlers
  const handleDeleteSchoolYear = async () => {
    if (!schoolYearToDelete) return;

    try {
      setIsSchoolYearActionLoading(true);
      const response = await fetch(`/api/archive/school-years/${schoolYearToDelete}`, {
        method: "DELETE",
        headers: { ...getAuditHeaders() },
      });

      if (response.ok) {
        const data = await response.json();
        // Remove the school year from the list
        setSchoolYears((prev) => prev.filter((year) => year !== schoolYearToDelete));
        // If the deleted year was active, switch to users folder
        if (activeFolder === schoolYearToDelete) {
          setActiveFolder("users");
          setActiveSemester("1ST SEM");
        }
        setIsDeleteSchoolYearModalOpen(false);
        setSchoolYearToDelete(null);
        setError(""); // Clear any previous errors
        // Trigger archive completion event to refresh other components
        window.dispatchEvent(new CustomEvent("archiveCompleted"));
      } else {
        const data = await response.json();
        setError(data.message || "Failed to delete school year");
      }
    } catch (err) {
      setError("Error deleting school year: " + err.message);
    } finally {
      setIsSchoolYearActionLoading(false);
    }
  };

  const handleRenameSchoolYear = async () => {
    if (!schoolYearToRename || !newSchoolYearName.trim()) return;

    try {
      setIsSchoolYearActionLoading(true);
      const response = await fetch(`/api/archive/school-years/${schoolYearToRename}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
        body: JSON.stringify({ newSchoolYear: newSchoolYearName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the school year in the list
        setSchoolYears((prev) => prev.map((year) =>
          year === schoolYearToRename ? newSchoolYearName.trim() : year
        ));
        // If the renamed year was active, update the active folder
        if (activeFolder === schoolYearToRename) {
          setActiveFolder(newSchoolYearName.trim());
        }
        setIsRenameSchoolYearModalOpen(false);
        setSchoolYearToRename(null);
        setNewSchoolYearName("");
        setError(""); // Clear any previous errors
        // Trigger archive completion event to refresh other components
        window.dispatchEvent(new CustomEvent("archiveCompleted"));
      } else {
        const data = await response.json();
        setError(data.message || "Failed to rename school year");
      }
    } catch (err) {
      setError("Error renaming school year: " + err.message);
    } finally {
      setIsSchoolYearActionLoading(false);
    }
  };

  const handleDeleteSchoolYearClick = (schoolYear) => {
    setSchoolYearToDelete(schoolYear);
    setIsDeleteSchoolYearModalOpen(true);
  };

  const handleRenameSchoolYearClick = (schoolYear) => {
    setSchoolYearToRename(schoolYear);
    setNewSchoolYearName(schoolYear);
    setIsRenameSchoolYearModalOpen(true);
  };

  // Get all folders (USERS + School Years)
  const folders = useMemo(
    () => [
      { key: "users", label: "USERS" },
      ...schoolYears.map((year) => ({
        key: year,
        label: `S.Y. ${year}`,
      })),
    ],
    [schoolYears],
  );

// Prepare data based on active folder or global search
  const displayData = useMemo(() => {
    if (!isGlobalSearch) {
      // Current folder-only search
      if (activeFolder === "users") {
        return archivedUsers.map((user) => ({
          id: user.id,
          no: "",
          full_name: user.full_name,
          schoolId: user.school_id,
          name: (
            <div>
              <div className="font-semibold">{user.full_name}</div>
              <div className="text-xs text-gray-400">{user.school_id}</div>
            </div>
          ),
          email: user.email,
          program: user.program,
          yearSection: user.year_section,
          status: user.status,
          archivedReason: user.archived_reason,
          statusDisplay: user.archived_reason ? (
            <span className="text-red-500 font-medium">{user.archived_reason}</span>
          ) : user.status === "Graduated" ? (
            <span className="text-green-700 font-medium">Graduated</span>
          ) : (
            user.status
          ),
          violationCount: user.violation_count,
          archivedDate: formatDate(user.archived_at),
          folder: "USERS",
          folderKey: "users",
          recordType: "user",
          searchableText: `${user.full_name || ""} ${user.school_id || ""} ${user.email || ""} ${user.program || ""} ${user.year_section || ""} ${user.status || ""} ${user.archived_reason || ""}`.toLowerCase(),
        }));
      } else {
        return archivedViolations.map((violation) => ({
          id: violation.id,
          no: "",
          studentNameText: violation.student_name,
          studentIdText: violation.school_id,
          studentName: (
            <div>
              <div className="font-semibold">{violation.student_name}</div>
              <div className="text-xs text-gray-400">{violation.school_id}</div>
            </div>
          ),
          yearSection: violation.year_section,
          violation: violation.violation_label,
          type:
            violation.violation_category && violation.violation_degree
              ? `${violation.violation_category} - ${violation.violation_degree}`
              : "-",
          reportedBy: violation.reported_by || "-",
          remarks: violation.remarks || "-",
          signature: violation.signature_image ? "Signed" : "No Signature",
          signatureImage: violation.signature_image,
          date: formatDate(violation.archived_at),
          archivedAt: violation.archived_at,
          violationId: violation.id,
          folder: `S.Y. ${activeFolder}`,
          folderKey: activeFolder,
          recordType: "violation",
          searchableText: `${violation.student_name || ""} ${violation.school_id || ""} ${violation.year_section || ""} ${violation.violation_label || ""} ${violation.violation_category || ""} ${violation.violation_degree || ""} ${violation.reported_by || ""} ${violation.remarks || ""}`.toLowerCase(),
        }));
      }
    } else {
      // Global search - combine all data only if loaded
      const allData = [];

      // Add users from USERS folder, only real entries
      archivedUsers.forEach((user) => {
        const hasUser =
          (user.full_name && user.full_name.trim()) ||
          (user.school_id && user.school_id.trim()) ||
          (user.email && user.email.trim());
        if (!hasUser) return;

        allData.push({
          id: user.id,
          no: "",
          full_name: user.full_name,
          schoolId: user.school_id,
          name: (
            <div>
              <div className="font-semibold">{user.full_name}</div>
              <div className="text-xs text-gray-400">{user.school_id}</div>
            </div>
          ),
          email: user.email,
          program: user.program,
          yearSection: user.year_section,
          status: user.status,
          archivedReason: user.archived_reason,
          statusDisplay: user.archived_reason ? (
            <span className="text-red-500 font-medium">{user.archived_reason}</span>
          ) : user.status === "Graduated" ? (
            <span className="text-green-700 font-medium">Graduated</span>
          ) : (
            user.status
          ),
          violationCount: user.violation_count,
          archivedDate: formatDate(user.archived_at),
          folder: "USERS",
          folderKey: "users",
          recordType: "user",
          // Add searchable text for global search
          searchableText: `${user.full_name || ""} ${user.school_id || ""} ${user.email || ""} ${user.program || ""} ${user.year_section || ""} ${user.status || ""} ${user.archived_reason || ""}`.toLowerCase(),
        });
      });

      // Add violations from all school years only if data is loaded
      if (allArchivedViolations.length > 0) {
        allArchivedViolations.forEach((violation) => {
          const hasViolation =
            (violation.student_name && violation.student_name.trim()) ||
            (violation.school_id && violation.school_id.trim());
          if (!hasViolation) return;

          allData.push({
            id: violation.id,
            no: "",
            studentNameText: violation.student_name,
            studentIdText: violation.school_id,
            studentName: (
              <div>
                <div className="font-semibold">{violation.student_name}</div>
                <div className="text-xs text-gray-400">{violation.school_id}</div>
              </div>
            ),
            yearSection: violation.year_section,
            violation: violation.violation_label,
            type:
              violation.violation_category && violation.violation_degree
                ? `${violation.violation_category} - ${violation.violation_degree}`
                : "-",
            reportedBy: violation.reported_by || "-",
            remarks: violation.remarks || "-",
            signature: violation.signature_image ? "Signed" : "No Signature",
            signatureImage: violation.signature_image,
            date: formatDate(violation.archived_at),
            archivedAt: violation.archived_at,
            violationId: violation.id,
            folder: `S.Y. ${violation.school_year}`,
            folderKey: violation.school_year,
            recordType: "violation",
            // Add searchable text for global search
            searchableText: `${violation.student_name || ""} ${violation.school_id || ""} ${violation.year_section || ""} ${violation.violation_label || ""} ${violation.violation_category || ""} ${violation.violation_degree || ""} ${violation.reported_by || ""} ${violation.remarks || ""}`.toLowerCase(),
          });
        });
      }

      return allData;
    }
  }, [activeFolder, archivedUsers, archivedViolations, allArchivedViolations, isGlobalSearch]);

  // Filter function
  const filteredData = useMemo(() => {
    if (isGlobalSearch) {
      if (!searchQuery.trim()) {
        return [];
      }
    }

    if (!searchQuery) {
      return displayData.map((item, index) => ({
        ...item,
        no: index + 1,
      }));
    }

    const query = searchQuery.toLowerCase();

    if (!isGlobalSearch) {
      // Current folder-only search
      const filtered = displayData.filter((item) => {
        const fullText = (item.searchableText || "").toLowerCase();
        if (!fullText.includes(query)) {
          return false;
        }

        if (
          filterType &&
          item.type &&
          !item.type.toLowerCase().includes(filterType.toLowerCase())
        ) {
          return false;
        }

        return true;
      });

      return filtered.map((item, index) => ({
        ...item,
        no: index + 1,
      }));
    } else {
      // Global search - only proceed if we have data
      if (displayData.length === 0) {
        return [];
      }

      // Global search - search across folders and records
      const matchingFolders = new Set();
      const matchingRecords = [];

      // Check folder names
      folders.forEach((folder) => {
        if (folder.label.toLowerCase().includes(query)) {
          matchingFolders.add(folder.key);
        }
      });

      // Check records
      displayData.forEach((item) => {
        if (item.searchableText && item.searchableText.includes(query)) {
          matchingRecords.push(item);
          matchingFolders.add(item.folderKey);
        }
      });

      // Combine results: folders with their records
      const results = [];

      // First, add folders that match the search
      folders.forEach((folder) => {
        if (matchingFolders.has(folder.key)) {
          // Add folder header
          results.push({
            id: `folder-${folder.key}`,
            isFolder: true,
            folderName: folder.label,
            folderKey: folder.key,
            no: "",
          });

          // Add matching records from this folder
          const folderRecords = matchingRecords.filter(record => record.folderKey === folder.key);
          folderRecords.forEach((record) => {
            results.push({
              ...record,
              no: "",
            });
          });
        }
      });

      return results;
    }
  }, [displayData, searchQuery, filterType, isGlobalSearch, folders]);

  const usersExportRows = useMemo(
    () =>
      filteredData
        .filter((row) => !row.isFolder)
        .map((row, index) => ({
          no: index + 1,
          schoolId: String(row.schoolId || ""),
          studentName: String(row.full_name || ""),
          program: String(row.program || ""),
          yearSection: String(row.yearSection || ""),
          status: String(row.status || ""),
          violationCount: Number(row.violationCount) || 0,
        })),
    [filteredData],
  );

  const violationsExportRows = useMemo(
    () =>
      filteredData
        .filter((row) => !row.isFolder)
        .map((row, index) => ({
          no: index + 1,
          date: row.date || "",
          studentName: row.studentNameText || "",
          schoolId: row.studentIdText || "",
          yearSection: row.yearSection || "",
          violation: row.violation || "",
          reportedBy: row.reportedBy || "-",
          remarks: row.remarks || "-",
          signatureImage: row.signatureImage || "",
          status: "Archived",
        })),
    [filteredData],
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

  const exportUsersAsExcel = useCallback(async () => {
    const [{ Workbook }, { dataUrl, dimensions }] = await Promise.all([
      import("exceljs"),
      resolveHeaderImage(),
    ]);

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Archived Users", {
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
    titleCell.value = "Archived Users Report";
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
    for (const [index, row] of usersExportRows.entries()) {
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
    const filename = `archived_users_${formatDateForFileName()}.xlsx`;
    downloadBlob(blob, filename);
  }, [downloadBlob, resolveHeaderImage, usersExportRows]);

  const exportUsersAsPdf = useCallback(async () => {
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
    doc.text("Archived Users Report", tableCenterX, startY, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, tableCenterX, startY + 5, {
      align: "center",
    });

    autoTable(doc, {
      startY: startY + 9,
      head: [["No", "School ID", "Student Name", "Program", "Year/Section", "Status", "Violation Count"]],
      body: usersExportRows.map((row) => [
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

    doc.save(`archived_users_${formatDateForFileName()}.pdf`);
  }, [resolveHeaderImage, usersExportRows]);

  const exportViolationsAsExcel = useCallback(async () => {
    const [{ Workbook }, { dataUrl }] = await Promise.all([
      import("exceljs"),
      resolveHeaderImage(),
    ]);

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Archived Violations", {
      views: [{ state: "frozen", ySplit: 6 }],
    });

    sheet.columns = [
      { key: "no", width: 6 },
      { key: "date", width: 13 },
      { key: "studentName", width: 22 },
      { key: "schoolId", width: 14 },
      { key: "yearSection", width: 12 },
      { key: "violation", width: 38 },
      { key: "reportedBy", width: 17 },
      { key: "remarks", width: 24 },
      { key: "signature", width: 16 },
      { key: "status", width: 14 },
    ];

    sheet.mergeCells("A1:J3");
    sheet.mergeCells("A4:J4");
    sheet.mergeCells("A5:J5");
    sheet.getRow(1).height = 26;
    sheet.getRow(2).height = 26;
    sheet.getRow(3).height = 26;
    sheet.getRow(4).height = 28;
    sheet.getRow(5).height = 18;

    const titleCell = sheet.getCell("A4");
    titleCell.value = `Archived Student Records Report - S.Y. ${activeFolder} (${activeSemester})`;
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
    const leftOffsetPx = Math.max((headerRegionWidthPx - EXCEL_HEADER_IMAGE_WIDTH_PX) / 2, 0);
    const topOffsetPx = Math.max((headerRegionHeightPx - EXCEL_HEADER_IMAGE_HEIGHT_PX) / 2, 0);

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

    const imageId = workbook.addImage({ base64: dataUrl, extension: "png" });
    sheet.addImage(imageId, {
      tl: {
        col: toColCoordinate(leftOffsetPx),
        row: toRowCoordinate(topOffsetPx),
      },
      ext: {
        width: EXCEL_HEADER_IMAGE_WIDTH_PX,
        height: EXCEL_HEADER_IMAGE_HEIGHT_PX,
      },
    });

    const headerRowNumber = 6;
    const headerRow = sheet.getRow(headerRowNumber);
    headerRow.values = [
      "No",
      "Date",
      "Student Name",
      "School ID",
      "Year/Section",
      "Violation",
      "Reported By",
      "Remarks",
      "Signature",
      "Status",
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
    for (const [index, row] of violationsExportRows.entries()) {
      const excelRowNumber = firstDataRow + index;
      const excelRow = sheet.getRow(excelRowNumber);
      excelRow.values = [
        row.no,
        row.date,
        row.studentName,
        row.schoolId,
        row.yearSection,
        row.violation,
        row.reportedBy,
        row.remarks,
        "",
        row.status,
      ];
      excelRow.height = 34;

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

      if (row.signatureImage) {
        const sigExt = String(row.signatureImage).startsWith("data:image/jpeg")
          ? "jpeg"
          : "png";
        const sigDims = await getDataUrlDimensions(row.signatureImage);
        const signatureColWidthUnits = sheet.columns[8]?.width || 16;
        const signatureColWidthPx = signatureColWidthUnits * 7.5;
        const rowHeightPx = (excelRow.height || 34) * 1.333;
        const maxSigWidth = Math.max(signatureColWidthPx - 12, 8);
        const maxSigHeight = Math.max(rowHeightPx - 8, 8);
        const sigScale = Math.min(maxSigWidth / sigDims.width, maxSigHeight / sigDims.height, 1);
        const drawWidth = Math.max(8, Math.round(sigDims.width * sigScale));
        const drawHeight = Math.max(8, Math.round(sigDims.height * sigScale));
        const xOffsetPx = (signatureColWidthPx - drawWidth) / 2;
        const yOffsetPx = (rowHeightPx - drawHeight) / 2;
        const signatureImageId = workbook.addImage({
          base64: row.signatureImage,
          extension: sigExt,
        });

        sheet.addImage(signatureImageId, {
          tl: {
            col: 8 + xOffsetPx / 7.5,
            row: excelRowNumber - 1 + yOffsetPx / rowHeightPx,
          },
          ext: { width: drawWidth, height: drawHeight },
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const filename = `archived_student_records_${formatDateForFileName()}.xlsx`;
    downloadBlob(blob, filename);
  }, [activeFolder, activeSemester, downloadBlob, resolveHeaderImage, violationsExportRows]);

  const exportViolationsAsPdf = useCallback(async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const { dataUrl } = await resolveHeaderImage();
    let startY = 22;

    if (dataUrl) {
      const imgProps = doc.getImageProperties(dataUrl);
      const maxHeaderWidth = 220;
      const calculatedHeight = (imgProps.height * maxHeaderWidth) / imgProps.width;
      const headerWidth = Math.min(maxHeaderWidth, 260);
      const headerHeight = calculatedHeight;
      const headerX = (doc.internal.pageSize.getWidth() - headerWidth) / 2;
      doc.addImage(dataUrl, "PNG", headerX, 8, headerWidth, headerHeight);
      startY = 8 + headerHeight + 8;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Archived Student Records Report", 148.5, startY, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 148.5, startY + 5, {
      align: "center",
    });

    autoTable(doc, {
      startY: startY + 9,
      head: [
        [
          "No",
          "Date",
          "Student Name",
          "School ID",
          "Year/Section",
          "Violation",
          "Reported By",
          "Remarks",
          "Signature",
          "Status",
        ],
      ],
      body: violationsExportRows.map((row) => [
        row.no,
        row.date,
        row.studentName,
        row.schoolId,
        row.yearSection,
        row.violation,
        row.reportedBy,
        row.remarks,
        "",
        row.status,
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
      margin: { left: 10, right: 10 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 22 },
        2: { cellWidth: 36 },
        3: { cellWidth: 26 },
        4: { cellWidth: 22 },
        5: { cellWidth: 40 },
        6: { cellWidth: 26 },
        7: { cellWidth: 50 },
        8: { cellWidth: 22, minCellHeight: 12 },
        9: { cellWidth: 22 },
      },
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index !== 8) {
          return;
        }

        const signatureImage = violationsExportRows[data.row.index]?.signatureImage;
        if (!signatureImage) {
          return;
        }

        const imgFormat = detectDataUrlImageFormat(signatureImage);
        const maxW = Math.max(data.cell.width - 2, 2);
        const maxH = Math.max(data.cell.height - 2, 2);
        const imgW = Math.min(maxW, 18);
        const imgH = Math.min(maxH, 8);
        const imgX = data.cell.x + (data.cell.width - imgW) / 2;
        const imgY = data.cell.y + (data.cell.height - imgH) / 2;

        data.doc.addImage(signatureImage, imgFormat, imgX, imgY, imgW, imgH);
      },
    });

    doc.save(`archived_student_records_${formatDateForFileName()}.pdf`);
  }, [resolveHeaderImage, violationsExportRows]);

  const handleConfirmExport = async () => {
    const isUsersFolder = activeFolder === "users";
    const exportRows = isUsersFolder ? usersExportRows : violationsExportRows;

    if (exportRows.length === 0) {
      alert("No rows available to export.");
      return;
    }

    setIsExporting(true);
    try {
      if (isUsersFolder) {
        if (exportFormat === "excel") {
          await exportUsersAsExcel();
        } else {
          await exportUsersAsPdf();
        }
      } else if (exportFormat === "excel") {
        await exportViolationsAsExcel();
      } else {
        await exportViolationsAsPdf();
      }

      setShowExportModal(false);
    } catch (err) {
      alert(err?.message || "Unable to export report.");
    } finally {
      setIsExporting(false);
    }
  };

  // Define columns based on active folder and search mode
  const columns = useMemo(() => {
    if (isGlobalSearch && searchQuery) {
      // Global search columns
      return [
        {
          key: "folderName",
          label: "Results",
          render: (value, row) => {
            if (row.isFolder) {
              return (
                <div className="flex items-center gap-2 py-2">
                  <Folder className="w-5 h-5 text-[#A3AED0]" />
                  <span className="font-semibold text-[#A3AED0]">{row.folderName}</span>
                </div>
              );
            } else {
              // Record row
              return (
                <div className="ml-6">
                  {row.recordType === "user" ? (
                    <div className="flex flex-col">
                      <div className="font-semibold">{row.full_name}</div>
                      <div className="text-xs text-gray-400">{row.email}</div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="font-semibold">{row.studentName}</div>
                      <div className="text-xs text-gray-400">{row.violation}</div>
                    </div>
                  )}
                </div>
              );
            }
          },
        },
        {
          key: "details",
          label: "",
          render: (value, row) => {
            if (row.isFolder) {
              return null;
            }
            return row.recordType === "user" ? (
              <div className="text-sm text-gray-300">
                <div>Program: {row.program}</div>
                <div>Status: {row.statusDisplay}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-300">
                <div>Type: {row.type}</div>
                <div>Date: {row.date}</div>
              </div>
            );
          },
        },
        {
          key: "actions",
          label: "",
          align: "center",
          render: (_value, row) => {
            if (row.isFolder) {
              return (
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2 bg-[#A3AED0] text-[#23262B] hover:bg-[#8B9CB8] border-0"
                  onClick={() => {
                    setActiveFolder(row.folderKey);
                    setIsGlobalSearch(false);
                    setSearchQuery("");
                  }}
                >
                  <Folder className="w-4 h-4" />
                  Open Folder
                </Button>
              );
            }

            // Record actions
            if (row.recordType === "user") {
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center justify-center rounded-md p-1 hover:bg-[#3D4654] transition-colors">
                      <MoreVertical className="w-5 h-5 text-[#A3AED0]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white/95 border-white/20 text-gray-800">
                    <DropdownMenuItem onClick={() => handleEdit(row, "user")} className="gap-2 cursor-pointer text-gray-900 hover:bg-gray-200 hover:text-gray-900 focus:bg-gray-200 focus:text-gray-900">
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    {row.status !== "Graduated" && (
                      <DropdownMenuItem onClick={() => handleRestoreClick(row)} className="gap-2 cursor-pointer text-green-700 hover:bg-green-100 hover:text-green-800 focus:bg-green-100 focus:text-green-800">
                        <RotateCcw className="w-4 h-4" />
                        <span>Restore</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            } else {
              return (
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2 bg-[#A3AED0] text-[#23262B] hover:bg-[#8B9CB8] border-0"
                  onClick={() => handleEdit(row, "violation")}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              );
            }
          },
        },
      ];
    } else {
      // Regular folder view columns
      return activeFolder === "users"
        ? [
            {
              key: "no",
              label: "No",
              width: "w-10",
              render: (value) => <span>{value}</span>,
            },
            {
              key: "name",
              label: "Full Name",
              render: (value) => value,
            },
            {
              key: "email",
              label: "Email",
            },
            {
              key: "program",
              label: "Program",
            },
            {
              key: "yearSection",
              label: "Year/Section",
            },
            {
              key: "status",
              label: "Status",
              render: (value, row) => row.statusDisplay || value,
            },
            {
              key: "violationCount",
              label: "Violation Count",
            },
            {
              key: "archivedDate",
              label: "Archived Date",
            },
            {
              key: "actions",
              label: "",
              align: "center",
              render: (_value, row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center justify-center rounded-md p-1 hover:bg-[#3D4654] transition-colors">
                      <MoreVertical className="w-5 h-5 text-[#A3AED0]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white/95 border-white/20 text-gray-800">
                    <DropdownMenuItem onClick={() => handleEdit(row, "user")} className="gap-2 cursor-pointer text-gray-900 hover:bg-gray-200 hover:text-gray-900 focus:bg-gray-200 focus:text-gray-900">
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    {row.status !== "Graduated" && (
                      <DropdownMenuItem onClick={() => handleRestoreClick(row)} className="gap-2 cursor-pointer text-green-700 hover:bg-green-100 hover:text-green-800 focus:bg-green-100 focus:text-green-800">
                        <RotateCcw className="w-4 h-4" />
                        <span>Restore</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
          ]
        : [
            {
              key: "no",
              label: "No",
              width: "w-10",
              render: (value) => <span>{value}</span>,
            },
            {
              key: "date",
              label: "Date",
              render: (value) => value,
            },
            {
              key: "studentName",
              label: "Student Name",
              render: (value) => value,
            },
            {
              key: "yearSection",
              label: "Year/Section",
            },
            {
              key: "violation",
              label: "Violation",
            },
            {
              key: "type",
              label: "Type",
            },
            {
              key: "reportedBy",
              label: "Reported by",
            },
            {
              key: "remarks",
              label: "Remarks",
            },
            {
              key: "signature",
              label: "Signature",
              render: (value) => (
                <Button
                  size="sm"
                  variant="secondary"
                  className={`px-3 py-1 ${
                    value === "Signed"
                      ? "bg-green-600/50 text-green-200"
                      : "bg-gray-600/50 text-gray-200"
                  }`}
                >
                  {value}
                </Button>
              ),
            },
            {
              key: "actions",
              label: "",
              align: "center",
              render: (_value, row) => (
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2 bg-[#A3AED0] text-[#23262B] hover:bg-[#8B9CB8] border-0"
                  onClick={() => handleEdit(row, "violation")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536M9 13l6.536-6.536a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm0 0V17h4"
                    />
                  </svg>
                  Edit
                </Button>
              ),
            },
          ];
    }
  }, [activeFolder, isGlobalSearch, searchQuery]);

  const tableTitle = isGlobalSearch
    ? searchQuery
      ? `Global Search Results for "${searchQuery}"`
      : "Global Search (enter keywords to find records)"
    : activeFolder === "users"
    ? "Archived Users"
    : `Archived Student Records - S.Y. ${activeFolder} (${activeSemester})`;

  const handleEdit = (row, type) => {
    setSelectedRow(row);
    setEditType(type);
    setIsEditOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("");
    if (isGlobalSearch) {
      setIsGlobalSearch(false);
      setAllArchivedViolations([]); // Clear global search data
    }
  };

  return (
    <div className="text-white">
      <AnimatedContent>
        <h2 className="text-xl font-bold mb-2 tracking-wide">
          SYSTEM ARCHIVES{" "}
          <span className="font-normal">
            &gt;{" "}
            {folders.find((f) => f.key === activeFolder)?.label ||
              activeFolder}
          </span>
        </h2>
      </AnimatedContent>

      {error && (
        <AnimatedContent delay={0.05}>
          <div className="mb-4 bg-red-500/10 border border-red-500/40 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </AnimatedContent>
      )}

      <AnimatedContent delay={0.1}>
        <div className="flex gap-4 items-center mb-4">
          <SearchBar
            placeholder={
              isGlobalSearch
                ? "Search across all folders..."
                : `Search ${activeFolder === "users" ? "users" : "records"}...`
            }
            className="flex-1 w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Search Mode:</label>
            <Button
              size="sm"
              variant={isGlobalSearch ? "default" : "secondary"}
              className={`px-3 py-1 text-xs ${
                isGlobalSearch
                  ? "bg-[#A3AED0] text-[#23262B] hover:bg-[#8B9CB8]"
                  : "bg-[#3D4654] hover:bg-[#4d5664] text-gray-300"
              } border-0`}
              onClick={() => {
                setIsGlobalSearch(true);
                setSearchQuery(""); // Clear search when switching to global
                setFilterType("");
              }}
            >
              Global
            </Button>
            <Button
              size="sm"
              variant={!isGlobalSearch ? "default" : "secondary"}
              className={`px-3 py-1 text-xs ${
                !isGlobalSearch
                  ? "bg-[#A3AED0] text-[#23262B] hover:bg-[#8B9CB8]"
                  : "bg-[#3D4654] hover:bg-[#4d5664] text-gray-300"
              } border-0`}
              onClick={() => {
                setIsGlobalSearch(false);
                setSearchQuery(""); // Clear search when switching to current folder
                setFilterType("");
                setAllArchivedViolations([]); // Clear global search data
              }}
            >
              Current Folder
            </Button>
          </div>
        </div>
      </AnimatedContent>

      <AnimatedContent delay={0.2}>
        {!isGlobalSearch && (
          <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
            {folders.map((folder) => (
              <div key={folder.key} className="relative flex-shrink-0">
                <button
                  onClick={() => {
                    setActiveFolder(folder.key);
                    setActiveSemester("1ST SEM");
                  }}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-200 ${folder.key !== "users" ? "pr-8" : ""} ${
                    activeFolder === folder.key
                      ? "bg-[#23262B] border-2 border-[#A3AED0]"
                      : "bg-[#23262B]/60 border border-transparent"
                  } hover:bg-[#23262B]`}
                >
                  <span className="mb-2 flex items-center justify-center w-[80px] h-[60px]">
                    <Folder className="w-8 h-8" />
                  </span>
                  <span className="text-xs font-semibold text-white text-center w-full">
                    {folder.label}
                  </span>
                </button>
                {folder.key !== "users" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="absolute top-1 right-1 w-6 h-6 hover:bg-[#3D4654] rounded-full flex items-center justify-center transition-colors">
                        <MoreVertical className="w-3 h-3 text-[#A3AED0]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white/95 border-white/20 text-gray-800">
                      <DropdownMenuItem
                        onClick={() => handleRenameSchoolYearClick(folder.key)}
                        className="gap-2 cursor-pointer text-gray-900 hover:bg-gray-200 hover:text-gray-900 focus:bg-gray-200 focus:text-gray-900"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteSchoolYearClick(folder.key)}
                        className="gap-2 cursor-pointer text-red-700 hover:bg-red-100 hover:text-red-800 focus:bg-red-100 focus:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </AnimatedContent>

      {activeFolder !== "users" && !isGlobalSearch && (
        <AnimatedContent delay={0.25}>
          <TableTabs
            tabs={semesterTabs}
            activeTab={activeSemester}
            onTabChange={setActiveSemester}
            className="mb-4"
          />
        </AnimatedContent>
      )}

      <AnimatedContent delay={0.4}>
        <div className="bg-[#23262B] rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">{tableTitle}</h3>

          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              {activeFolder !== "users" && !isGlobalSearch && (
                <>
                  {/* Violation Type Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className={`gap-2 ${
                          filterType
                            ? "bg-[#4A9B9B] hover:bg-[#5aabab]"
                            : "bg-[#A3AED0] hover:bg-[#b3bde0]"
                        } text-[#23262B] border-0 transition-colors`}
                      >
                        <Filter className="w-4 h-4" />
                        {filterType || "Violation Type"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setFilterType("")}>
                        All Types
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setFilterType("Minor Offenses")}
                      >
                        Minor Offenses
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setFilterType("Major Offenses")}
                      >
                        Major Offenses
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {/* Clear Filters Button */}
              {(filterType || searchQuery || isGlobalSearch) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2 bg-[#4A5568] hover:bg-[#3d4654] border-0"
                >
                  <X className="w-4 h-4" /> Clear Filters
                </Button>
              )}
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-[#A3AED0] text-[#23262B] hover:bg-[#8B9CB8] border-0"
              disabled={isGlobalSearch || filteredData.length === 0}
              onClick={() => setShowExportModal(true)}
            >
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <p className="mt-2">
                {isGlobalSearch && searchQuery
                  ? "Searching across all folders..."
                  : "Loading data..."}
              </p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {isGlobalSearch
                ? searchQuery
                  ? "No matching folders or records found"
                  : "Enter a search term to start global search"
                : activeFolder === "users"
                ? "No archived users found"
                : "No records found for this semester."}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredData}
              onRowClick={(row) => {
                if (!isGlobalSearch) return;

                if (row.isFolder) {
                  setActiveFolder(row.folderKey);
                  setActiveSemester("1ST SEM");
                  setIsGlobalSearch(false);
                  setSearchQuery("");
                  setFilterType("");
                  return;
                }

                if (row.recordType === "user") {
                  setActiveFolder("users");
                } else if (row.recordType === "violation") {
                  setActiveFolder(row.folderKey || "users");
                  setActiveSemester("1ST SEM");
                }
                setIsGlobalSearch(false);
                setSearchQuery("");
                setFilterType("");
              }}
            />
          )}
        </div>
      </AnimatedContent>

      {/* Edit Modal */}
      {isEditOpen && selectedRow && (
        <EditArchiveModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedRow(null);
          }}
          record={selectedRow}
          editType={editType}
          onSave={handleSaveEdit}
        />
      )}

      {/* Restore Confirmation Modal */}
      {isRestoreModalOpen && userToRestore && (
        <Modal isOpen={isRestoreModalOpen} onClose={() => { setIsRestoreModalOpen(false); setUserToRestore(null); }} showCloseButton={true}>
          <div className="bg-transparent">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-bold text-white">Confirm Restore</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to restore{" "}
              <span className="font-semibold text-[#A3AED0]">
                {userToRestore.full_name || userToRestore.name}
              </span>
              ? This user will be moved back to the user management and become active again.
            </p>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setUserToRestore(null);
                }}
                className="bg-[#3D4654] hover:bg-[#4d5664] border-0"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRestoreConfirm}
                className="bg-green-700 hover:bg-green-800 border-0 text-white"
              >
                Restore User
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* Delete School Year Confirmation Modal */}
      {isDeleteSchoolYearModalOpen && schoolYearToDelete && (
        <Modal
          isOpen={isDeleteSchoolYearModalOpen}
          onClose={() => {
            setIsDeleteSchoolYearModalOpen(false);
            setSchoolYearToDelete(null);
          }}
          showCloseButton={true}
        >
          <div className="bg-transparent">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-bold text-white">Confirm Delete School Year</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the school year{" "}
              <span className="font-semibold text-[#A3AED0]">
                S.Y. {schoolYearToDelete}
              </span>
              ? This will permanently delete all archived violation records for this school year and cannot be undone.
            </p>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDeleteSchoolYearModalOpen(false);
                  setSchoolYearToDelete(null);
                }}
                className="bg-[#3D4654] hover:bg-[#4d5664] border-0"
                disabled={isSchoolYearActionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteSchoolYear}
                disabled={isSchoolYearActionLoading}
                className="bg-red-700 hover:bg-red-800 border-0 text-white"
              >
                {isSchoolYearActionLoading ? "Deleting..." : "Delete School Year"}
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* Rename School Year Modal */}
      {isRenameSchoolYearModalOpen && schoolYearToRename && (
        <Modal
          isOpen={isRenameSchoolYearModalOpen}
          onClose={() => {
            setIsRenameSchoolYearModalOpen(false);
            setSchoolYearToRename(null);
            setNewSchoolYearName("");
          }}
          showCloseButton={true}
        >
          <div className="bg-transparent">
            <div className="flex items-center gap-3 mb-4">
              <Edit className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Rename School Year</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Enter a new name for the school year{" "}
              <span className="font-semibold text-[#A3AED0]">
                S.Y. {schoolYearToRename}
              </span>
              :
            </p>
            <div className="mb-6">
              <input
                type="text"
                value={newSchoolYearName}
                onChange={(e) => setNewSchoolYearName(e.target.value)}
                className="w-full px-3 py-2 bg-[#23262B] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#A3AED0]"
                placeholder="e.g., 2024-2025"
                disabled={isSchoolYearActionLoading}
              />
            </div>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsRenameSchoolYearModalOpen(false);
                  setSchoolYearToRename(null);
                  setNewSchoolYearName("");
                }}
                className="bg-[#3D4654] hover:bg-[#4d5664] border-0"
                disabled={isSchoolYearActionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRenameSchoolYear}
                disabled={isSchoolYearActionLoading || !newSchoolYearName.trim() || newSchoolYearName.trim() === schoolYearToRename}
                className="bg-blue-700 hover:bg-blue-800 border-0 text-white"
              >
                {isSchoolYearActionLoading ? "Renaming..." : "Rename School Year"}
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      <Modal
        isOpen={showExportModal}
        onClose={() => {
          if (!isExporting) {
            setShowExportModal(false);
          }
        }}
        title={<span className="font-black font-inter">Export Archive Report</span>}
        size="md"
        showCloseButton={!isExporting}
      >
        <p className="text-sm text-gray-300 mb-3">
          Choose a format for exporting the current table view.
        </p>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 mb-4">
          <p className="text-xs text-gray-300">
            Rows to export:{" "}
            <span className="font-semibold text-white">
              {activeFolder === "users" ? usersExportRows.length : violationsExportRows.length}
            </span>
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
    </div>
  );
};

export default Archives;
