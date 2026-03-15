import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AnimatedContent from "../../components/ui/AnimatedContent";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Download,
  Check,
  Edit,
  CheckCircle,
  PenTool,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";
import SearchBar from "@/components/ui/SearchBar";
import LogNewViolationModal from "@/components/modals/LogNewViolationModal";
import SignaturePadModal from "@/components/modals/SignaturePadModal";
import EditViolationModal from "@/components/modals/EditViolationModal";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import { getAuditHeaders } from "@/lib/auditHeaders";

const StudentViolation = () => {
  const location = useLocation();
  const [showLogModal, setShowLogModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [isEditUnclearing, setIsEditUnclearing] = useState(false);
  const [expandedRemarks, setExpandedRemarks] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signatureSuccessModal, setSignatureSuccessModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("Desc");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpenModal =
      location.state?.openLogModal || params.get("openLog") === "true";
    if (shouldOpenModal) {
      setShowLogModal(true);
    }
  }, [location]);

  const fetchStudentViolations = async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch("/api/student-violations");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load records.");
      }
      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (error) {
      if (!silent) alert(error.message || "Unable to load records.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const mergeRecord = (updated) => {
    if (!updated) return;
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  };

  useEffect(() => {
    fetchStudentViolations();
  }, []);

  const deleteRecord = async (row) => {
    try {
      const response = await fetch(`/api/student-violations/${row.id}`, {
        method: "DELETE",
        headers: {
          ...getAuditHeaders(),
        },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to delete record.");
      }
      setRecords((prev) => prev.filter((r) => r.id !== row.id));
    } catch (error) {
      alert(error.message || "Unable to delete record.");
    }
  };

  const clearRecord = async (row) => {
    try {
      const response = await fetch(`/api/student-violations/${row.id}/clear`, {
        method: "PUT",
        headers: {
          ...getAuditHeaders(),
        },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to clear record.");
      }
      mergeRecord(result.record);
    } catch (error) {
      alert(error.message || "Unable to clear record.");
    }
  };

  const openConfirmModal = (type, row) => {
    setConfirmAction({ type, row });
  };

  const closeConfirmModal = () => {
    if (isConfirmingAction) return;
    setConfirmAction(null);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction?.row) return;

    setIsConfirmingAction(true);
    try {
      if (confirmAction.type === "delete") {
        await deleteRecord(confirmAction.row);
      }
      if (confirmAction.type === "clear") {
        await clearRecord(confirmAction.row);
      }
      setConfirmAction(null);
    } finally {
      setIsConfirmingAction(false);
    }
  };

  const handleUnclear = async (row) => {
    if (!window.confirm("Unclear this violation and reopen it?")) return;

    try {
      const response = await fetch(`/api/student-violations/${row.id}/unclear`, {
        method: "PUT",
        headers: {
          ...getAuditHeaders(),
        },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to unclear record.");
      }
      mergeRecord(result.record);
    } catch (error) {
      alert(error.message || "Unable to unclear record.");
    }
  };

  const handleEditUnclear = async () => {
    if (!editTarget?.id) return;

    setIsEditUnclearing(true);
    try {
      const response = await fetch(`/api/student-violations/${editTarget.id}/unclear`, {
        method: "PUT",
        headers: {
          ...getAuditHeaders(),
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to unclear record.");
      }

      mergeRecord(result.record);
      setShowEditModal(false);
      setEditTarget(null);
    } catch (error) {
      alert(error.message || "Unable to unclear record.");
    } finally {
      setIsEditUnclearing(false);
    }
  };

  const handleEditSave = async (recordId, payload) => {
    try {
      const response = await fetch(`/api/student-violations/${recordId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to update record.");
      }

      mergeRecord(result.record);
      setShowEditModal(false);
      setEditTarget(null);
    } catch (error) {
      alert(error.message || "Unable to update record.");
    }
  };

  const handleEditSignatureUpdate = () => {
    if (!editTarget) return;
    // Open signature pad on top of edit modal (don't close edit modal)
    setSignatureTarget(editTarget);
    setShowSignatureModal(true);
  };

  const handleAttachSignatureFromTable = (row) => {
    if (!row?.raw?.id) return;
    setSignatureTarget(row.raw);
    setShowSignatureModal(true);
  };

  const handleSignatureSave = async (signatureImage) => {
    if (!signatureTarget?.id) return;

    try {
      const response = await fetch(
        `/api/student-violations/${signatureTarget.id}/signature`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuditHeaders(),
          },
          body: JSON.stringify({ signatureImage }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to save signature.");
      }
      mergeRecord(result.record);
      // Update editTarget so the edit modal reflects the new signature immediately
      setEditTarget((prev) =>
        prev ? { ...prev, signature_image: signatureImage } : prev,
      );
      setSignatureTarget(null);
      setShowSignatureModal(false);
      setSignatureSuccessModal(true);
    } catch (error) {
      setSignatureTarget(null);
      setShowSignatureModal(false);
      alert(error.message || "Unable to save signature.");
    }
  };

  const yearMatches = (row, selectedYearValue) => {
    if (!selectedYearValue) return true;
    const yearMap = {
      "1st Year": /^.*1/i,
      "2nd Year": /^.*2/i,
      "3rd Year": /^.*3/i,
      "4th Year": /^.*4/i,
    };
    const regex = yearMap[selectedYearValue];
    return regex ? regex.test(String(row.year_section || "")) : true;
  };

  const dateMatches = (row, range) => {
    if (!range) return true;
    const created = new Date(row.created_at);
    if (Number.isNaN(created.getTime())) return false;

    const today = new Date();
    if (range === "Today") {
      return created.toDateString() === today.toDateString();
    }
    if (range === "This Week") {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return created >= start && created < end;
    }
    if (range === "This Month") {
      return (
        created.getMonth() === today.getMonth() &&
        created.getFullYear() === today.getFullYear()
      );
    }
    if (range === "This Year") {
      return created.getFullYear() === today.getFullYear();
    }
    return true;
  };

  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return records
      .filter((row) => {
        const matchesSearch =
          !query ||
          String(row.full_name || "").toLowerCase().includes(query) ||
          String(row.school_id || "").toLowerCase().includes(query) ||
          String(row.violation_label || "").toLowerCase().includes(query);

        const matchesStatus =
          !selectedStatus ||
          (selectedStatus === "Cleared"
            ? Boolean(row.cleared_at)
            : !row.cleared_at);

        return (
          matchesSearch &&
          matchesStatus &&
          yearMatches(row, selectedYear) &&
          dateMatches(row, selectedDate)
        );
      })
      .sort((a, b) => {
        if (sortOrder === "Asc") {
          return Number(a.id) - Number(b.id);
        }
        return Number(b.id) - Number(a.id);
      });
  }, [records, searchTerm, selectedStatus, selectedYear, selectedDate, sortOrder]);

  const metrics = useMemo(() => {
    const pending = records.filter((row) => !row.cleared_at).length;
    const cleared = records.filter((row) => row.cleared_at).length;
    const atRisk = new Set(
      records.filter((row) => !row.cleared_at).map((row) => row.student_id),
    ).size;

    return {
      pending,
      cleared,
      atRisk,
      total: records.length,
    };
  }, [records]);

  const columns = [
    { key: "no", label: "No", width: "w-10" },
    { key: "date", label: "Date" },
    {
      key: "studentNameText",
      label: "Student Name",
      render: (_value, row) => (
        <span>
          <b>{row.studentNameText}</b>
          <br />
          <span className="text-xs text-gray-500">{row.studentIdText}</span>
        </span>
      ),
    },
    { key: "yearSection", label: "Year/Section" },
    { key: "violation", label: "Violation" },
    { key: "reportedBy", label: "Reported by" },
    {
      key: "remarks",
      label: "Remarks",
      render: (_value, row) => {
        const text = String(row.remarks || "-");
        const maxLetters = 20;
        const needsToggle = text.length > maxLetters;
        const isExpanded = expandedRemarks.has(row.id);
        const shownText =
          needsToggle && !isExpanded
            ? `${text.slice(0, maxLetters)}...`
            : text;

        return (
          <div className="max-w-[260px]">
            <p className="text-sm break-words">{shownText}</p>
            {needsToggle ? (
              <button
                type="button"
                className="text-xs text-cyan-300 hover:text-cyan-200 mt-1"
                onClick={() => {
                  setExpandedRemarks((prev) => {
                    const next = new Set(prev);
                    if (next.has(row.id)) {
                      next.delete(row.id);
                    } else {
                      next.add(row.id);
                    }
                    return next;
                  });
                }}
              >
                {isExpanded ? "View less" : "View more..."}
              </button>
            ) : null}
          </div>
        );
      },
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
            onClick={() => handleAttachSignatureFromTable(row)}
          >
            <PenTool className="w-3 h-3" />
            Attach
          </Button>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (_value, row) =>
        row.clearedAt ? (
          <div className="flex flex-col items-start gap-1">
            <span className="flex items-center gap-2 text-green-700 font-semibold">
              <Check className="w-4 h-4" /> Cleared
            </span>
            <span className="text-xs text-gray-500">{row.clearedAt}</span>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className="bg-[#A3AED0] text-white px-3 py-1 gap-2"
            onClick={() => openConfirmModal("clear", row)}
          >
            <Check className="w-4 h-4" /> Cleared
          </Button>
        ),
    },
  ];

  const tableData = filteredRecords.map((row, index) => {
    const created = new Date(row.created_at);
    const cleared = row.cleared_at ? new Date(row.cleared_at) : null;

    return {
      id: row.id,
      no: index + 1,
      date: created.toLocaleDateString(),
      studentNameText: row.full_name || "",
      studentIdText: row.school_id || "",
      yearSection: row.year_section || "",
      violation: row.violation_label || row.violation_name || "",
      reportedBy: row.reported_by || "-",
      remarks: row.remarks || "-",
      signatureImage: row.signature_image || "",
      clearedAt: cleared
        ? `${cleared.toLocaleDateString()} ${cleared.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "",
      raw: row,
    };
  });

  const actions = [
    {
      label: "Edit",
      icon: <Edit className="w-4 h-4" />,
      onClick: (row) => {
        setEditTarget(row.raw);
        setShowEditModal(true);
      },
    },
    {
      label: "Delete",
      icon: (
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
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m5 0H6"
          />
        </svg>
      ),
      onClick: (row) => openConfirmModal("delete", row.raw),
      variant: "danger",
    },
  ];

  const confirmModalTitle =
    confirmAction?.type === "delete" ? "Delete Violation Log" : "Mark as Cleared";

  const confirmModalMessage =
    confirmAction?.type === "delete"
      ? "This will permanently delete this student violation log."
      : "This will mark the selected violation as cleared.";

  return (
    <div className="text-white">
      <AnimatedContent>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold tracking-wide">STUDENT VIOLATION</h2>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-[#4A5568] hover:bg-[#3d4654] border-0"
              onClick={() => setShowLogModal(true)}
            >
              <Plus className="w-4 h-4" />
              Log New Violation
            </Button>
          </div>
        </div>
      </AnimatedContent>

      <div className="grid grid-cols-2 gap-4 mt-6 mb-6 w-full h-full">
        <AnimatedContent delay={0.05}>
          <Card className="h-full min-h-[110px] col-span-3 flex flex-col justify-between items-start px-6 py-5 w-full transition-all duration-300 hover:shadow-lg hover:shadow-white/5 hover:border-white/20 hover:scale-[1.02]">
            <div className="flex w-full justify-between items-center mb-2">
              <span className="text-lg font-black font-inter">Student Analytics</span>
              <span className="text-green-400 font-bold text-sm">+0%</span>
            </div>
            <div className="w-full h-12 flex items-center justify-center bg-gradient-to-b from-[#A3AED0]/30 to-transparent rounded-lg border border-white/10 mt-2">
              <span className="text-gray-400 text-sm">[Chart Placeholder]</span>
            </div>
          </Card>
        </AnimatedContent>

        <div className="grid grid-cols-2 gap-4 w-full h-full">
          <AnimatedContent delay={0.1}>
            <StatCard
              title="At-Risk Students"
              value={metrics.atRisk}
              percentage={0}
              icon={<TrendingUp />}
              className="col-span-1 min-w-[220px] h-full w-full"
            />
          </AnimatedContent>
          <AnimatedContent delay={0.2}>
            <StatCard
              title="Violations"
              value={metrics.total}
              percentage={0}
              icon={<TrendingDown />}
              className="col-span-1 min-w-[220px] h-full w-full"
            />
          </AnimatedContent>
        </div>
      </div>

      <AnimatedContent delay={0.4}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <SearchBar
              placeholder="Student Name or School ID"
              className="w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="min-w-[90px] justify-between">
                  {sortOrder}
                  <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortOrder("Asc")}>Asc</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder("Desc")}>Desc</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="min-w-[90px] justify-between">
                  {selectedDate || "Date"}
                  <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedDate("")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedDate("Today")}>Today</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedDate("This Week")}>This Week</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedDate("This Month")}>This Month</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedDate("This Year")}>This Year</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="min-w-[90px] justify-between">
                  {selectedYear || "Year"}
                  <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedYear("")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedYear("1st Year")}>1st Year</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedYear("2nd Year")}>2nd Year</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedYear("3rd Year")}>3rd Year</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedYear("4th Year")}>4th Year</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="min-w-[90px] justify-between">
                  {selectedStatus || "Status"}
                  <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedStatus("")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedStatus("Cleared")}>Cleared</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedStatus("Pending")}>Pending</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button variant="secondary" size="sm" className="px-6 gap-2" onClick={fetchStudentViolations}>
            <Download className="w-4 h-4" />
            Generate
          </Button>
        </div>
      </AnimatedContent>

      <AnimatedContent delay={0.5}>
        {isLoading ? (
          <div className="text-gray-300">Loading...</div>
        ) : (
          <DataTable columns={columns} data={tableData} actions={actions} />
        )}
      </AnimatedContent>

      <LogNewViolationModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSaved={(record) => {
          if (record) {
            setRecords((prev) => [record, ...prev]);
          } else {
            fetchStudentViolations();
          }
        }}
      />

      <EditViolationModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditTarget(null);
        }}
        record={editTarget}
        onSave={handleEditSave}
        onUnclear={handleEditUnclear}
        isUnclearing={isEditUnclearing}
        onUpdateSignature={handleEditSignatureUpdate}
      />

      <Modal
        isOpen={Boolean(confirmAction)}
        onClose={closeConfirmModal}
        title={<span className="font-black font-inter">{confirmModalTitle}</span>}
        size="md"
        showCloseButton={!isConfirmingAction}
      >
        <div
          className={`rounded-xl border px-4 py-3 mb-4 ${
            confirmAction?.type === "delete"
              ? "border-red-400/25 bg-red-500/10"
              : "border-amber-400/25 bg-amber-500/10"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              confirmAction?.type === "delete" ? "text-red-300" : "text-amber-200"
            }`}
          >
            {confirmModalMessage}
          </p>
        </div>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={closeConfirmModal}
            disabled={isConfirmingAction}
            className="px-6 py-2.5"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmAction?.type === "delete" ? "danger" : "primary"}
            onClick={handleConfirmAction}
            disabled={isConfirmingAction}
            className="px-6 py-2.5"
          >
            {isConfirmingAction
              ? "Processing..."
              : confirmAction?.type === "delete"
                ? "Delete"
                : "Clear"}
          </Button>
        </ModalFooter>
      </Modal>

      {showSignatureModal ? (
        <SignaturePadModal
          isOpen={showSignatureModal}
          onClose={() => {
            setShowSignatureModal(false);
            setSignatureTarget(null);
          }}
          onSave={handleSignatureSave}
        />
      ) : null}

      <Modal
        isOpen={signatureSuccessModal}
        onClose={() => setSignatureSuccessModal(false)}
        title={<span className="font-black font-inter flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          Signature Saved
        </span>}
        size="sm"
        showCloseButton
      >
        <div className="rounded-lg border border-green-400/25 bg-green-500/10 px-4 py-3 mb-4">
          <p className="text-sm font-medium text-green-300">
            The digital signature has been successfully saved.
          </p>
        </div>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={() => setSignatureSuccessModal(false)}
            className="px-6"
          >
            OK
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default StudentViolation;
