import React, { useState, useEffect } from "react";
import Modal, { ModalFooter, ModalDivider } from "@/components/ui/Modal";
import GlassInput from "@/components/ui/GlassInput";
import Button from "@/components/ui/Button";

const AddUserModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    studentName: "",
    schoolId: "",
    program: "BSIT",
    yearSection: "",
    status: "Regular",
  });

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        studentName: "",
        schoolId: "",
        program: "BSIT",
        yearSection: "",
        status: "Regular",
      });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="font-black font-inter">Add New User</span>}
      size="lg"
      showCloseButton={true}
    >
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-gray-400 mb-4">
          Add a new student to the system.
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
            required
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
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Program
            </label>
            <select
              name="program"
              value={formData.program}
              onChange={handleChange}
              className="w-full backdrop-blur-md border border-white/5 rounded-xl px-4 py-3 text-[15px] text-white bg-[rgba(45,47,52,0.8)] placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all appearance-none"
            >
              <option value="BSIT">BSIT</option>
              <option value="BSCS">BSCS</option>
            </select>
          </div>
          <GlassInput
            label={
              <span className="text-sm font-medium text-white mb-2">
                Year/Section
              </span>
            }
            name="yearSection"
            value={formData.yearSection}
            onChange={handleChange}
            placeholder="Year/Section (e.g., 3A)"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-white mb-2">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full backdrop-blur-md border border-white/5 rounded-xl px-4 py-3 text-[15px] text-white bg-[rgba(45,47,52,0.8)] placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all appearance-none"
          >
            <option value="Regular">Regular</option>
            <option value="Irregular">Irregular</option>
          </select>
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
            Add User
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default AddUserModal;
