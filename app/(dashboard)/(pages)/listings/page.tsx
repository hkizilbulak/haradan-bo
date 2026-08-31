"use client"
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Col, Container, Form, Modal, Row, Badge, Table, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { buildAdvertDetailUrl } from '@/contants/urls';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import {
  getAdvertStatusText,
  getPackageAssignmentSourceText,
  getPackageAssignmentStatusText,
} from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import { canModerationAction } from '@/helpers/moderationActions';
import useCursorApi from '@/hooks/useCursorApi';
import { ModerationAdvertResponse } from '@/models';
import {
  advertService,
  categoryService,
  ModerationReasonRequest,
  AdvertPackageAssignment,
  AssignPackageRequest,
  packageService,
  PackageResponse,
} from '@/services';
import { PageHeading } from '@/widgets';
import AdvertFilter from '@/widgets/advert/AdvertFilter';
import CursorPagination from '@/components/CursorPagination';

const headItems = [
  'Başlık',
  'Yayın Tarihi',
  'Kategori',
  'Durum',
  ''
];

function PackageModal({ advert, onClose, onDone }: { advert: ModerationAdvertResponse; onClose: () => void; onDone: () => void }) {
  const advertId = advert.identifier ?? advert.id;
  const [tab, setTab] = useState<'assign' | 'history'>('assign');
  const [packages, setPackages] = useState<PackageResponse[]>([]);
  const [currentPackage, setCurrentPackage] = useState<AdvertPackageAssignment | null>(null);
  const [packageCode, setPackageCode] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [history, setHistory] = useState<AdvertPackageAssignment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!advertId) {
      return;
    }

    setLoadingCurrent(true);
    Promise.all([
      packageService.search({ pageRequest: { page: 0, size: 200 } }),
      advertService.getPackage(advertId).catch(() => null),
    ])
      .then(([packagePage, assignment]) => {
        setPackages((packagePage.content || []).filter((item) => item.isActive));
        setCurrentPackage(assignment);
        if (assignment?.packageCode) {
          setPackageCode(assignment.packageCode);
        }
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingCurrent(false));
  }, [advertId]);

  const loadHistory = useCallback(() => {
    if (!advertId) return;
    setHistoryLoading(true);
    advertService.getPackageHistory(advertId)
      .then(setHistory)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setHistoryLoading(false));
  }, [advertId]);

  useEffect(() => {
    if (tab === 'history') {
      loadHistory();
    }
  }, [tab, loadHistory]);

  const handleAssign = async () => {
    if (!advertId || !packageCode.trim() || submitting) return;
    setSubmitting(true);
    try {
      const request: AssignPackageRequest = {
        packageCode: packageCode.trim(),
        reason: assignReason.trim() || undefined,
      };
      await advertService.assignPackage(advertId, request);
      toast.success('Paket atandı');
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!advertId || submitting) return;
    setSubmitting(true);
    try {
      await advertService.cancelPackage(advertId);
      toast.success('Paket iptal edildi');
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUrgent = async (activate: boolean) => {
    if (!advertId || submitting) return;
    setSubmitting(true);
    try {
      if (activate) {
        await advertService.activateUrgent(advertId);
        toast.success('Acil ilan aktifleştirildi');
      } else {
        await advertService.deactivateUrgent(advertId);
        toast.success('Acil ilan kapatıldı');
      }
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
        <Modal.Title>Paket İşlemleri — {advert.title ?? advertId}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <Button size="sm" variant={tab === 'assign' ? 'primary' : 'outline-primary'} className="me-2" onClick={() => setTab('assign')}>Paket Ata / Acil</Button>
          <Button size="sm" variant={tab === 'history' ? 'primary' : 'outline-primary'} onClick={() => setTab('history')}>Geçmiş</Button>
        </div>

        {tab === 'assign' && (
          <>
            {loadingCurrent && <Loading />}
            {!loadingCurrent && (
              <>
                {currentPackage ? (
                  <Alert variant="info" className="py-2">
                    Aktif paket: <strong>{currentPackage.packageCode}</strong> ({getPackageAssignmentStatusText(currentPackage.status)})
                  </Alert>
                ) : (
                  <Alert variant="secondary" className="py-2">Aktif paket ataması yok.</Alert>
                )}
                <Form.Group className="mb-3">
                  <Form.Label>Paket</Form.Label>
                  <Form.Select value={packageCode} onChange={(e) => setPackageCode(e.target.value)}>
                    <option value="">Paket seçin</option>
                    {packages.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.displayName}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Sebep (opsiyonel)</Form.Label>
                  <Form.Control value={assignReason} onChange={(e) => setAssignReason(e.target.value)} />
                </Form.Group>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <Button variant="success" disabled={!packageCode.trim() || submitting} onClick={() => void handleAssign()}>Paket Ata</Button>
                  <Button variant="danger" disabled={submitting || !currentPackage} onClick={() => void handleCancel()}>Mevcut Paketi İptal Et</Button>
                </div>
                <hr />
                <div className="d-flex flex-wrap gap-2">
                  <Button variant="warning" disabled={submitting || !currentPackage} onClick={() => void handleUrgent(true)}>Acil Aktifleştir</Button>
                  <Button variant="outline-secondary" disabled={submitting} onClick={() => void handleUrgent(false)}>Acil Kapat</Button>
                </div>
              </>
            )}
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
                      <td><Badge bg={statusVariant(item.status)}>{getPackageAssignmentStatusText(item.status)}</Badge></td>
                      <td>{formatDateTimeForText(item.startsAt)}</td>
                      <td>{item.endsAt ? formatDateTimeForText(item.endsAt) : '-'}</td>
                      <td>{getPackageAssignmentSourceText(item.source)}</td>
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

function ActionModal({
  action,
  advert,
  onClose,
  onSubmit,
}: {
  action: 'reject' | 'requestChanges' | 'suspend';
  advert: ModerationAdvertResponse;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const title =
    action === 'reject'
      ? 'İlanı Reddet'
      : action === 'requestChanges'
        ? 'Düzeltme İste'
        : 'İlanı Askıya Al';

  const label =
    action === 'reject'
      ? 'Ret Sebebi'
      : action === 'requestChanges'
        ? 'Düzeltme Talebi Notu'
        : 'Askıya Alma Sebebi';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Lütfen bir açıklama girin');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <p className="text-muted mb-2">
            <strong>İlan:</strong> {advert.title || advert.id}
          </p>
          <Form.Group>
            <Form.Label>{label} <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Açıklama giriniz..."
              required
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Vazgeç
          </Button>
          <Button
            variant={action === 'reject' ? 'danger' : action === 'requestChanges' ? 'warning' : 'secondary'}
            type="submit"
            disabled={submitting || !reason.trim()}
          >
            {submitting ? 'İşleniyor...' : 'Onayla'}
          </Button>
        </Modal.Footer>
      </Form>
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
  const [actionBusy, setActionBusy] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    categoryService.search({ pageRequest: { page: 0, size: 500 } })
      .then((res) => {
        const map = new Map<string, string>();
        const extract = (items: Array<{ identifier?: string; id?: string; name?: string; children?: unknown[] }>) => {
          for (const item of items) {
            const id = item.identifier ?? item.id;
            if (id && item.name) {
              map.set(id, item.name);
            }
            if (item.children && Array.isArray(item.children)) {
              extract(item.children as Array<{ identifier?: string; id?: string; name?: string; children?: unknown[] }>);
            }
          }
        };
        if (res?.content) {
          extract(res.content as Array<{ identifier?: string; id?: string; name?: string; children?: unknown[] }>);
        }
        setCategoryMap(map);
      })
      .catch(() => {});
  }, []);

  const [{ data, isLoading, isError, handleFilter, refetch, goNext, goPrev, canGoPrev, canGoNext, pageIndex }] = useCursorApi<ModerationAdvertResponse>({
    service: advertService,
    pageSize: 10,
  });

  const closeActionModal = () => {
    setPendingAction(null);
    setReason('');
  };

  const openActionModal = (advert: ModerationAdvertResponse, action: 'reject' | 'requestChanges' | 'suspend') => {
    setPendingAction({ advert, action });
    setReason('');
  };

  const handleApprove = async (advert: ModerationAdvertResponse) => {
    const advertId = advert.identifier ?? advert.id;
    if (!advertId || !advert.version || actionBusy) {
      return;
    }

    setActionBusy(true);
    try {
      await advertService.approve(advertId, advert.version);
      toast.success('İlan onaylandı');
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionBusy(false);
    }
  };

  const handleReasonedAction = async () => {
    const advertId = pendingAction?.advert.identifier ?? pendingAction?.advert.id;
    if (!advertId || !pendingAction?.advert.version || actionBusy) {
      return;
    }

    if (reason.trim().length === 0) {
      toast.error('Gerekçe zorunludur');
      return;
    }

    const payload: ModerationReasonRequest = {
      expectedVersion: pendingAction.advert.version,
      reason: reason.trim(),
    };

    setActionBusy(true);
    try {
      if (pendingAction.action === 'reject') {
        await advertService.reject(advertId, payload);
      } else if (pendingAction.action === 'requestChanges') {
        await advertService.requestChanges(advertId, payload);
      } else {
        await advertService.suspend(advertId, payload);
      }

      toast.success('Moderasyon işlemi tamamlandı');
      closeActionModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionBusy(false);
    }
  };

  const content = data?.content?.map((advert) => {
    const advertId = advert.identifier ?? advert.id;
    const canApprove = canModerationAction(advert.status, 'approve');
    const canRequestChanges = canModerationAction(advert.status, 'requestChanges');
    const canReject = canModerationAction(advert.status, 'reject');
    const canSuspend = canModerationAction(advert.status, 'suspend');
    const categoryName = advert.categoryId ? (categoryMap.get(advert.categoryId) || advert.categoryId) : '-';
    return (
      <tr key={advertId}>
        <td>{advert.title}</td>
        <td>{advert.publishedAt ? formatDateTimeForText(advert.publishedAt) : '-'}</td>
        <td title={advert.categoryId || undefined}>{categoryName}</td>
        <td><StatusBadge status={advert.status} /></td>
        <td className="d-flex flex-wrap gap-1">
          <Button
            as="a"
            href={buildAdvertDetailUrl(advertId!)}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            variant="outline-primary"
          >
            Detay
          </Button>
          {canApprove && (
            <Button size="sm" variant="success" disabled={actionBusy} onClick={() => void handleApprove(advert)}>
              Onayla
            </Button>
          )}
          {canRequestChanges && (
            <Button size="sm" variant="warning" onClick={() => openActionModal(advert, 'requestChanges')}>
              Düzeltme İste
            </Button>
          )}
          {canReject && (
            <Button size="sm" variant="danger" onClick={() => openActionModal(advert, 'reject')}>
              Reddet
            </Button>
          )}
          {canSuspend && (
            <Button size="sm" variant="secondary" onClick={() => openActionModal(advert, 'suspend')}>
              Askıya Al
            </Button>
          )}
          <Button size="sm" variant="info" onClick={() => setPackageAdvert(advert)}>
            Paket
          </Button>
        </td>
      </tr>
    );
  });

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
          <Button variant="primary" disabled={reason.trim().length === 0 || actionBusy} onClick={() => void handleReasonedAction()}>
            Kaydet
          </Button>
        </Modal.Footer>
      </Modal>

      {packageAdvert && <PackageModal advert={packageAdvert} onClose={() => setPackageAdvert(null)} onDone={() => { setPackageAdvert(null); refetch(); }} />}

      {isLoading && <Loading />}

      {!isLoading && isError && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>İlanlar yüklenirken bir hata oluştu.</span>
          <Button size="sm" variant="outline-danger" onClick={() => refetch()}>Tekrar Dene</Button>
        </Alert>
      )}

      {!isLoading && !isError && (data?.content?.length ?? 0) === 0 && (
        <Alert variant="light" className="border text-muted">Moderasyon kuyruğunda ilan bulunmuyor.</Alert>
      )}

      {!isLoading && !isError && (data?.content?.length ?? 0) > 0 && (
        <>
          <PrepareTable headItems={headItems} content={content} page={undefined} onHandlePageChange={() => undefined} />
          <CursorPagination
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onPrev={goPrev}
            onNext={goNext}
            pageIndex={pageIndex}
          />
        </>
      )}
    </Container>
  );
}
