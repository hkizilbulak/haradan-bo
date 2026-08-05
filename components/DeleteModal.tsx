import { Modal, Button, Row } from 'react-bootstrap';

type IProps = {
    onClose: () => void;
    onHandleDelete: () => void;

}

export default function DeleteModal({ onClose, onHandleDelete }: IProps) {
    return (
        <Modal show={true} onHide={onClose} size="sm">
            <Modal.Header closeButton>
                <Modal.Title>Silme Onayı</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>
                    Silme işlemini onaylıyor musunuz?
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