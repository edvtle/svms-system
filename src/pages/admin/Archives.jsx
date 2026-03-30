import React, { useState, useEffect, useMemo } from "react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import SearchBar from "../../components/ui/SearchBar";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import TableTabs from "../../components/ui/TableTabs";
import { Folder, Filter, Download, X, AlertCircle, MoreVertical, Edit, RotateCcw, Trash2, Check } from "lucide-react";
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
  { key: "SUMMER", label: "Summer" },
];

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
  const [allUnresolvedViolations, setAllUnresolvedViolations] = useState([]); // Global unresolved records
  const [schoolYears, setSchoolYears] = useState([]);
  const [unresolvedSchoolYears, setUnresolvedSchoolYears] = useState([]);
  const [selectedUnresolvedYear, setSelectedUnresolvedYear] = useState("");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editType, setEditType] = useState("user"); // "user" or "violation"
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [userToRestore, setUserToRestore] = useState(null);
  const [archiveSuccessMessage, setArchiveSuccessMessage] = useState("");

  // School year management states
  const [isDeleteSchoolYearModalOpen, setIsDeleteSchoolYearModalOpen] = useState(false);
  const [schoolYearToDelete, setSchoolYearToDelete] = useState(null);
  const [isRenameSchoolYearModalOpen, setIsRenameSchoolYearModalOpen] = useState(false);
  const [schoolYearToRename, setSchoolYearToRename] = useState(null);
  const [newSchoolYearName, setNewSchoolYearName] = useState("");
  const [isSchoolYearActionLoading, setIsSchoolYearActionLoading] = useState(false);

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

  // Load unresolved school years for UNRESOLVED folder
  useEffect(() => {
    const loadUnresolvedSchoolYears = async () => {
      if (activeFolder !== "unresolved") {
        return;
      }

      try {
        const response = await fetch("/api/archive/unresolved-school-years", {
          headers: { ...getAuditHeaders() },
        });
        const data = await response.json();

        if (response.ok && data.status === "ok" && Array.isArray(data.schoolYears)) {
          setUnresolvedSchoolYears(data.schoolYears);
        } else {
          setUnresolvedSchoolYears([]);
        }
      } catch (err) {
        console.error("Error loading unresolved school years:", err);
        setUnresolvedSchoolYears([]);
      }
    };

    loadUnresolvedSchoolYears();
  }, [activeFolder]);

  // Load violations when folder or semester changes
  useEffect(() => {
    const loadViolations = async () => {
      if (activeFolder === "users") {
        setArchivedViolations([]);
        return;
      }

      if (activeFolder === "unresolved" && !selectedUnresolvedYear) {
        setArchivedViolations([]);
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const targetYear =
          activeFolder === "unresolved" ? selectedUnresolvedYear : activeFolder;

        console.log(
          `Loading violations for ${activeSemester} S.Y. ${targetYear} (${activeFolder})`,
        );

        const endpoint =
          activeFolder === "unresolved"
            ? `/api/archive/unresolved/${encodeURIComponent(targetYear)}/${encodeURIComponent(activeSemester)}`
            : `/api/archive/violations/${encodeURIComponent(targetYear)}/${encodeURIComponent(activeSemester)}`;

        const response = await fetch(endpoint, {
          headers: { ...getAuditHeaders() },
        });

        const data = await response.json();

        if (response.ok && data.status === "ok") {
          const violations = data.violations || [];
          setArchivedViolations(violations);
          console.log(
            `✓ Loaded ${violations.length} archived violations for ${activeSemester} S.Y. ${targetYear}`,
          );
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
  }, [activeFolder, activeSemester, selectedUnresolvedYear]);

  // Load all violations for global search
  useEffect(() => {
    const loadAllViolations = async () => {
      if (!isGlobalSearch || allArchivedViolations.length > 0) return;

      try {
        setIsLoading(true);
        console.log("Loading all violations for global search...");

        const allViolations = [];
        const unresolvedAll = [];

        for (const year of schoolYears) {
          try {
            const response1st = await fetch(`/api/archive/violations/${year}/1ST SEM`, {
              headers: { ...getAuditHeaders() },
            });
            const response2nd = await fetch(`/api/archive/violations/${year}/2ND SEM`, {
              headers: { ...getAuditHeaders() },
            });
            const responseSummer = await fetch(`/api/archive/violations/${year}/SUMMER`, {
              headers: { ...getAuditHeaders() },
            });
            const unresolved1st = await fetch(`/api/archive/unresolved/${year}/1ST SEM`, {
              headers: { ...getAuditHeaders() },
            });
            const unresolved2nd = await fetch(`/api/archive/unresolved/${year}/2ND SEM`, {
              headers: { ...getAuditHeaders() },
            });
            const unresolvedSummer = await fetch(`/api/archive/unresolved/${year}/SUMMER`, {
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

            if (responseSummer.ok) {
              const dataSummer = await responseSummer.json();
              if (dataSummer.status === "ok" && Array.isArray(dataSummer.violations)) {
                allViolations.push(...(dataSummer.violations || []));
              }
            }

            if (unresolved1st.ok) {
              const dataUnresolved1st = await unresolved1st.json();
              if (dataUnresolved1st.status === "ok" && Array.isArray(dataUnresolved1st.violations)) {
                unresolvedAll.push(
                  ...dataUnresolved1st.violations.map((v) => ({ ...v, isUnresolved: true })),
                );
              }
            }

            if (unresolved2nd.ok) {
              const dataUnresolved2nd = await unresolved2nd.json();
              if (dataUnresolved2nd.status === "ok" && Array.isArray(dataUnresolved2nd.violations)) {
                unresolvedAll.push(
                  ...dataUnresolved2nd.violations.map((v) => ({ ...v, isUnresolved: true })),
                );
              }
            }

            if (unresolvedSummer.ok) {
              const dataUnresolvedSummer = await unresolvedSummer.json();
              if (dataUnresolvedSummer.status === "ok" && Array.isArray(dataUnresolvedSummer.violations)) {
                unresolvedAll.push(
                  ...dataUnresolvedSummer.violations.map((v) => ({ ...v, isUnresolved: true })),
                );
              }
            }
          } catch (err) {
            console.warn(`Error loading violations for ${year}:`, err);
          }
        }

        setAllUnresolvedViolations(unresolvedAll);

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

  // Reset unresolved selection when leaving unresolved folder
  useEffect(() => {
    if (activeFolder !== "unresolved") {
      setSelectedUnresolvedYear("");
    }
  }, [activeFolder]);

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

  // Get all folders (USERS + UNRESOLVED + School Years)
  const folders = useMemo(
    () => [
      { key: "users", label: "USERS" },
      { key: "unresolved", label: "UNRESOLVED" },
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
          folder: activeFolder === "unresolved" ? `UNRESOLVED` : `S.Y. ${activeFolder}`,
          folderKey:
            activeFolder === "unresolved"
              ? `unresolved-${selectedUnresolvedYear || violation.school_year || ""}`
              : activeFolder,
          status: activeFolder === "unresolved" ? "Unresolved" : "Archived",
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

      // Add unresolved violations in global search
      if (allUnresolvedViolations.length > 0) {
        allUnresolvedViolations.forEach((violation) => {
          const hasViolation =
            (violation.student_name && violation.student_name.trim()) ||
            (violation.school_id && violation.school_id.trim());
          if (!hasViolation) return;

          allData.push({
            id: violation.id,
            no: "",
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
            folder: `UNRESOLVED S.Y. ${violation.school_year}`,
            folderKey: `unresolved-${violation.school_year}`,
            subFolderKey: violation.school_year,
            recordType: "violation",
            isUnresolved: true,
            schoolYear: violation.school_year,
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

      // Check folder names (including unresolved subfolder suggestions)
      const allSearchFolders = [
        ...folders,
        ...unresolvedSchoolYears.map((year) => ({
          key: `unresolved-${year}`,
          label: `UNRESOLVED S.Y. ${year}`,
        })),
      ];

      allSearchFolders.forEach((folder) => {
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
      allSearchFolders.forEach((folder) => {
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
          const folderRecords = matchingRecords.filter((record) => record.folderKey === folder.key);
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
      if (activeFolder === "users") {
        return [
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
        ];
      }

      if (activeFolder === "unresolved") {
        return [
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
            render: (_value, row) =>
              row.signatureImage ? (
                <div className="flex items-center gap-2">
                  <img
                    src={row.signatureImage}
                    alt="Signature"
                    className="h-8 w-24 object-contain bg-white rounded border border-gray-200"
                  />
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="px-3 py-1 h-7 text-xs gap-1"
                >
                  Attach
                </Button>
              ),
          },
          {
            key: "status",
            label: "Status",
            render: (_value, row) => (
              <Button
                size="sm"
                variant="secondary"
                className="bg-[#A3AED0] text-white px-3 py-1 gap-2 flex items-center"
                onClick={() => handleClearUnresolved(row)}
              >
                <Check className="w-4 h-4" />
                <span className="font-semibold">Cleared</span>
              </Button>
            ),
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
                  <DropdownMenuItem onClick={() => handleEdit(row, "violation")} className="gap-2 cursor-pointer text-gray-900 hover:bg-gray-200 hover:text-gray-900 focus:bg-gray-200 focus:text-gray-900">
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteArchivedViolation(row)} className="gap-2 cursor-pointer text-red-700 hover:bg-red-100 hover:text-red-800 focus:bg-red-100 focus:text-red-800">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ];
      }

      // Default archive table columns
      return [
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
          render: (_value, row) =>
            row.signatureImage ? (
              <div className="flex items-center gap-2">
                <img
                  src={row.signatureImage}
                  alt="Signature"
                  className="h-8 w-24 object-contain bg-white rounded border border-gray-200"
                />
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="px-3 py-1 h-7 text-xs gap-1"
              >
                Attach
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
    : activeFolder === "unresolved"
    ? selectedUnresolvedYear
      ? `Unresolved Student Records - S.Y. ${selectedUnresolvedYear} (${activeSemester})`
      : "Unresolved Student Records - Select a Year"
    : `Archived Student Records - S.Y. ${activeFolder} (${activeSemester})`;

  const handleClearUnresolved = async (row) => {
    if (!row?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/archive/violations/${row.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
        body: JSON.stringify({ isUnresolved: false }),
      });

      const data = await response.json();
      if (!response.ok || data.status !== "ok") {
        throw new Error(data.message || "Failed to clear unresolved record.");
      }

      // Remove from unresolved in current view immediately
      setArchivedViolations((items) => items.filter((item) => item.id !== row.id));
      setAllUnresolvedViolations((items) => items.filter((item) => item.id !== row.id));

      if (data.promotion?.isEligible) {
        if (data.promotion.promoted) {
          setArchiveSuccessMessage("Student promotion triggered automatically after clearance.");
        } else if (data.promotion.graduated) {
          setArchiveSuccessMessage("Student graduated automatically after all violations cleared.");
        } else {
          setArchiveSuccessMessage("Student is eligible and checked for promotion after clearance.");
        }
        setTimeout(() => setArchiveSuccessMessage(""), 5000);
      }

      // Keep the user in the unresolved view after clearing.
      const destinationYear = selectedUnresolvedYear || row.school_year || activeFolder;
      const destinationSemester = row.semester || activeSemester;

      setIsGlobalSearch(false);
      // Keep activeFolder as "unresolved" and do not clear selectedUnresolvedYear
      // so the user remains in the same unresolved context.

      window.dispatchEvent(
        new CustomEvent("archiveCompleted", {
          detail: {
            archivedCount: 1,
            schoolYear: destinationYear,
            semester: destinationSemester,
          },
        }),
      );
    } catch (err) {
      setError(err.message || "Unable to clear unresolved record.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteArchivedViolation = async (row) => {
    if (!row?.id) return;
    if (!window.confirm("Delete this archived violation?")) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/archive/violations/${row.id}`, {
        method: "DELETE",
        headers: {
          ...getAuditHeaders(),
        },
      });

      const data = await response.json();
      if (!response.ok || data.status !== "ok") {
        throw new Error(data.message || "Failed to delete record.");
      }

      setArchivedViolations((items) => items.filter((item) => item.id !== row.id));
    } catch (err) {
      setError(err.message || "Unable to delete record.");
    } finally {
      setIsLoading(false);
    }
  };

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
                    if (folder.key === "unresolved") {
                      setSelectedUnresolvedYear("");
                    }
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
                {folder.key !== "users" && folder.key !== "unresolved" && (
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

      {activeFolder === "unresolved" && !selectedUnresolvedYear && !isGlobalSearch && (
        <AnimatedContent delay={0.25}>
          <div className="bg-[#23262B] rounded-xl p-6 mb-4">
            <h3 className="text-lg font-bold mb-3">Unresolved Violations</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {schoolYears.length === 0 ? (
                <div className="text-gray-300 col-span-full">No school year yet.</div>
              ) : (
                schoolYears
                  .filter((year) =>
                    searchQuery
                      ? String(year).toLowerCase().includes(searchQuery.toLowerCase())
                      : true,
                  )
                  .map((year) => (
                    <button
                      key={year}
                      onClick={() => {
                        setSelectedUnresolvedYear(year);
                        setActiveSemester("1ST SEM");
                      }}
                      className="rounded-lg border border-[#A3AED0]/30 p-3 text-left text-sm text-white hover:border-[#A3AED0]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Folder className="w-4 h-4 text-[#A3AED0]" />
                        <span className="font-semibold">S.Y. {year}</span>
                      </div>
                    </button>
                  ))
              )}
              {schoolYears.length > 0 &&
                !schoolYears.some((year) =>
                  searchQuery
                    ? String(year).toLowerCase().includes(searchQuery.toLowerCase())
                    : true,
                ) && (
                  <div className="text-gray-300 col-span-full">
                    No matching school year found.
                  </div>
                )}
            </div>
          </div>
        </AnimatedContent>
      )}

      {activeFolder !== "users" && !isGlobalSearch && selectedUnresolvedYear && (
        <AnimatedContent delay={0.25}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#A3AED0]" />
              <span className="text-sm text-[#A3AED0] font-semibold">UNRESOLVED</span>
              <span className="text-sm text-gray-300">&gt;</span>
              <span className="text-sm text-white font-medium">S.Y. {selectedUnresolvedYear}</span>
            </div>
            <Button
              size="xs"
              variant="secondary"
              className="px-2 py-1"
              onClick={() => {
                setSelectedUnresolvedYear("");
              }}
            >
              Back to Year Selection
            </Button>
          </div>
          <TableTabs
            tabs={semesterTabs}
            activeTab={activeSemester}
            onTabChange={setActiveSemester}
            className="mb-4"
          />
        </AnimatedContent>
      )}

      {activeFolder !== "users" && !isGlobalSearch && activeFolder !== "unresolved" && (
        <AnimatedContent delay={0.25}>
          <TableTabs
            tabs={semesterTabs}
            activeTab={activeSemester}
            onTabChange={setActiveSemester}
            className="mb-4"
          />
        </AnimatedContent>
      )}

      {!(activeFolder === "unresolved" && !selectedUnresolvedYear && !isGlobalSearch) && (
        <AnimatedContent delay={0.4}>
          <div className="bg-[#23262B] rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">{tableTitle}</h3>

          {archiveSuccessMessage && (
            <div className="mb-3 px-3 py-2 text-sm border border-emerald-300 bg-emerald-50 text-emerald-700 rounded">
              {archiveSuccessMessage}
            </div>
          )}

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
              disabled
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
                : activeFolder === "unresolved"
                ? "No unresolved records found for this semester."
                : "No records found for this semester."}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredData}
              onRowClick={(row) => {
                if (!isGlobalSearch) return;

                if (row.isFolder) {
                  if (row.folderKey && row.folderKey.startsWith("unresolved-")) {
                    setActiveFolder("unresolved");
                    setSelectedUnresolvedYear(row.folderKey.replace("unresolved-", ""));
                    setActiveSemester("1ST SEM");
                  } else {
                    setActiveFolder(row.folderKey);
                    if (row.folderKey !== "users" && row.folderKey !== "unresolved") {
                      setActiveSemester("1ST SEM");
                    }
                  }
                  setIsGlobalSearch(false);
                  setSearchQuery("");
                  setFilterType("");
                  return;
                }

                if (row.recordType === "user") {
                  setActiveFolder("users");
                } else if (row.recordType === "violation") {
                  if (row.isUnresolved) {
                    setActiveFolder("unresolved");
                    setSelectedUnresolvedYear(row.schoolYear || "");
                    setActiveSemester("1ST SEM");
                  } else {
                    setActiveFolder(row.folderKey || "users");
                    setActiveSemester("1ST SEM");
                  }
                }
                setIsGlobalSearch(false);
                setSearchQuery("");
                setFilterType("");
              }}
            />
          )}
        </div>
      </AnimatedContent>
      )}

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
    </div>
  );
};

export default Archives;
