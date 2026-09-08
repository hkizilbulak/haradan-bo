import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Save, PauseCircle, PlayCircle, PlusCircle, AlertCircle, Trash2 } from 'react-feather';

export type ConfirmModalType = 'create' | 'update' | 'warning' | 'success' | 'danger' | 'secondary';

interface ConfirmModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmModalType;
  isLoading?: boolean;
}

export default function ConfirmModal({
  show,
  onHide,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Vazgeç',
  type = 'update',
  isLoading = false,
}: ConfirmModalProps) {
  let icon = <Save size={26} />;
  let iconBgClass = 'bg-primary-subtle text-primary';
  let buttonVariant = 'primary';
  let buttonExtraClass = 'text-white';
  let defaultConfirmText = 'Evet, Kaydet';

  if (type === 'create') {
    icon = <PlusCircle size={26} />;
    iconBgClass = 'bg-primary-subtle text-primary';
    buttonVariant = 'primary';
    buttonExtraClass = 'text-white';
    defaultConfirmText = 'Evet, Oluştur';
  } else if (type === 'update') {
    icon = <Save size={26} />;
    iconBgClass = 'bg-primary-subtle text-primary';
    buttonVariant = 'primary';
    buttonExtraClass = 'text-white';
    defaultConfirmText = 'Evet, Kaydet';
  } else if (type === 'warning') {
    icon = <AlertCircle size={26} />;
    iconBgClass = 'bg-warning-subtle text-warning';
    buttonVariant = 'warning';
    buttonExtraClass = 'text-dark';
    defaultConfirmText = 'Evet, Onayla';
  } else if (type === 'secondary') {
    icon = <PauseCircle size={26} />;
    iconBgClass = 'bg-secondary-subtle text-secondary';
    buttonVariant = 'secondary';
    buttonExtraClass = 'text-white';
    defaultConfirmText = 'Evet, Pasife Al';
  } else if (type === 'success') {
    icon = <PlayCircle size={26} />;
    iconBgClass = 'bg-success-subtle text-success';
    buttonVariant = 'success';
    buttonExtraClass = 'text-white';
    defaultConfirmText = 'Evet, Aktifleştir';
  } else if (type === 'danger') {
    icon = <Trash2 size={26} />;
    iconBgClass = 'bg-danger-subtle text-danger';
    buttonVariant = 'danger';
    buttonExtraClass = 'text-white';
    defaultConfirmText = 'Evet, Sil';
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      contentClassName="border-0 shadow-lg rounded-4 overflow-hidden"
      backdrop="static"
      keyboard={!isLoading}
    >
      <Modal.Body className="p-4 text-center">
        <div
          className={`mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle ${iconBgClass}`}
          style={{ width: '56px', height: '56px' }}
        >
          {icon}
        </div>
        <h5 className="fw-bold text-dark mb-2">{title}</h5>
        <div className="text-secondary small mb-4 px-2" style={{ lineHeight: 1.55 }}>
          {message}
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="light"
            className="w-50 border py-2 fw-semibold rounded-3 text-secondary"
            onClick={onHide}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            className={`w-50 py-2 fw-semibold rounded-3 shadow-xs ${buttonExtraClass}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'İşleniyor...' : (confirmText || defaultConfirmText)}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
