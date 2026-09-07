import { Modal, Button, Row } from 'react-bootstrap';

type IProps = {
    onClose: () => void;
    onHandleDelete: () => void;
    title?: string;
    message?: string;
}

export default function DeleteModal({ onClose, onHandleDelete, title = "Silme Onayı", message = "Silme işlemini onaylıyor musunuz?" }: IProps) {
    return (
        <Modal show={true} onHide={onClose} size="sm" centered>
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="mb-0">
                    {message}
                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>
                    Kapat
                </Button>
                <Button variant="danger" onClick={onHandleDelete}>
                    Sil
                </Button>
            </Modal.Footer>
        </Modal>
    );
}