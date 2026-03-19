import React, { useState, useMemo } from "react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import SearchBar from "../../components/ui/SearchBar";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import TableTabs from "../../components/ui/TableTabs";
import { Folder, Filter, Download, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";
import Modal, { ModalFooter } from "../../components/ui/Modal";
import EditArchiveModal from "@/components/modals/EditArchiveModal";

const folderList = [
  { key: "users", label: "USERS" },
  { key: "2024-2025", label: "S.Y. 2024-2025" },
  { key: "2023-2024", label: "S.Y. 2023-2024" },
  { key: "2022-2023", label: "S.Y. 2022-2023" },
  { key: "2021-2022", label: "S.Y. 2021-2022" },
  { key: "2020-2021", label: "S.Y. 2020-2021" },
];

const tabs = [{ key: "users", label: "Users" }];

const semesterTabs = [
  { key: "1st", label: "1st Semester" },
  { key: "2nd", label: "2nd Semester" },
];

const Archives = () => {
  const [activeFolder, setActiveFolder] = useState("users");
  const [activeTab, setActiveTab] = useState("users");
  const [activeSemester, setActiveSemester] = useState("1st");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSignature, setFilterSignature] = useState("");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editType, setEditType] = useState("user"); // "user" or "violation"

  // Load school years and archived users on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Fetch school years
        const yearsResponse = await fetch("/api/archive/school-years", {
          headers: { ...getAuditHeaders() },
        });
        const yearsData = await yearsResponse.json();

        if (yearsResponse.ok && yearsData.status === "ok") {
          setSchoolYears(yearsData.schoolYears || []);
          // Set first school year as default
          if (yearsData.schoolYears && yearsData.schoolYears.length > 0) {
            setActiveFolder(yearsData.schoolYears[0]);
          }
        }

        // Fetch archived users
        const usersResponse = await fetch("/api/archive/users", {
          headers: { ...getAuditHeaders() },
        });
        const usersData = await usersResponse.json();

        if (usersResponse.ok && usersData.status === "ok") {
          setArchivedUsers(usersData.archivedUsers || []);
        }
      } catch (err) {
        setError("Failed to load archive data: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Load violations when folder or semester changes
  useEffect(() => {
    const loadViolations = async () => {
      if (activeFolder === "users") return;

      try {
        setIsLoading(true);
        setError("");

        const semesterParam =
          activeSemester === "1ST SEM" ? "1st" : "2nd";
        const response = await fetch(
          `/api/archive/violations/${activeFolder}/${semesterParam}`,
          { headers: { ...getAuditHeaders() } },
        );
        const data = await response.json();

        if (response.ok && data.status === "ok") {
          setArchiveViolations(data.violations || []);
        } else {
          setError(data.message || "Failed to load violations");
        }
      } catch (err) {
        setError("Failed to load violations: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadViolations();
  }, [activeFolder, activeSemester]);

  const handleSaveEdit = async (id, updatedRecord) => {
    try {
      if (editType === "user") {
        // Update archived user
        const response = await fetch(`/api/archive/users/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuditHeaders(),
          },
          body: JSON.stringify(updatedRecord),
        });

        if (response.ok) {
          setArchivedUsers((prev) =>
            prev.map((u) => (u.id === id ? updatedRecord : u)),
          );
        }
      } else if (editType === "violation") {
        // Update archived violation
        const response = await fetch(`/api/archive/violations/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuditHeaders(),
          },
          body: JSON.stringify(updatedRecord),
        });

        if (response.ok) {
          setArchiveViolations((prev) =>
            prev.map((v) => (v.id === id ? updatedRecord : v)),
          );
        }
      }
    } catch (err) {
      console.error("Error saving edit:", err);
    }
  };

  // Filter function
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const studentName =
          typeof item.studentName === "object"
            ? item.studentName.props.children[0].props.children
            : "";
        const studentId =
          typeof item.studentName === "object"
            ? item.studentName.props.children[1].props.children
            : "";

        if (
          !studentName.toLowerCase().includes(query) &&
          !studentId.toLowerCase().includes(query) &&
          !item.yearSection.toLowerCase().includes(query) &&
          !item.violation.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      if (filterType && item.violation !== filterType) {
        return false;
      }

      if (filterSignature && item.signature !== filterSignature) {
        return false;
      }

      return true;
    });
  }, [data, searchQuery, filterType, filterSignature]);

  const columns = [
    {
      key: "no",
      label: "No",
      width: "w-10",
      render: (value, row) => {
        const index = filteredData.findIndex((item) => item.id === row.id);
        return <span>{index + 1}</span>;
      },
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
    { key: "yearSection", label: "Year/Section" },
    { key: "violation", label: "Violation" },
    { key: "reportedBy", label: "Reported by" },
    { key: "remarks", label: "Remarks" },
    {
      key: "signature",
      label: "Signature",
      render: (value) => (
        <Button size="sm" variant="secondary" className="px-3 py-1">
          {value}
        </Button>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "center",
      render: (_, row) => (
        <Button
          size="sm"
          variant="secondary"
          className="gap-2 bg-[#A3AED0] text-[#23262B] hover:bg-[#8B9CB8] border-0"
          onClick={() => handleEdit(row)}
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
      : `Archived Student Records - S.Y. ${activeFolder.replace("-", " - ")} (${activeSemester} Semester)`;

  const handleEdit = (row) => {
    setSelectedRow(row);
    setIsEditOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("");
    setFilterSignature("");
  };

  return (
    <div className="text-white">
      <AnimatedContent>
        <h2 className="text-xl font-bold mb-2 tracking-wide">
          SYSTEM ARCHIVES{" "}
          <span className="font-normal">
            &gt; {folderList.find((f) => f.key === activeFolder)?.label}
          </span>
        </h2>
      </AnimatedContent>

      <AnimatedContent delay={0.1}>
        <SearchBar
          placeholder="Search by name, ID, or section..."
          className="mb-4 w-80"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </AnimatedContent>

      <AnimatedContent delay={0.2}>
        <div className="flex gap-4 mb-6">
          {folderList.map((folder) => (
            <button
              key={folder.key}
              onClick={() => setActiveFolder(folder.key)}
              className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-200 ${
                activeFolder === folder.key
                  ? "bg-[#23262B] border-2 border-[#A3AED0]"
                  : "bg-[#23262B]/60 border border-transparent"
              } hover:bg-[#23262B]`}
            >
              <span className="mb-2 flex items-center justify-center w-[80px] h-[60px]">
                <Folder className="w-8 h-8" />
              </span>
              <span className="text-xs font-semibold text-white">
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
            className="mb-2"
          />
        </AnimatedContent>
      )}

      <AnimatedContent delay={0.4}>
        <div className="bg-[#23262B] rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">{tableTitle}</h3>

          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              {/* Violation Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className={`gap-2 ${filterType ? "bg-[#4A9B9B] hover:bg-[#5aabab]" : "bg-[#A3AED0] hover:bg-[#b3bde0]"} text-[#23262B] border-0 transition-colors`}
                  >
                    <Filter className="w-4 h-4" />
                    {filterType || "Violation Type"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterType("")}>
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("Academic")}>
                    Academic
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("Behavioral")}>
                    Behavioral
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("Uniform")}>
                    Uniform
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Signature Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className={`gap-2 ${filterSignature ? "bg-[#4A9B9B] hover:bg-[#5aabab]" : "bg-[#A3AED0] hover:bg-[#b3bde0]"} text-[#23262B] border-0 transition-colors`}
                  >
                    <Filter className="w-4 h-4" />
                    {filterSignature || "Signature Status"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterSignature("")}>
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterSignature("Signed")}
                  >
                    Signed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterSignature("Attach")}
                  >
                    Attach
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear Filters Button */}
              {(filterType || filterSignature || searchQuery) && (
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
            >
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>

          <DataTable columns={columns} data={filteredData} />

          {filteredData.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No records found matching the filters.
            </div>
          )}
        </div>
      </AnimatedContent>

      {/* Edit Modal */}
      {isEditOpen && selectedRow && (
        <EditArchiveModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          record={selectedRow}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default Archives;
