import StatusBadge from '@/components/StatusBadge';
import { formatDateForText } from '@/helpers/DateUtils';
import { capitalizeSentence } from '@/helpers/HelperUtils';
import { PaymentResponse } from '@/models';
import { Col, Modal, Form, Button, Row } from 'react-bootstrap';

type IProps = {
    selectedPayment?: PaymentResponse;
    onClose: () => void;

}

export default function PaymentModal({ selectedPayment, onClose }: IProps) {


    return (
        <Modal show={true} onHide={onClose} size="lg">

            <Form className={'mb-3'}>
                <Modal.Header closeButton>
                    <Modal.Title>Ödeme Detayları</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPayment &&
                        <Row>
                            <Form.Group as={Col} md={6}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">Ödeme Tarihi :</span> {formatDateForText(selectedPayment.createDate)}</Form.Label>
                            </Form.Group>
                            <Form.Group as={Col} md={6}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">Durum :</span> <StatusBadge status={selectedPayment.status} /></Form.Label>
                            </Form.Group>
                            <Form.Group as={Col} md={6}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">İlan ID :</span> {selectedPayment.productId}</Form.Label>
                            </Form.Group>
                            <Form.Group as={Col} md={6}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">Ödeme ID :</span> {selectedPayment.identifier}</Form.Label>
                            </Form.Group>
                            <Form.Group as={Col} md={6}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">Satıcı ID :</span> {selectedPayment.merchantId}</Form.Label>
                            </Form.Group>
                            <Form.Group as={Col} md={6}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">IP Adresi :</span> {selectedPayment.ip}</Form.Label>
                            </Form.Group>
                            <Form.Group as={Col} md={6}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">Ad Soyad :</span> {capitalizeSentence(selectedPayment.userName)}</Form.Label>
                            </Form.Group>
                            <Form.Group as={Col} md={6}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">E-posta Adresi :</span> {selectedPayment.userEmail}</Form.Label>
                            </Form.Group>
                            <Form.Group as={Col} md={6}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">Telefon No :</span> {selectedPayment.userPhone}</Form.Label>
                            </Form.Group>
                            <Form.Group as={Col} md={6}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">Adres :</span> {selectedPayment.userAddress}</Form.Label>
                            </Form.Group>

                            <Form.Group as={Col} md={12}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">Token Request :</span></Form.Label>
                                <Form.Control as="textarea" rows={5} className={'mb-2'} defaultValue={selectedPayment.tokenRequest} />
                            </Form.Group>
                            <Form.Group as={Col} md={12}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">Token Response :</span></Form.Label>
                                <Form.Control as="textarea" rows={5} className={'mb-2'} defaultValue={selectedPayment.tokenResponse} />
                            </Form.Group>
                            <Form.Group as={Col} md={12}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">Notify Request :</span></Form.Label>
                                <Form.Control as="textarea" rows={5} className={'mb-2'} defaultValue={selectedPayment.notifyRequest} />
                            </Form.Group>
                            <Form.Group as={Col} md={12}>
                                <Form.Label><span className="fw-bold text-cyan-600 me-2">Notify Response :</span></Form.Label>
                                <Form.Control as="textarea" rows={5} className={'mb-2'} defaultValue={selectedPayment.notifyResponse} />
                            </Form.Group>
                        </Row>}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose}>
                        Kapat
                    </Button>
                </Modal.Footer>
            </Form>

        </Modal>
    );
}