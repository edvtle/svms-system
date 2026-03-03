import React, { useState } from 'react';
import Modal, { ModalFooter, ModalDivider } from '@/components/ui/Modal';
import SearchBar from '@/components/ui/SearchBar';
import GlassInput from '@/components/ui/GlassInput';
import Button from '@/components/ui/Button';

const LogNewViolationModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="font-black font-inter">Log New Violation</span>}
      size="lg"
      showCloseButton={true}
    >
      <form>
        <p className="text-sm text-gray-400 mb-4">Add violation on the selected student.</p>
        <div className="mb-4">
          <SearchBar placeholder="Student Name" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput label={<span className="text-sm font-medium text-white mb-2">Student Name</span>} placeholder="Student Name" />
          <GlassInput label={<span className="text-sm font-medium text-white mb-2">Student No.</span>} placeholder="Student No." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput label={<span className="text-sm font-medium text-white mb-2">Year/Section</span>} placeholder="Year/Section" />
          <div>
            <label className="block text-sm font-medium text-white mb-2">Type of Violation</label>
            <select className="w-full backdrop-blur-md border border-white/5 rounded-xl px-4 py-3 text-[15px] text-white bg-[rgba(45,47,52,0.8)] placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all appearance-none">
              <option value="">Select...</option>
              <option value="Academic">Academic</option>
              <option value="Behavioral">Behavioral</option>
            </select>
          </div>
        </div>
        <div className="mb-4">
          <GlassInput label={<span className="text-sm font-medium text-white mb-2">Reported by</span>} placeholder="Reported by" />
        </div>
        <ModalDivider />
        <div className="mb-4">
          <GlassInput
            label={<span className="text-sm font-medium text-white mb-2">Remarks</span>}
            placeholder="Remarks"
            as="textarea"
            rows={5}
            className="resize-none"
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
            Save
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default LogNewViolationModal;
