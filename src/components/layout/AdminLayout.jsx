import React from 'react';
import Sidebar from './AdminSidebar';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

const AdminLayout = () => {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);

  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);

  const confirmLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-[#0d0d0d] font-inter">
      <Sidebar onRequestLogout={openLogoutModal} />
      <div className="flex-1 flex flex-col">
        <Navbar onRequestLogout={openLogoutModal} />
        <main className="flex-1 p-6 bg-gradient-to-br from-[#0B0D10]/50 to-[#0d0d0d]/80">
          <Outlet />
        </main>
      </div>

      <Modal
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
        title="Confirm Logout"
        size="sm"
        showCloseButton
      >
        <p className="text-sm text-gray-200">Are you sure you want to log out?</p>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={closeLogoutModal}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={confirmLogout}>
            Logout
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default AdminLayout;
