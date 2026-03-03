import React, { useState, useMemo } from "react";
import AnimatedContent from "../components/ui/AnimatedContent";
import SearchBar from "../components/ui/SearchBar";
import Button from "../components/ui/Button";
import DataTable from "../components/ui/DataTable";
import TableTabs from "../components/ui/TableTabs";
import { Folder, Filter, Download, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../components/ui/dropdown-menu";
import Modal, { ModalFooter } from "../components/ui/Modal";

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

  const formatDateTime = (date, time) => {
    return (
      <span>
        <b>{date}</b>
        <br />
        <span className="text-xs text-gray-500">{time}</span>
      </span>
    );
  };

  const dataSample = Array.from({ length: 20 }).map((_, i) => ({
    id: i + 1,
    date: formatDateTime("02/02/26", "11:00 AM"),
    studentName: (
      <span>
        <b>Arman Jeresano</b>
        <br />
        <span className="text-xs text-gray-500">23-00000</span>
      </span>
    ),
    yearSection: "BSIT - 3B",
    violation:
      i % 3 === 0 ? "Academic" : i % 3 === 1 ? "Behavioral" : "Uniform",
    reportedBy: i % 2 === 0 ? "Jenny Hernandez" : "Edrianne Lumbas",
    remarks:
      i % 4 === 0
        ? "Warning issued"
        : i % 4 === 1
          ? "Parent notified"
          : "Lorem Ipsum",
    signature: i % 2 === 0 ? "Signed" : "Attach",
  }));

  const [data, setData] = useState(dataSample);

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
                    className={`gap-2 ${filterType ? "bg-[#4A9B9B]" : "bg-[#A3AED0]"} text-[#23262B] hover:opacity-90 border-0`}
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
                    className={`gap-2 ${filterSignature ? "bg-[#4A9B9B]" : "bg-[#A3AED0]"} text-[#23262B] hover:opacity-90 border-0`}
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
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Record"
          size="lg"
        >
          <div className="grid grid-cols-2 gap-4 p-6">
            {/* Student Name */}
            <div>
              <label className="text-sm text-gray-300">Student Name</label>
              <input
                type="text"
                value={selectedRow.studentName.props.children[0].props.children}
                onChange={(e) => {
                  const updatedRow = { ...selectedRow };
                  updatedRow.studentName = (
                    <span>
                      <b>{e.target.value}</b>
                      <br />
                      <span className="text-xs text-gray-500">
                        {
                          selectedRow.studentName.props.children[1].props
                            .children
                        }
                      </span>
                    </span>
                  );
                  setSelectedRow(updatedRow);
                }}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#4A9B9B] focus:outline-none"
                placeholder="Enter student name"
              />
            </div>

            {/* Student ID */}
            <div>
              <label className="text-sm text-gray-300">Student ID</label>
              <input
                type="text"
                value={selectedRow.studentName.props.children[1].props.children}
                onChange={(e) => {
                  const updatedRow = { ...selectedRow };
                  updatedRow.studentName = (
                    <span>
                      <b>
                        {
                          selectedRow.studentName.props.children[0].props
                            .children
                        }
                      </b>
                      <br />
                      <span className="text-xs text-gray-500">
                        {e.target.value}
                      </span>
                    </span>
                  );
                  setSelectedRow(updatedRow);
                }}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#4A9B9B] focus:outline-none"
                placeholder="Enter student ID"
              />
            </div>

            {/* Year/Section */}
            <div>
              <label className="text-sm text-gray-300">Year/Section</label>
              <input
                type="text"
                value={selectedRow.yearSection}
                onChange={(e) =>
                  setSelectedRow({
                    ...selectedRow,
                    yearSection: e.target.value,
                  })
                }
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#4A9B9B] focus:outline-none"
                placeholder="e.g., BSIT - 3B"
              />
            </div>

            {/* Violation */}
            <div>
              <label className="text-sm text-gray-300">Violation</label>
              <select
                value={selectedRow.violation}
                onChange={(e) =>
                  setSelectedRow({ ...selectedRow, violation: e.target.value })
                }
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#4A9B9B] focus:outline-none"
              >
                <option value="Academic">Academic</option>
                <option value="Behavioral">Behavioral</option>
                <option value="Uniform">Uniform</option>
              </select>
            </div>

            {/* Reported By */}
            <div>
              <label className="text-sm text-gray-300">Reported By</label>
              <input
                type="text"
                value={selectedRow.reportedBy}
                onChange={(e) =>
                  setSelectedRow({ ...selectedRow, reportedBy: e.target.value })
                }
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#4A9B9B] focus:outline-none"
                placeholder="Enter reporter name"
              />
            </div>

            {/* Signature Status */}
            <div>
              <label className="text-sm text-gray-300">Signature</label>
              <select
                value={selectedRow.signature}
                onChange={(e) =>
                  setSelectedRow({ ...selectedRow, signature: e.target.value })
                }
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#4A9B9B] focus:outline-none"
              >
                <option value="Signed">Signed</option>
                <option value="Attach">Attach</option>
              </select>
            </div>

            {/* Remarks */}
            <div className="col-span-2">
              <label className="text-sm text-gray-300">Remarks</label>
              <textarea
                value={selectedRow.remarks}
                onChange={(e) =>
                  setSelectedRow({ ...selectedRow, remarks: e.target.value })
                }
                rows="3"
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#4A9B9B] focus:outline-none"
                placeholder="Enter remarks"
              />
            </div>
          </div>

          <ModalFooter>
            <button
              onClick={() => setIsEditOpen(false)}
              className="px-6 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setData((prev) =>
                  prev.map((row) =>
                    row.id === selectedRow.id ? selectedRow : row,
                  ),
                );
                setIsEditOpen(false);
              }}
              className="px-6 py-2 rounded-xl bg-[#4A9B9B] hover:bg-[#3d8585] text-white transition-colors"
            >
              Save Changes
            </button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};

export default Archives;
