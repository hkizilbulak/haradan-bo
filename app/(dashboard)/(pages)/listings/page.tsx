"use client"
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Col, Container, Form, Modal, Row, Badge, Table, Alert, Nav, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText, formatDateTimeForText } from '@/helpers/DateUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import { ModerationAdvertResponse } from '@/models';
import {
  advertService,
  categoryService,
  userService,
  ModerationReasonRequest,
} from '@/services';
import { PageHeading, AdvertDetailModal, PackageModal } from '@/widgets';
import AdvertFilter from '@/widgets/advert/AdvertFilter';
import CustomPagination from '@/components/Pagination';
import { getAdvertMainCategory } from '@/helpers/advertCategoryHelper';

type OwnerAccountInfo = {
  name?: string;
  email?: string;
};

export default function Adverts() {
  const [tab, setTab] = useState<'published' | 'unpublished'>('unpublished');
  const [pendingAction, setPendingAction] = useState<{
    advert: ModerationAdvertResponse;
    action: 'reject' | 'requestChanges' | 'suspend';
  } | null>(null);
  const [pendingApprove, setPendingApprove] = useState<ModerationAdvertResponse | null>(null);
  const [packageAdvert, setPackageAdvert] = useState<ModerationAdvertResponse | null>(null);
  const [detailAdvert, setDetailAdvert] = useState<ModerationAdvertResponse | null>(null);
  const [reason, setReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [userMap, setUserMap] = useState<Map<string, OwnerAccountInfo>>(new Map());
  const [advertOwnerMap, setAdvertOwnerMap] = useState<Map<string, OwnerAccountInfo>>(new Map());

  useEffect(() => {
    userService.fetchAll()
      .then((users) => {
        const map = new Map<string, OwnerAccountInfo>();
        for (const u of users) {
          const id = u.identifier ?? u.id;
          if (id) {
            const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
            const info: OwnerAccountInfo = {
              name: fullName || undefined,
              email: u.email || undefined,
            };
            map.set(id, info);
            map.set(id.toLowerCase(), info);
          }
        }
        const defaultAdmin: OwnerAccountInfo = {
          name: 'Sistem Yöneticisi',
          email: 'admin@haradan.com',
        };
        map.set('u1000000-0000-4000-8000-000000000001', defaultAdmin);
        setUserMap((prev) => {
          const next = new Map(prev);
          map.forEach((v, k) => {
            next.set(k, v);
          });
          return next;
        });
      })
      .catch(() => {});
  }, []);

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
      filter: 'status==UNPUBLISHED',
      pageRequest: { page: 0, size: 10, sort: [{ direction: 'DESC', property: 'createdDate' }] },
    } as any,
  });

  // Effect to resolve missing ownerUserIds and owner details for displayed adverts
  useEffect(() => {
    const adverts = data?.content ?? [];
    if (adverts.length === 0) return;

    let isMounted = true;

    adverts.forEach(async (adv) => {
      const advId = adv.identifier ?? adv.id;
      if (!advId) return;

      if (advertOwnerMap.has(advId)) return;

      let ownerId = adv.ownerUserId;

      // If ownerUserId is not present on the advert summary, fetch advert detail
      if (!ownerId) {
        try {
          const detail = await advertService.getDetail(advId);
          ownerId = detail.ownerUserId;
        } catch {
          // ignore
        }
      }

      if (!isMounted) return;

      if (ownerId) {
        const found = userMap.get(ownerId) || userMap.get(ownerId.toLowerCase());
        if (found) {
          if (isMounted) {
            setAdvertOwnerMap((prev) => new Map(prev).set(advId, found));
          }
          return;
        }

        try {
          const u = await userService.getById(ownerId);
          if (u && isMounted) {
            const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
            const info: OwnerAccountInfo = {
              name: fullName || undefined,
              email: u.email || undefined,
            };
            setUserMap((prev) => {
              const next = new Map(prev);
              next.set(ownerId!, info);
              const uId = u.identifier ?? u.id;
              if (uId) next.set(uId, info);
              return next;
            });
            setAdvertOwnerMap((prev) => new Map(prev).set(advId, info));
          }
        } catch {
          if (isMounted) {
            const pName = (adv as any).properties?.ownerName || (adv as any).ownerName;
            const pEmail = (adv as any).properties?.ownerEmail || (adv as any).ownerEmail;
            if (pName || pEmail) {
              setAdvertOwnerMap((prev) => new Map(prev).set(advId, {
                name: pName || undefined,
                email: pEmail || undefined,
              }));
            }
          }
        }
      } else {
        const pName = (adv as any).properties?.ownerName || (adv as any).ownerName;
        const pEmail = (adv as any).properties?.ownerEmail || (adv as any).ownerEmail;
        if (pName || pEmail) {
          setAdvertOwnerMap((prev) => new Map(prev).set(advId, {
            name: pName || undefined,
            email: pEmail || undefined,
          }));
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [data?.content, userMap, advertOwnerMap]);

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

  const handleConfirmApprove = async () => {
    if (!pendingApprove) return;
    const advert = pendingApprove;
    const advertId = advert.identifier ?? advert.id;
    if (!advertId || !advert.version || actionBusy) {
      return;
    }

    setActionBusy(true);
    try {
      await advertService.approve(advertId, advert.version);
      toast.success(advert.status === 'SUSPENDED' ? 'İlan yayınlandı' : 'İlan onaylandı');
      setPendingApprove(null);
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

  const headItems = tab === 'published'
    ? [
        'İlanı Gönderen',
        'Gönderim Tarihi',
        'Yayın Tarihi',
        'Kategori',
        'Durum',
        'İşlemler',
      ]
    : [
        'İlanı Gönderen',
        'Gönderim Tarihi',
        'Kategori',
        'Durum',
        'İşlemler',
      ];

  const activeStatus = (() => {
    if (!parameters?.filter) return undefined;
    const clause = parameters.filter.split(';').map((p) => p.trim()).find((p) => p.startsWith('status=='));
    if (!clause) return undefined;
    return clause.slice('status=='.length).trim();
  })();

  const activeCategory = (() => {
    if (!parameters?.filter) return undefined;
    const clause = parameters.filter.split(';').map((p) => p.trim()).find((p) => p.startsWith('mainCategory=='));
    if (!clause) return undefined;
    return clause.slice('mainCategory=='.length).trim();
  })();

  const filteredItems = (data?.content ?? []).filter((advert) => {
    if (tab === 'unpublished') {
      if (advert.status === 'CHANGES_REQUESTED') return false;
      if (activeStatus && activeStatus !== 'UNPUBLISHED') {
        if (advert.status !== activeStatus) return false;
      } else {
        if (advert.status !== 'PENDING_REVIEW' && advert.status !== 'REJECTED' && advert.status !== 'SUSPENDED') {
          return false;
        }
      }
    }
    if (tab === 'published') {
      if (advert.status !== 'PUBLISHED') return false;
    }
    if (activeCategory) {
      const catName = advert.categoryId ? (categoryMap.get(advert.categoryId) || advert.categoryId) : undefined;
      const cat = getAdvertMainCategory(advert.categoryId, catName, (advert as any).properties);
      if (cat !== activeCategory) return false;
    }
    return true;
  });

  const content = filteredItems.map((advert) => {
    const advertId = advert.identifier ?? advert.id ?? '';
    const categoryName = advert.categoryId ? (categoryMap.get(advert.categoryId) || advert.categoryId) : '-';
    
    // İlanı Gönderen Hesap Bilgisi
    const ownerInfo = (advertId ? advertOwnerMap.get(advertId) : undefined)
      || (advert.ownerUserId ? (userMap.get(advert.ownerUserId) || userMap.get(advert.ownerUserId.toLowerCase())) : undefined)
      || (advert.ownerName ? { name: advert.ownerName, email: (advert as any).properties?.ownerEmail } : undefined)
      || ((advert as any).properties?.ownerName ? { name: (advert as any).properties.ownerName, email: (advert as any).properties?.ownerEmail } : undefined);

    const primaryText = ownerInfo?.name || ownerInfo?.email;
    const secondaryText = ownerInfo?.name && ownerInfo?.email ? ownerInfo.email : null;
    const tooltipText = ownerInfo ? [ownerInfo.name, ownerInfo.email].filter(Boolean).join(' - ') : undefined;

    // Gönderim Tarihi (createdAt) - saatsiz gösterim
    const createdDateValue = advert.createdAt
      || (advert as any).properties?.createdAt
      || (advert as any).updatedAt
      || (tab === 'unpublished' ? advert.publishedAt : undefined);
    const createdDateText = createdDateValue ? formatDateForText(createdDateValue) : '-';

    // Yayın Tarihi (publishedAt) - saatsiz gösterim
    const publishedDateText = advert.publishedAt ? formatDateForText(advert.publishedAt) : '-';

    return (
      <tr key={advertId}>
        <td style={{ maxWidth: '240px' }} title={tooltipText}>
          {primaryText ? (
            <div>
              <div className="fw-semibold text-dark text-truncate">
                {primaryText}
              </div>
              {secondaryText && (
                <div className="text-muted text-truncate" style={{ fontSize: '0.78rem', lineHeight: '1.2' }}>
                  {secondaryText}
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted fst-italic" style={{ fontSize: '0.85rem' }}>
              Yükleniyor...
            </span>
          )}
        </td>
        <td className="text-nowrap">{createdDateText}</td>
        {tab === 'published' && <td className="text-nowrap">{publishedDateText}</td>}
        <td className="text-truncate" style={{ maxWidth: '160px' }} title={advert.categoryId || undefined}>
          {categoryName}
        </td>
        <td className="text-nowrap">
          <StatusBadge status={advert.status} />
        </td>
        <td className="text-center text-nowrap">
          <div className="d-flex gap-1 align-items-center justify-content-center">
            <Button
              size="sm"
              variant="outline-primary"
              className="d-inline-flex align-items-center justify-content-center"
              style={{ width: '32px', height: '32px', padding: 0 }}
              title="Detay"
              onClick={() => setDetailAdvert(advert)}
            >
              <i className="fe fe-eye" />
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              className="d-inline-flex align-items-center justify-content-center"
              style={{ width: '32px', height: '32px', padding: 0 }}
              title="Paket ve İlan Düzenle"
              onClick={() => setPackageAdvert(advert)}
            >
              <i className="fe fe-edit" />
            </Button>
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

      {/* Sekmeler */}
      <div className="mb-3">
        <Nav
          variant="pills"
          className="bg-white p-1 rounded-3 border shadow-sm w-100 w-md-auto d-flex flex-row"
          style={{ maxWidth: '440px' }}
        >
          <Nav.Item className="flex-fill">
            <Nav.Link
              active={tab === 'unpublished'}
              onClick={() => setTab('unpublished')}
              className={`px-2 px-sm-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-1 gap-sm-2 rounded-2 text-center text-nowrap ${
                tab === 'unpublished' ? 'active shadow-sm text-white' : 'text-muted'
              }`}
              style={{ cursor: 'pointer', fontSize: '13px' }}
            >
              <i className="fe fe-inbox" />
              <span>
                <span className="d-inline d-sm-none">Yayında Olmayan</span>
                <span className="d-none d-sm-inline">Yayında Olmayan İlanlar</span>
              </span>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item className="flex-fill">
            <Nav.Link
              active={tab === 'published'}
              onClick={() => setTab('published')}
              className={`px-2 px-sm-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-1 gap-sm-2 rounded-2 text-center text-nowrap ${
                tab === 'published' ? 'active shadow-sm text-white' : 'text-muted'
              }`}
              style={{ cursor: 'pointer', fontSize: '13px' }}
            >
              <i className="fe fe-check-circle" />
              <span>
                <span className="d-inline d-sm-none">Yayında Olan</span>
                <span className="d-none d-sm-inline">Yayında Olan İlanlar</span>
              </span>
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </div>

      {/* Filtre */}
      <div className="mb-3">
        <AdvertFilter onFilter={(values: string) => handleFilter(values)} tab={tab} />
      </div>

      {/* Moderasyon İşlemi Açılan Penceresi (Modal) */}
      <Modal show={pendingAction !== null} onHide={closeActionModal} centered backdrop="static">
        <Modal.Header closeButton className="border-bottom-0 pb-1">
          <div className="d-flex align-items-center gap-3">
            <div
              className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                pendingAction?.action === 'reject'
                  ? 'bg-danger-subtle text-danger'
                  : pendingAction?.action === 'suspend'
                  ? 'bg-secondary-subtle text-secondary'
                  : 'bg-primary-subtle text-primary'
              }`}
              style={{ width: '44px', height: '44px' }}
            >
              <i
                className={`fs-4 ${
                  pendingAction?.action === 'reject'
                    ? 'fe fe-x-circle'
                    : pendingAction?.action === 'suspend'
                    ? 'fe fe-pause-circle'
                    : 'fe fe-edit-3'
                }`}
              />
            </div>
            <div>
              <Modal.Title className="h5 mb-0 fw-bold">
                {pendingAction?.action === 'reject'
                  ? 'İlanı Reddet'
                  : pendingAction?.action === 'suspend'
                  ? 'Yayından Kaldır'
                  : 'Düzeltme Talebi'}
              </Modal.Title>
              <small className="text-muted">
                {pendingAction?.action === 'reject'
                  ? 'İlanın reddedilme gerekçesini belirtiniz.'
                  : pendingAction?.action === 'suspend'
                  ? 'İlanın yayından kaldırılma gerekçesini belirtiniz.'
                  : 'Kullanıcıya iletilecek notu belirtiniz.'}
              </small>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {pendingAction?.advert && (
            <div className="p-3 bg-light rounded-3 mb-3 border">
              <div className="text-muted small mb-1">İşlem Yapılan İlan:</div>
              <div className="fw-semibold text-dark text-truncate">
                {pendingAction.advert.title || 'Başlıksız İlan'}
              </div>
            </div>
          )}
          <Form.Group>
            <Form.Label className="small fw-semibold text-secondary">
              Gerekçe <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={reason}
              placeholder={
                pendingAction?.action === 'reject'
                  ? 'İlanın neden reddedildiğini detaylıca açıklayınız (kullanıcıya gösterilecektir)...'
                  : 'Gerekçe açıklamasını giriniz...'
              }
              className="rounded-3 shadow-none"
              onChange={(event) => setReason(event.target.value)}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-top-0 pt-1">
          <Button variant="outline-secondary" className="rounded-3 px-3" onClick={closeActionModal} disabled={actionBusy}>
            Vazgeç
          </Button>
          <Button
            variant={
              pendingAction?.action === 'reject'
                ? 'danger'
                : pendingAction?.action === 'suspend'
                ? 'secondary'
                : 'primary'
            }
            className="rounded-3 px-4 fw-semibold text-white"
            disabled={reason.trim().length === 0 || actionBusy}
            onClick={() => void handleReasonedAction()}
          >
            {actionBusy ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                İşleniyor...
              </>
            ) : pendingAction?.action === 'reject' ? (
              'İlanı Reddet'
            ) : pendingAction?.action === 'suspend' ? (
              'Yayından Kaldır'
            ) : (
              'Kaydet'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Yayınlama / Onaylama Onay Penceresi (Modal) */}
      <Modal show={pendingApprove !== null} onHide={() => !actionBusy && setPendingApprove(null)} centered backdrop="static">
        <Modal.Header closeButton={!actionBusy} className="border-bottom-0 pb-1">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 bg-success-subtle text-success"
              style={{ width: '44px', height: '44px' }}
            >
              <i className="fs-4 fe fe-check-circle" />
            </div>
            <div>
              <Modal.Title className="h5 mb-0 fw-bold">
                {pendingApprove?.status === 'SUSPENDED' ? 'İlanı Yayınla' : 'İlanı Onayla'}
              </Modal.Title>
              <small className="text-muted">
                {pendingApprove?.status === 'SUSPENDED'
                  ? 'İlanı tekrar yayına almak üzeresiniz.'
                  : 'İlanı onaylayıp yayına almak üzeresiniz.'}
              </small>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {pendingApprove && (
            <div className="p-3 bg-light rounded-3 mb-3 border">
              <div className="text-muted small mb-1">İşlem Yapılan İlan:</div>
              <div className="fw-semibold text-dark text-truncate">
                {pendingApprove.title || 'Başlıksız İlan'}
              </div>
            </div>
          )}
          <p className="text-muted mb-0" style={{ fontSize: '14.5px', lineHeight: '1.5' }}>
            {pendingApprove?.status === 'SUSPENDED'
              ? 'Bu ilanı tekrar yayına almak istediğinize emin misiniz?'
              : 'Bu ilanı onaylayıp yayına almak istediğinize emin misiniz?'}
          </p>
        </Modal.Body>
        <Modal.Footer className="border-top-0 pt-1">
          <Button
            variant="outline-secondary"
            className="rounded-3 px-3"
            onClick={() => setPendingApprove(null)}
            disabled={actionBusy}
          >
            Vazgeç
          </Button>
          <Button
            variant="success"
            className="rounded-3 px-4 fw-semibold text-white d-inline-flex align-items-center gap-2"
            disabled={actionBusy}
            onClick={() => void handleConfirmApprove()}
          >
            {actionBusy ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                İşleniyor...
              </>
            ) : (
              <>
                <i className="fe fe-check" />
                {pendingApprove?.status === 'SUSPENDED' ? 'Evet, Yayınla' : 'Evet, Onayla'}
              </>
            )}
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
        onApprove={(adv) => setPendingApprove(adv)}
        onReject={(adv) => openActionModal(adv, 'reject')}
        onSuspend={(adv) => openActionModal(adv, 'suspend')}
      />

      {isLoading && <Loading />}

      {!isLoading && isError && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>İlanlar yüklenirken bir hata oluştu.</span>
          <Button size="sm" variant="outline-danger" onClick={() => refetch()}>Tekrar Dene</Button>
        </Alert>
      )}

      {!isLoading && !isError && filteredItems.length === 0 && (
        <Alert variant="light" className="border text-muted">
          {activeCategory || (activeStatus && activeStatus !== 'UNPUBLISHED')
            ? 'Seçilen filtre kriterlerine uygun ilan bulunamadı.'
            : tab === 'published'
            ? 'Yayında ilan bulunmuyor.'
            : 'Moderasyon kuyruğunda ilan bulunmuyor.'}
        </Alert>
      )}

      {!isLoading && !isError && filteredItems.length > 0 && (
        <>
          <Card className="border-0 shadow-sm rounded-3 overflow-hidden mb-3">
            <PrepareTable headItems={headItems} content={content} page={undefined} onHandlePageChange={() => undefined} />
          </Card>
          
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-3 pt-3 border-top">
            <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-md-start gap-2 text-muted small w-100 w-md-auto">
              <span className="text-nowrap fw-medium">Sayfa başına:</span>
              <Form.Select 
                size="sm" 
                className="rounded-2 shadow-none border text-center fw-medium" 
                style={{ width: '85px', minWidth: '85px', display: 'inline-block', cursor: 'pointer' }} 
                value={pageSize} 
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Form.Select>
              <span className="text-nowrap ms-md-2">
                Toplam <strong>{data?.page?.totalElements ?? 0}</strong> kayıt (Sayfa {pageIndex + 1} / {data?.page?.totalPages ?? 1})
              </span>
            </div>
            
            <div className="d-flex justify-content-center align-items-center w-100 w-md-auto overflow-auto">
              <CustomPagination page={data?.page} onPageChange={handlePageChange} />
            </div>
          </div>
        </>
      )}
    </Container>
  );
}
