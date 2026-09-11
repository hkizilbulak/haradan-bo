"use client"
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Col, Container, Form, Modal, Row, Badge, Table, Alert, Tabs, Tab } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getAdvertStatusText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import { canModerationAction } from '@/helpers/moderationActions';
import useApi from '@/hooks/useApi';
import { ModerationAdvertResponse } from '@/models';
import {
  advertService,
  categoryService,
  ModerationReasonRequest,
} from '@/services';
import { PageHeading, AdvertDetailModal, PackageModal } from '@/widgets';
import AdvertFilter from '@/widgets/advert/AdvertFilter';
import CustomPagination from '@/components/Pagination';

const headItems = [
  'Başlık',
  'Yayın Tarihi',
  'Kategori',
  'Durum',
  ''
];


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
  const [tab, setTab] = useState<'published' | 'unpublished'>('published');
  const [pendingAction, setPendingAction] = useState<{
    advert: ModerationAdvertResponse;
    action: 'reject' | 'requestChanges' | 'suspend';
  } | null>(null);
  const [packageAdvert, setPackageAdvert] = useState<ModerationAdvertResponse | null>(null);
  const [detailAdvert, setDetailAdvert] = useState<ModerationAdvertResponse | null>(null);
  const [reason, setReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    categoryService.search({ pageRequest: { page: 0, size: 100 } })
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

  const [{ data, parameters, isLoading, isError, handleFilter, handlePageChange, setParameters, refetch }] = useApi<ModerationAdvertResponse>({
    service: advertService,
    params: {
      filter: 'status==PUBLISHED',
      pageRequest: { page: 0, size: 10, sort: [{ direction: 'DESC', property: 'createdDate' }] },
    } as any,
  });

  const pageIndex = parameters?.pageRequest?.page ?? 0;
  const pageSize = parameters?.pageRequest?.size ?? 10;
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handlePageSizeChange = (size: number) => {
    setParameters({
      ...parameters,
      pageRequest: {
        ...parameters.pageRequest,
        size,
        page: 0, // Reset to first page when size changes
      }
    });
  };

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
    const canReject = canModerationAction(advert.status, 'reject');
    const categoryName = advert.categoryId ? (categoryMap.get(advert.categoryId) || advert.categoryId) : '-';
    return (
      <tr key={advertId}>
        <td>{advert.title}</td>
        <td>{advert.publishedAt ? formatDateTimeForText(advert.publishedAt) : '-'}</td>
        <td title={advert.categoryId || undefined}>{categoryName}</td>
        <td><StatusBadge status={advert.status} /></td>
        <td style={{ minWidth: '420px' }}>
          <div className="d-flex flex-wrap gap-1 align-items-center">
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => setDetailAdvert(advert)}
            >
              Detay
            </Button>
            {canApprove && (
              <Button size="sm" variant="success" disabled={actionBusy} onClick={() => void handleApprove(advert)}>
                Onayla
              </Button>
            )}

            {canReject && (
              <Button size="sm" variant="danger" onClick={() => openActionModal(advert, 'reject')}>
                Reddet
              </Button>
            )}
          </div>
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

      <Tabs activeKey={tab} onSelect={(k) => setTab(k as any)} className="mb-3">
        <Tab eventKey="published" title="Yayında Olan İlanlar" />
        <Tab eventKey="unpublished" title="Yayında Olmayan İlanlar" />
      </Tabs>

      <AdvertFilter onFilter={(values: string) => handleFilter(values)} tab={tab} />

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

      <AdvertDetailModal
        advert={detailAdvert}
        categoryName={
          detailAdvert?.categoryId
            ? categoryMap.get(detailAdvert.categoryId) || detailAdvert.categoryId
            : undefined
        }
        onClose={() => setDetailAdvert(null)}
        onApprove={(adv) => void handleApprove(adv)}
        onReject={(adv) => openActionModal(adv, 'reject')}
        onSuspend={(adv) => openActionModal(adv, 'suspend')}
        onPackage={(adv) => setPackageAdvert(adv)}
      />

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
          
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="d-flex align-items-center text-muted small">
              <span className="me-2">Sayfa başına:</span>
              <Form.Select 
                size="sm" 
                className="me-3" 
                style={{ width: '70px', display: 'inline-block' }} 
                value={pageSize} 
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Form.Select>
              <span>Toplam {data?.page?.totalElements ?? 0} kayıt, sayfa {pageIndex + 1} / {data?.page?.totalPages ?? 1}</span>
            </div>
            
            <div className="me-4">
              <CustomPagination page={data?.page} onPageChange={handlePageChange} />
            </div>
          </div>
        </>
      )}
    </Container>
  );
}
