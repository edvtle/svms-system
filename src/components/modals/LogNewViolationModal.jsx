import React, { useEffect, useMemo, useState } from "react";
import Modal, { ModalFooter, ModalDivider } from "@/components/ui/Modal";
import GlassInput from "@/components/ui/GlassInput";
import Button from "@/components/ui/Button";
import { getAuditHeaders } from "@/lib/auditHeaders";
import ViolationPickerModal from "@/components/modals/ViolationPickerModal";

const initialForm = {
  studentId: "",
  studentName: "",
  studentNo: "",
  yearSection: "",
  violationCatalogId: "",
  violationLabel: "",
  reportedBy: "",
  remarks: "",
};

const LogNewViolationModal = ({ isOpen, onClose, onSaved }) => {
  const [students, setStudents] = useState([]);
  const [allViolations, setAllViolations] = useState([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const [showViolationPicker, setShowViolationPicker] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const bootstrap = async () => {
      try {
        const [studentsRes, violationsRes] = await Promise.all([
          fetch("/api/students"),
          fetch("/api/violations"),
        ]);

        const studentsData = await studentsRes.json().catch(() => ({}));
        const violationsData = await violationsRes.json().catch(() => ({}));

        if (studentsRes.ok && Array.isArray(studentsData.students)) {
          setStudents(studentsData.students);
        }

        if (violationsRes.ok && Array.isArray(violationsData.violations)) {
          setAllViolations(violationsData.violations);
        }
      } catch {
        setStudents([]);
        setAllViolations([]);
      }
    };

    bootstrap();

    setStudentQuery("");
    setShowStudentSuggestions(false);
    setShowViolationPicker(false);
    setError("");
    setFormData(initialForm);
  }, [isOpen]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return [];

    return students
      .filter((student) => {
        const fullName = String(student.full_name || "").toLowerCase();
        const schoolId = String(student.school_id || "").toLowerCase();
        const yearSection = String(student.year_section || "").toLowerCase();
        return (
          fullName.includes(q) || schoolId.includes(q) || yearSection.includes(q)
        );
      })
      .slice(0, 8);
  }, [studentQuery, students]);

  const matchedStudent = useMemo(() => {
    return students.find((student) => Number(student.id) === Number(formData.studentId));
  }, [students, formData.studentId]);

  const rightYearSection = matchedStudent?.year_section || "";

  const selectStudent = (student) => {
    setFormData((prev) => ({
      ...prev,
      studentId: String(student.id),
      studentName: student.full_name || "",
      studentNo: student.school_id || "",
      yearSection: student.year_section || "",
    }));
    setStudentQuery(student.full_name || "");
    setShowStudentSuggestions(false);
    setError("");
  };

  const handleViolationPicked = (selected) => {
    if (!selected) {
      return;
    }

    const label = `${selected.name} (${selected.category} | ${selected.degree})`;
    setFormData((prev) => ({
      ...prev,
      violationCatalogId: String(selected.id),
      violationLabel: label,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.studentId) {
      setError("Select an existing student from search first.");
      return;
    }

    if (!formData.violationLabel) {
      setError("Select a violation type.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/student-violations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
        body: JSON.stringify({
          studentId: Number(formData.studentId),
          violationCatalogId: formData.violationCatalogId
            ? Number(formData.violationCatalogId)
            : null,
          violationLabel: formData.violationLabel,
          reportedBy: formData.reportedBy,
          remarks: formData.remarks,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to log violation.");
      }

      onSaved?.(result.record);
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || "Unable to log violation.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="font-black font-inter">Log New Violation</span>}
      size="2xl"
      showCloseButton
    >
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-gray-300 mb-4">
          Search a student and log a violation entry.
        </p>

        <div className="mb-4 relative">
          <label className="block text-sm font-medium text-white mb-2">Student Search</label>
          <div className="relative">
            <input
              value={studentQuery}
              onChange={(event) => {
                setStudentQuery(event.target.value);
                setShowStudentSuggestions(true);
              }}
              onFocus={() => setShowStudentSuggestions(true)}
              placeholder="Name, school ID, or year/section"
              className="w-full backdrop-blur-md border border-white/5 rounded-xl pl-4 pr-40 py-3 text-[15px] text-white bg-[rgba(45,47,52,0.8)] placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-cyan-200 font-semibold truncate max-w-[130px] text-right">
              {rightYearSection || "Year/Section"}
            </span>
          </div>

          {showStudentSuggestions && filteredStudents.length > 0 && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-[#1f232a] shadow-xl max-h-56 overflow-auto">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className="w-full text-left px-4 py-2.5 hover:bg-white/10 transition-colors"
                  onClick={() => selectStudent(student)}
                >
                  <div className="text-sm text-white font-semibold">{student.full_name}</div>
                  <div className="text-xs text-gray-300">
                    {student.school_id} | {student.year_section}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label={<span className="text-sm font-medium text-white mb-2">Student Name</span>}
            value={formData.studentName}
            readOnly
            placeholder="Student Name"
          />
          <GlassInput
            label={<span className="text-sm font-medium text-white mb-2">Student No.</span>}
            value={formData.studentNo}
            readOnly
            placeholder="Student No."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label={<span className="text-sm font-medium text-white mb-2">Year/Section</span>}
            value={formData.yearSection}
            readOnly
            placeholder="Year/Section"
          />

          <div>
            <label className="block text-sm font-medium text-white mb-2">Type of Violation</label>
            <input
              value={formData.violationLabel}
              readOnly
              placeholder="Select from violations list"
              className="w-full backdrop-blur-md border border-white/5 rounded-xl px-4 py-3 text-[15px] text-white bg-[rgba(45,47,52,0.8)] placeholder-gray-500 focus:outline-none mb-2"
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setShowViolationPicker(true)}
            >
              Choose Violation
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <GlassInput
            label={<span className="text-sm font-medium text-white mb-2">Reported by</span>}
            value={formData.reportedBy}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, reportedBy: event.target.value }))
            }
            placeholder="Reported by"
          />
        </div>

        <ModalDivider />

        <div className="mb-1">
          <label className="block text-sm font-medium text-white mb-2">Remarks</label>
          <textarea
            value={formData.remarks}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, remarks: event.target.value }))
            }
            placeholder="Remarks"
            rows={4}
            style={{ backgroundColor: "rgba(45, 47, 52, 0.8)" }}
            className="w-full backdrop-blur-md border border-white/5 rounded-xl px-4 py-3 text-[15px] text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all resize-y min-h-[80px]"
          />
        </div>

        {error ? <p className="text-sm text-red-300 mt-2">{error}</p> : null}

        <ModalFooter>
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            className="px-8 py-2 bg-white text-[#1a1a1a] border-0 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            className="px-8 py-2 bg-[#556987] text-white hover:bg-[#3d4654]"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
    <ViolationPickerModal
      isOpen={showViolationPicker}
      onClose={() => setShowViolationPicker(false)}
      violations={allViolations}
      onSelect={handleViolationPicked}
    />
    </>
  );
};

export default LogNewViolationModal;
