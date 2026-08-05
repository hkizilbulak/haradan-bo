import { AdvertResponse } from '@/models';
import { Modal, Button } from 'react-bootstrap';

type IProps = {
    selectedAdvert?: AdvertResponse;
    onClose: () => void;

}

export default function AdvertModal({ selectedAdvert, onClose }: IProps) {


    return (
        <Modal show={true} onHide={onClose} size="lg">

            <Modal.Header closeButton>
                <Modal.Title>{"İlan Düzenle"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                dsda
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>
                    Kapat
                </Button>
                <Button
                    variant="primary"
                    as="input"
                    type="submit"
                    value={"Güncelle"}
                />
            </Modal.Footer>
        </Modal>
    );
}