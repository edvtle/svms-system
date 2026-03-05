import React, { useState, useEffect } from "react";
import Modal, { ModalFooter, ModalDivider } from "@/components/ui/Modal";
import GlassInput from "@/components/ui/GlassInput";
import Button from "@/components/ui/Button";

const EditViolationModal = ({ isOpen, onClose, violation, onSave }) => {
  const [formData, setFormData] = useState({
    date: "",
    studentNameText: "",
    studentIdText: "",
    yearSection: "",
    violation: "",
    reportedBy: "",
    remarks: "",
  });

  useEffect(() => {
    if (violation) {
      setFormData({
        date: violation.date.split("\n")[0], // Assuming date is "MM/DD/YY\nTime"
        studentNameText: violation.studentNameText,
        studentIdText: violation.studentIdText,
        yearSection: violation.yearSection,
        violation: violation.violation,
        reportedBy: violation.reportedBy,
        remarks: violation.remarks,
      });
    }
  }, [violation]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(violation.id, formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="font-black font-inter">Edit Violation</span>}
      size="lg"
      showCloseButton={true}
    >
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-gray-400 mb-4">
          Edit the violation details.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label={
              <span className="text-sm font-medium text-white mb-2">Date</span>
            }
            name="date"
            value={formData.date}
            onChange={handleChange}
            placeholder="MM/DD/YY"
          />
          <GlassInput
            label={
              <span className="text-sm font-medium text-white mb-2">
                Student Name
              </span>
            }
            name="studentNameText"
            value={formData.studentNameText}
            onChange={handleChange}
            placeholder="Student Name"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label={
              <span className="text-sm font-medium text-white mb-2">
                Student ID
              </span>
            }
            name="studentIdText"
            value={formData.studentIdText}
            onChange={handleChange}
            placeholder="Student ID"
          />
          <GlassInput
            label={
              <span className="text-sm font-medium text-white mb-2">
                Year/Section
              </span>
            }
            name="yearSection"
            value={formData.yearSection}
            onChange={handleChange}
            placeholder="Year/Section"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Type of Violation
            </label>
            <select
              name="violation"
              value={formData.violation}
              onChange={handleChange}
              className="w-full backdrop-blur-md border border-white/5 rounded-xl px-4 py-3 text-[15px] text-white bg-[rgba(45,47,52,0.8)] placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all appearance-none"
            >
              <option value="">Select...</option>
              <option value="Academic">Academic</option>
              <option value="Behavioral">Behavioral</option>
            </select>
          </div>
          <GlassInput
            label={
              <span className="text-sm font-medium text-white mb-2">
                Reported by
              </span>
            }
            name="reportedBy"
            value={formData.reportedBy}
            onChange={handleChange}
            placeholder="Reported by"
          />
        </div>
        <ModalDivider />
        <div className="mb-4">
          <GlassInput
            label={
              <span className="text-sm font-medium text-white mb-2">
                Remarks
              </span>
            }
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            as="textarea"
            rows={5}
            className="resize-none"
            placeholder="Remarks"
          />
        </div>
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
          >
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default EditViolationModal;
