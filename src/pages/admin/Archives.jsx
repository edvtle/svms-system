import React, { useState, useEffect, useMemo } from "react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import SearchBar from "../../components/ui/SearchBar";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import TableTabs from "../../components/ui/TableTabs";
import { Folder, Filter, Download, X, AlertCircle, MoreVertical, Edit, RotateCcw } from "lucide-react";
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [archivedViolations, setArchivedViolations] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editType, setEditType] = useState("user"); // "user" or "violation"
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [userToRestore, setUserToRestore] = useState(null);

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
          // Don't auto-select folder - let user choose deliberately
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
        const data = await response.json();
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

  // Get all folders (USERS + School Years)
  const folders = [
    { key: "users", label: "USERS" },
    ...schoolYears.map((year) => ({
      key: year,
      label: `S.Y. ${year}`,
    })),
  ];

  // Prepare data based on active folder
  const displayData = useMemo(() => {
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
      }));
    }
  }, [activeFolder, archivedUsers, archivedViolations]);

  // Filter function
  const filteredData = useMemo(() => {
    const filtered = displayData.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullText = JSON.stringify(item).toLowerCase();
        if (!fullText.includes(query)) {
          return false;
        }
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

    // Add index/no to each filtered item
    return filtered.map((item, index) => ({
      ...item,
      no: index + 1,
    }));
  }, [displayData, searchQuery, filterType]);

  // Define columns based on active folder
  const columns =
    activeFolder === "users"
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

  const tableTitle =
    activeFolder === "users"
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
        <SearchBar
          placeholder="Search by name, ID, or records..."
          className="mb-4 w-80"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </AnimatedContent>

      <AnimatedContent delay={0.2}>
        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          {folders.map((folder) => (
            <button
              key={folder.key}
              onClick={() => {
                setActiveFolder(folder.key);
                setActiveSemester("1ST SEM");
              }}
              className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-200 flex-shrink-0 ${
                activeFolder === folder.key
                  ? "bg-[#23262B] border-2 border-[#A3AED0]"
                  : "bg-[#23262B]/60 border border-transparent"
              } hover:bg-[#23262B]`}
            >
              <span className="mb-2 flex items-center justify-center w-[80px] h-[60px]">
                <Folder className="w-8 h-8" />
              </span>
              <span className="text-xs font-semibold text-white text-center">
                {folder.label}
              </span>
            </button>
          ))}
        </div>
      </AnimatedContent>

      {activeFolder !== "users" && (
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
              {activeFolder !== "users" && (
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
              {(filterType || searchQuery) && (
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
              <p className="mt-2">Loading data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No records found
              {activeFolder === "users"
                ? " in archived users."
                : " for this semester."}
            </div>
          ) : (
            <DataTable columns={columns} data={filteredData} />
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
    </div>
  );
};

export default Archives;
