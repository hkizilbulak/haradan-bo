"use client"
import { useState } from 'react';
import { Button, Col, Container, Form, Modal, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import { ModerationAdvertResponse } from '@/models';
import { advertService, ModerationReasonRequest } from '@/services';
import { PageHeading } from '@/widgets';
import AdvertFilter from '@/widgets/advert/AdvertFilter';

const headItems = [
  'Başlık',
  'Yayın Tarihi',
  'Silinme Tarihi',
  'Kategorı',
  'Sahip',
  'Durum',
  'Versiyon',
  ''
]

export default function Adverts() {
  const [pendingAction, setPendingAction] = useState<{
    advert: ModerationAdvertResponse;
    action: 'reject' | 'requestChanges' | 'suspend';
  } | null>(null);
  const [reason, setReason] = useState('');

  const [{ data, isLoading, handleFilter, handlePageChange, refetch }] = useApi<ModerationAdvertResponse>({ service: advertService });

  const closeActionModal = () => {
    setPendingAction(null);
    setReason('');
  };

  const openActionModal = (advert: ModerationAdvertResponse, action: 'reject' | 'requestChanges' | 'suspend') => {
    setPendingAction({ advert, action });
    setReason('');
  };

  const handleApprove = async (advert: ModerationAdvertResponse) => {
    if (!advert.identifier || !advert.version) {
      return;
    }

    try {
      await advertService.approve(advert.identifier, advert.version);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleReasonedAction = async () => {
    if (!pendingAction?.advert.identifier || !pendingAction.advert.version) {
      return;
    }

    const payload: ModerationReasonRequest = {
      expectedVersion: pendingAction.advert.version,
      reason: reason.trim(),
    };

    try {
      if (pendingAction.action === 'reject') {
        await advertService.reject(pendingAction.advert.identifier, payload);
      } else if (pendingAction.action === 'requestChanges') {
        await advertService.requestChanges(pendingAction.advert.identifier, payload);
      } else {
        await advertService.suspend(pendingAction.advert.identifier, payload);
      }

      closeActionModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const content = data?.content?.map((advert) => (
    <tr key={advert.identifier}>
      <td>{advert.title}</td>
      <td>{advert.publishedAt ? new Date(advert.publishedAt).toLocaleString('tr-TR') : ''}</td>
      <td>{advert.deletedAt ? new Date(advert.deletedAt).toLocaleString('tr-TR') : ''}</td>
      <td>{advert.categoryId}</td>
      <td>{advert.ownerUserId}</td>
      <td><StatusBadge status={advert.status} /></td>
      <td>{advert.version}</td>
      <td>
        <Button size="sm" className="me-2" variant="success" onClick={() => void handleApprove(advert)}>
          Onayla
        </Button>
        <Button size="sm" className="me-2" variant="warning" onClick={() => openActionModal(advert, 'requestChanges')}>
          Düzeltme İste
        </Button>
        <Button size="sm" className="me-2" variant="danger" onClick={() => openActionModal(advert, 'reject')}>
          Reddet
        </Button>
        <Button size="sm" variant="secondary" onClick={() => openActionModal(advert, 'suspend')}>
          Askıya Al
        </Button>
      </td>
    </tr>));

  return (

    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading heading='İlanlar' showCreateButton={false} />
        </Col>
      </Row>

      <AdvertFilter onFilter={(values: string) => handleFilter(values)} />

      <Modal show={pendingAction !== null} onHide={closeActionModal}>
        <Modal.Header closeButton>
          <Modal.Title>Moderasyon İşlemi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Gerekçe</Form.Label>
            <Form.Control as="textarea" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeActionModal}>Vazgeç</Button>
          <Button variant="primary" disabled={reason.trim().length === 0} onClick={() => void handleReasonedAction()}>
            Kaydet
          </Button>
        </Modal.Footer>
      </Modal>

      {isLoading && <Loading />}

      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={(page) => handlePageChange(page)} />}
    </Container>

  );
}
