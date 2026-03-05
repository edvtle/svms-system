import React, { useState, useEffect } from "react";
import Modal, { ModalFooter, ModalDivider } from "@/components/ui/Modal";
import GlassInput from "@/components/ui/GlassInput";
import Button from "@/components/ui/Button";

const EditArchiveModal = ({ isOpen, onClose, record, onSave }) => {
  const [formData, setFormData] = useState({
    studentName: "",
    schoolId: "",
    yearSection: "",
    violation: "",
    reportedBy: "",
    signature: "",
    remarks: "",
  });

  useEffect(() => {
    if (record) {
      setFormData({
        studentName: record.studentName.props.children[0].props.children,
        schoolId: record.studentName.props.children[1].props.children,
        yearSection: record.yearSection,
        violation: record.violation,
        reportedBy: record.reportedBy,
        signature: record.signature,
        remarks: record.remarks,
      });
    }
  }, [record]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Create updated record with JSX structure
    const updatedRecord = {
      ...record,
      studentName: (
        <span>
          <b>{formData.studentName}</b>
          <br />
          <span className="text-xs text-gray-500">{formData.schoolId}</span>
        </span>
      ),
      yearSection: formData.yearSection,
      violation: formData.violation,
      reportedBy: formData.reportedBy,
      signature: formData.signature,
      remarks: formData.remarks,
    };
    onSave(record.id, updatedRecord);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="font-black font-inter">Edit Archive Record</span>}
      size="lg"
      showCloseButton={true}
    >
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-gray-400 mb-4">
          Edit the archive record details.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label={
              <span className="text-sm font-medium text-white mb-2">
                Student Name
              </span>
            }
            name="studentName"
            value={formData.studentName}
            onChange={handleChange}
            placeholder="Student Name"
          />
          <GlassInput
            label={
              <span className="text-sm font-medium text-white mb-2">
                Student ID
              </span>
            }
            name="schoolId"
            value={formData.schoolId}
            onChange={handleChange}
            placeholder="Student ID"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Violation
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
              <option value="Uniform">Uniform</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Signature
            </label>
            <select
              name="signature"
              value={formData.signature}
              onChange={handleChange}
              className="w-full backdrop-blur-md border border-white/5 rounded-xl px-4 py-3 text-[15px] text-white bg-[rgba(45,47,52,0.8)] placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all appearance-none"
            >
              <option value="">Select...</option>
              <option value="Signed">Signed</option>
              <option value="Attach">Attach</option>
            </select>
          </div>
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

export default EditArchiveModal;
