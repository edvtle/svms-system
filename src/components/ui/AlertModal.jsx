import React from 'react'
import Modal, { ModalFooter } from './Modal'
import Button from './Button'
import { AlertTriangle } from 'lucide-react'

const AlertModal = ({
  isOpen,
  onClose,
  title = 'Notice',
  message,
  confirmLabel = 'OK',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="font-black font-inter flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          {title}
        </span>
      }
      size="sm"
      showCloseButton
    >
      <div className="text-sm text-gray-200 leading-relaxed">{message}</div>
      <ModalFooter className="pt-6">
        <Button type="button" variant="primary" onClick={onClose} className="px-6 py-2.5">
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default AlertModal
