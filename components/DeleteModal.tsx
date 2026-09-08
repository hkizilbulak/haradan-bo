import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Trash2 } from 'react-feather';

type IProps = {
  onClose: () => void;
  onHandleDelete: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
};

export default function DeleteModal({
  onClose,
  onHandleDelete,
  title = "Silme Onayı",
  message = "Silme işlemini onaylıyor musunuz?",
  confirmText = "Evet, Sil",
  cancelText = "Vazgeç",
  isLoading = false,
}: IProps) {
  return (
    <Modal show={true} onHide={onClose} centered contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
      <Modal.Body className="p-4 text-center">
        <div
          className="mx-auto mb-3 d-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle"
          style={{ width: '56px', height: '56px' }}
        >
          <Trash2 size={26} />
        </div>
        <h5 className="fw-bold text-dark mb-2">{title}</h5>
        <p className="text-secondary small mb-4 px-2" style={{ lineHeight: 1.55 }}>
          {message}
        </p>
        <div className="d-flex gap-2">
          <Button
            variant="light"
            className="w-50 border py-2 fw-semibold rounded-3 text-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant="danger"
            className="w-50 py-2 fw-semibold rounded-3 shadow-xs text-white"
            onClick={onHandleDelete}
            disabled={isLoading}
          >
            {isLoading ? 'Siliniyor...' : confirmText}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}