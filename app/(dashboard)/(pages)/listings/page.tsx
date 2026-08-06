"use client"
import React, { useState } from 'react';
import { Button, Col, Container, Form, Modal, Row, Badge, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import { ModerationAdvertResponse } from '@/models';
import { advertService, ModerationReasonRequest, AdvertPackageAssignment, AssignPackageRequest } from '@/services';
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

function PackageModal({ advert, onClose, onDone }: { advert: ModerationAdvertResponse; onClose: () => void; onDone: () => void }) {
  const [tab, setTab] = useState<'assign' | 'history'>('assign');
  const [packageCode, setPackageCode] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [history, setHistory] = useState<AdvertPackageAssignment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadHistory = () => {
    if (!advert.identifier) return;
    setHistoryLoading(true);
    advertService.getPackageHistory(advert.identifier)
      .then(setHistory)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setHistoryLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (tab === 'history') {
      loadHistory();
    }
  }, [tab]);

  const handleAssign = async () => {
    if (!advert.identifier || !packageCode.trim()) return;
    setSubmitting(true);
    try {
      const request: AssignPackageRequest = {
        packageCode: packageCode.trim(),
        reason: assignReason.trim() || undefined,
      };
      await advertService.assignPackage(advert.identifier, request);
      toast.success('Paket atandı');
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!advert.identifier) return;
    setSubmitting(true);
    try {
      await advertService.cancelPackage(advert.identifier);
      toast.success('Paket iptal edildi');
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'EXPIRED': return 'warning';
      case 'CANCELLED': return 'danger';
      case 'SUPERSEDED': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Modal show onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Paket İşlemleri — {advert.title ?? advert.identifier}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <Button size="sm" variant={tab === 'assign' ? 'primary' : 'outline-primary'} className="me-2" onClick={() => setTab('assign')}>Paket Ata / İptal</Button>
          <Button size="sm" variant={tab === 'history' ? 'primary' : 'outline-primary'} onClick={() => setTab('history')}>Geçmiş</Button>
        </div>

        {tab === 'assign' && (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Paket Kodu</Form.Label>
              <Form.Control value={packageCode} onChange={(e) => setPackageCode(e.target.value)} placeholder="Örn: PREMIUM" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sebep (opsiyonel)</Form.Label>
              <Form.Control value={assignReason} onChange={(e) => setAssignReason(e.target.value)} />
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="success" disabled={!packageCode.trim() || submitting} onClick={handleAssign}>Paket Ata</Button>
              <Button variant="danger" disabled={submitting} onClick={handleCancel}>Mevcut Paketi İptal Et</Button>
            </div>
          </>
        )}

        {tab === 'history' && (
          <>
            {historyLoading && <Loading />}
            {!historyLoading && history.length === 0 && <p className="text-muted">Paket geçmişi bulunamadı.</p>}
            {!historyLoading && history.length > 0 && (
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Paket</th>
                    <th>Durum</th>
                    <th>Başlangıç</th>
                    <th>Bitiş</th>
                    <th>Kaynak</th>
                    <th>Sebep</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td>{item.packageCode}</td>
                      <td><Badge bg={statusVariant(item.status)}>{item.status}</Badge></td>
                      <td>{formatDateTimeForText(item.startsAt)}</td>
                      <td>{item.endsAt ? formatDateTimeForText(item.endsAt) : '-'}</td>
                      <td>{item.source}</td>
                      <td>{item.reason ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Kapat</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function Adverts() {
  const [pendingAction, setPendingAction] = useState<{
    advert: ModerationAdvertResponse;
    action: 'reject' | 'requestChanges' | 'suspend';
  } | null>(null);
  const [packageAdvert, setPackageAdvert] = useState<ModerationAdvertResponse | null>(null);
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
        <Button size="sm" className="ms-2" variant="info" onClick={() => setPackageAdvert(advert)}>
          Paket
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

      {packageAdvert && <PackageModal advert={packageAdvert} onClose={() => setPackageAdvert(null)} onDone={() => { setPackageAdvert(null); refetch(); }} />}

      {isLoading && <Loading />}

      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={(page) => handlePageChange(page)} />}
    </Container>

  );
}
