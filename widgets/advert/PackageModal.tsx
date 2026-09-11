"use client"
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Button, Form, Badge, Table, Alert, Row, Col, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { buildMediaUrl } from '@/contants/urls';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import {
  getPackageAssignmentSourceText,
  getPackageAssignmentStatusText,
} from '@/helpers/EnumUtils';
import { formatMoney, getErrorMessage } from '@/helpers/HelperUtils';
import { ModerationAdvertResponse } from '@/models';
import {
  advertService,
  AdvertPackageAssignment,
  AssignPackageRequest,
  packageService,
  PackageResponse,
  ModerationAdvertDetail,
} from '@/services';

interface PackageModalProps {
  advert: ModerationAdvertResponse;
  onClose: () => void;
  onDone: () => void;
}

export default function PackageModal({ advert, onClose, onDone }: PackageModalProps) {
  const advertId = advert.identifier ?? advert.id;
  const [tab, setTab] = useState<'manage' | 'card' | 'history'>('manage');
  const [packages, setPackages] = useState<PackageResponse[]>([]);
  const [currentPackage, setCurrentPackage] = useState<AdvertPackageAssignment | null>(null);
  const [selectedPackageCode, setSelectedPackageCode] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [history, setHistory] = useState<AdvertPackageAssignment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<ModerationAdvertDetail | null>(null);
  const [isUrgentActive, setIsUrgentActive] = useState<boolean>(false);
  // Pending değişiklikler — null = değişiklik yok
  const [pendingUrgent, setPendingUrgent] = useState<boolean | null>(null);
  const [pendingVitrin, setPendingVitrin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!advertId) return;

    setLoadingCurrent(true);
    Promise.all([
      packageService.search({ pageRequest: { page: 0, size: 200 } }),
      advertService.getPackage(advertId).catch(() => null),
      advertService.getDetail(advertId).catch(() => null),
      advertService.getUrgent(advertId).catch(() => null),
    ])
      .then(([packagePage, assignment, advertDetail, urgentStatus]) => {
        const activePackages = (packagePage.content || []).filter((item) => item.isActive);
        setPackages(activePackages);
        setCurrentPackage(assignment);
        if (advertDetail) {
          setDetail(advertDetail);
        }
        if (urgentStatus != null) {
          setIsUrgentActive(urgentStatus.isUrgent);
        }
        if (assignment?.packageCode) {
          setSelectedPackageCode(assignment.packageCode);
        } else if (activePackages.length > 0) {
          setSelectedPackageCode(activePackages[0].code);
        }
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingCurrent(false));
  }, [advertId]);

  const loadHistory = useCallback(() => {
    if (!advertId) return;
    setHistoryLoading(true);
    advertService
      .getPackageHistory(advertId)
      .then(setHistory)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setHistoryLoading(false));
  }, [advertId]);

  useEffect(() => {
    if (tab === 'history') {
      loadHistory();
    }
  }, [tab, loadHistory]);

  const handleAssign = async (targetCode?: string, customReason?: string) => {
    const codeToAssign = (targetCode ?? selectedPackageCode).trim();
    if (!advertId || !codeToAssign || submitting) return;
    setSubmitting(true);
    try {
      const request: AssignPackageRequest = {
        packageCode: codeToAssign,
        reason: (customReason ?? assignReason).trim() || undefined,
      };
      await advertService.assignPackage(advertId, request);
      toast.success('Paket başarıyla atandı');
      setSelectedPackageCode(codeToAssign);
      const updated = await advertService.getPackage(advertId).catch(() => null);
      setCurrentPackage(updated);
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // İlan Kartı toggle'ları — anında API çağrısı yapmaz, pending state'e yazar
  const handleToggleUrgentPending = (activate: boolean) => {
    setPendingUrgent(activate === isUrgentActive ? null : activate);
  };

  const handleToggleVitrinPending = (enable: boolean) => {
    setPendingVitrin(enable === isVitrinActive ? null : enable);
  };

  // İlan Kartı değişikliklerini kaydet
  const handleCardSave = async () => {
    if (!advertId || submitting) return;
    if (pendingUrgent === null && pendingVitrin === null) return;
    setSubmitting(true);
    try {
      // Acil İlan değişikliği
      if (pendingUrgent !== null) {
        if (pendingUrgent) {
          await advertService.activateUrgent(advertId);
          setIsUrgentActive(true);
        } else {
          await advertService.deactivateUrgent(advertId);
          setIsUrgentActive(false);
        }
        setPendingUrgent(null);
      }

      // Vitrin değişikliği
      if (pendingVitrin !== null) {
        if (pendingVitrin) {
          if (!vitrinPkg) throw new Error('Vitrin destekli paket bulunamadı.');
          await advertService.assignPackage(advertId, {
            packageCode: vitrinPkg.code,
            reason: 'Vitrin ilanı olarak tanımlandı',
          });
        } else {
          if (!standardPkg) throw new Error('Standart paket bulunamadı.');
          await advertService.assignPackage(advertId, {
            packageCode: standardPkg.code,
            reason: 'Vitrin özelliği kapatıldı',
          });
        }
        const updated = await advertService.getPackage(advertId).catch(() => null);
        setCurrentPackage(updated);
        if (updated?.packageCode) setSelectedPackageCode(updated.packageCode);
        setPendingVitrin(null);
      }

      toast.success('Değişiklikler kaydedildi.');
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPkgObj = packages.find((p) => p.code === selectedPackageCode);
  const currentPkgObj = packages.find((p) => p.code === currentPackage?.packageCode);
  const activePackageAllowsUrgent = currentPkgObj?.allowsUrgent ?? true;
  const isVitrinActive = Boolean(currentPkgObj?.showcaseEligible);

  const vitrinPkg =
    packages.find((p) => p.showcaseEligible) ||
    packages.find((p) => p.code.toLowerCase().includes('ultimate')) ||
    packages[packages.length - 1];

  const standardPkg =
    packages.find((p) => !p.showcaseEligible && p.code.toLowerCase().includes('standart')) ||
    packages.find((p) => !p.showcaseEligible) ||
    packages[0];

  // Görüntülenen (preview) state = gerçek + pending
  const displayUrgent = pendingUrgent !== null ? pendingUrgent : isUrgentActive;
  const displayVitrin = pendingVitrin !== null ? pendingVitrin : isVitrinActive;
  const hasCardChanges = pendingUrgent !== null || pendingVitrin !== null;

  const statusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRED':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      case 'SUPERSEDED':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const isSamePackage = Boolean(
    currentPackage && selectedPackageCode === currentPackage.packageCode
  );
  const hasReason = Boolean(assignReason.trim());
  const isUpdateDisabled = submitting || !selectedPackageCode.trim() || (isSamePackage && !hasReason);

  const coverMedia = detail?.media?.find((m) => m.isCover) ?? detail?.media?.[0];
  const coverUrl = coverMedia?.assetId ? buildMediaUrl(coverMedia.assetId, 'DETAIL') : null;
  const advertPrice = detail?.price?.amount
    ? formatMoney(detail.price.amount, detail.price.currency || 'TRY')
    : null;

  return (
    <Modal show onHide={onClose} size="lg" centered backdrop="static">
      {/* Header */}
      <Modal.Header closeButton className="border-bottom bg-white py-3 px-4">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center text-primary"
            style={{ width: '38px', height: '38px', backgroundColor: '#eef2ff' }}
          >
            <i className="fe fe-package fs-4" />
          </div>
          <div>
            <h5 className="modal-title mb-0 fw-bold text-dark">Paket & Öne Çıkarma Yönetimi</h5>
            <small className="text-muted">
              İlan: <span className="fw-semibold text-dark">{advert.title ?? advertId}</span> (#{advertId})
            </small>
          </div>
        </div>
      </Modal.Header>

      {/* Body */}
      <Modal.Body className="p-4 bg-light">
        {/* Navigation Tabs */}
        <div className="d-flex gap-2 mb-4 bg-white p-1 rounded-3 shadow-sm border">
          <Button
            variant={tab === 'manage' ? 'primary' : 'light'}
            size="sm"
            className="rounded-2 fw-semibold d-flex align-items-center gap-2 border-0"
            onClick={() => setTab('manage')}
          >
            <i className="fe fe-package" /> Paket Yönetimi
          </Button>
          <Button
            variant={tab === 'card' ? 'primary' : 'light'}
            size="sm"
            className="rounded-2 fw-semibold d-flex align-items-center gap-2 border-0"
            onClick={() => setTab('card')}
          >
            <i className="fe fe-credit-card" /> İlan Kartı
            {(displayVitrin || displayUrgent) && (
              <Badge
                bg={displayVitrin ? 'warning' : 'danger'}
                text={displayVitrin ? 'dark' : 'white'}
                pill
                style={{ fontSize: '10px' }}
              >
                {displayVitrin && displayUrgent ? 'Vitrin + Acil' : displayVitrin ? 'Vitrin' : 'Acil'}
              </Badge>
            )}
          </Button>
          <Button
            variant={tab === 'history' ? 'primary' : 'light'}
            size="sm"
            className="rounded-2 fw-semibold d-flex align-items-center gap-2 border-0"
            onClick={() => setTab('history')}
          >
            <i className="fe fe-clock" /> Geçmiş
            {history.length > 0 && (
              <Badge bg={tab === 'history' ? 'light' : 'secondary'} text={tab === 'history' ? 'dark' : 'white'} pill>
                {history.length}
              </Badge>
            )}
          </Button>
        </div>

        {loadingCurrent && (
          <div className="text-center py-5 bg-white rounded-3 shadow-sm">
            <Spinner animation="border" variant="primary" role="status" />
            <div className="mt-2 text-muted fw-semibold">Paket ve ilan bilgileri yükleniyor...</div>
          </div>
        )}

        {!loadingCurrent && (
          <>
            {/* TAB 1: PAKET YÖNETİMİ */}
            {tab === 'manage' && (
              <Card className="border-0 shadow-sm rounded-3 bg-white">
                <Card.Header className="bg-white border-bottom py-2 px-3">
                  <span className="small fw-bold text-dark d-flex align-items-center gap-1">
                    <i className="fe fe-grid text-primary" /> {currentPackage ? 'Paket Değiştir / Yenile' : 'Yeni Paket Ata'}
                  </span>
                </Card.Header>
                <Card.Body className="p-3">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label small fw-semibold text-muted mb-0">
                        Kullanılabilir Paketler (Seçmek için karta tıklayın)
                      </label>
                      {currentPkgObj && (
                        <span className="small text-muted">
                          Şu anki Paket: <strong className="text-primary">{currentPkgObj.displayName}</strong>
                        </span>
                      )}
                    </div>
                    <Row className="g-3">
                      {packages.map((item) => {
                        const isSelected = selectedPackageCode === item.code;
                        const isCurrent = currentPackage?.packageCode === item.code;
                        const priceFormatted = item.displayPrice?.amountMinor
                          ? formatMoney(item.displayPrice.amountMinor, item.currencyCode || 'TRY')
                          : 'Ücretsiz';

                        return (
                          <Col sm={6} key={item.code}>
                            <div
                              onClick={() => setSelectedPackageCode(item.code)}
                              className="p-3 rounded-3 h-100 position-relative"
                              style={{
                                cursor: 'pointer',
                                border: isSelected ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                                backgroundColor: isSelected ? '#f8f9ff' : '#ffffff',
                                boxShadow: isSelected
                                  ? '0 0 0 3px rgba(79, 70, 229, 0.15), 0 4px 12px rgba(79, 70, 229, 0.08)'
                                  : '0 1px 3px rgba(0, 0, 0, 0.04)',
                                transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                              }}
                            >
                              {/* Header: Title + Badges + Selection radio */}
                              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                <div>
                                  <div className="d-flex align-items-center gap-1 flex-wrap mb-1">
                                    <span className="fw-bold text-dark fs-6" style={{ letterSpacing: '-0.01em' }}>
                                      {item.displayName}
                                    </span>
                                    {item.badgeText && (
                                      <span
                                        className="badge small px-2 py-0.5 rounded-pill"
                                        style={{
                                          backgroundColor: '#fef3c7',
                                          color: '#92400e',
                                          fontWeight: 600,
                                          border: '1px solid #fde68a',
                                        }}
                                      >
                                        {item.badgeText}
                                      </span>
                                    )}
                                    {isCurrent && (
                                      <span
                                        className="badge small px-2 py-0.5 rounded-pill"
                                        style={{
                                          backgroundColor: '#dcfce7',
                                          color: '#166534',
                                          fontWeight: 600,
                                          border: '1px solid #bbf7d0',
                                        }}
                                      >
                                        Mevcut Paketiniz
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex-shrink-0">
                                  {isSelected ? (
                                    <div
                                      className="rounded-circle d-flex align-items-center justify-content-center text-white"
                                      style={{ width: '22px', height: '22px', backgroundColor: '#4f46e5' }}
                                    >
                                      <i className="fe fe-check" style={{ fontSize: '12px' }} />
                                    </div>
                                  ) : (
                                    <div
                                      className="rounded-circle border"
                                      style={{ width: '22px', height: '22px', borderColor: '#cbd5e1', backgroundColor: '#fff' }}
                                    />
                                  )}
                                </div>
                              </div>

                              {/* Price & Duration */}
                              <div className="d-flex align-items-baseline gap-1 mb-2 pb-2 border-bottom border-light">
                                <span className="fw-bold" style={{ fontSize: '1.25rem', color: isSelected ? '#4f46e5' : '#0f172a' }}>
                                  {priceFormatted}
                                </span>
                                <span className="small text-muted">
                                  / {item.defaultDurationDays ? `${item.defaultDurationDays} Gün` : 'Süresiz'}
                                </span>
                              </div>

                              {/* Feature Badges */}
                              <div className="d-flex flex-wrap gap-1">
                                {item.allowsUrgent && (
                                  <span
                                    className="badge px-2 py-1 small rounded-2"
                                    style={{
                                      backgroundColor: '#fffbeb',
                                      color: '#b45309',
                                      border: '1px solid #fef3c7',
                                      fontWeight: 500,
                                    }}
                                  >
                                    ⚡ Acil İlan Destekli
                                  </span>
                                )}
                                {item.showcaseEligible && (
                                  <span
                                    className="badge px-2 py-1 small rounded-2"
                                    style={{
                                      backgroundColor: '#eff6ff',
                                      color: '#1d4ed8',
                                      border: '1px solid #dbeafe',
                                      fontWeight: 500,
                                    }}
                                  >
                                    ⭐ Vitrin
                                  </span>
                                )}
                                {item.searchPriority > 0 && (
                                  <span
                                    className="badge px-2 py-1 small rounded-2"
                                    style={{
                                      backgroundColor: '#f8fafc',
                                      color: '#475569',
                                      border: '1px solid #e2e8f0',
                                      fontWeight: 500,
                                    }}
                                  >
                                    Öncelik: +{item.searchPriority}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold text-muted">İşlem Gerekçesi / Notu (Opsiyonel)</Form.Label>
                    <Form.Control
                      size="sm"
                      placeholder="Örn: Yönetici onayıyla paket güncellendi..."
                      value={assignReason}
                      onChange={(e) => setAssignReason(e.target.value)}
                    />
                  </Form.Group>

                  {/* Actions & Dimmed / Soluk State */}
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                    {isSamePackage && !hasReason ? (
                      <div className="small text-muted d-flex align-items-center gap-1">
                        <i className="fe fe-info text-primary opacity-75" />
                        <span>Mevcut paket seçili. Güncellemek için farklı bir paket seçin veya gerekçe yazın.</span>
                      </div>
                    ) : (
                      <div className="small text-success fw-semibold d-flex align-items-center gap-1">
                        <i className="fe fe-check-circle" />
                        <span>{currentPackage ? 'Paket değişikliği uygulanmaya hazır.' : 'Yeni paket tanımlanmaya hazır.'}</span>
                      </div>
                    )}

                    <Button
                      variant="primary"
                      disabled={isUpdateDisabled}
                      onClick={() => void handleAssign()}
                      className="d-flex align-items-center gap-2 px-4 py-2 shadow-sm rounded-2 fw-semibold ms-auto"
                      style={{
                        opacity: isUpdateDisabled ? 0.45 : 1,
                        cursor: isUpdateDisabled ? 'not-allowed' : 'pointer',
                        filter: isUpdateDisabled ? 'grayscale(35%)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {submitting ? (
                        <>
                          <Spinner size="sm" animation="border" /> İşleniyor...
                        </>
                      ) : (
                        <>
                          <i className="fe fe-check" />
                          {currentPackage ? 'Paketi Güncelle / Ata' : 'Paketi Tanımla'}
                        </>
                      )}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* TAB 2: İLAN KARTI (VİTRİN & ACİL İLAN YÖNETİMİ) */}
            {tab === 'card' && (
              <Row className="g-4">
                {/* Left Column: Live Advert Card Preview */}
                <Col lg={5} md={12}>
                  <div
                    className="bg-white rounded-3 border shadow-sm overflow-hidden"
                    style={{ position: 'sticky', top: '10px' }}
                  >
                    <div className="bg-white px-3 py-2 border-bottom d-flex align-items-center justify-content-between">
                      <span className="small fw-bold text-dark d-flex align-items-center gap-1">
                        <i className="fe fe-eye text-primary" /> İlan Kartı Önizlemesi
                      </span>
                      <span className="badge bg-light text-muted border small">Canlı Görünüm</span>
                    </div>

                    {/* Image Mockup Area */}
                    <div
                      className="position-relative d-flex align-items-center justify-content-center overflow-hidden"
                      style={{ height: '220px', backgroundColor: '#1e293b' }}
                    >
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={advert.title || 'İlan Görseli'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="text-center text-white-50 p-4">
                          <i className="fe fe-image fs-1 d-block mb-2 opacity-50" />
                          <span className="small">Görsel Bulunmuyor</span>
                        </div>
                      )}

                      {/* Top-Left Live Badges — pending değişiklikleri yansıt */}
                      <div
                        className="position-absolute top-0 start-0 m-2 d-flex flex-column gap-1 align-items-start"
                        style={{ zIndex: 2 }}
                      >
                        {displayUrgent && (
                          <span
                            className="badge px-2 py-1 text-white fw-bold shadow-sm d-flex align-items-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              fontSize: '0.72rem',
                              letterSpacing: '0.5px',
                              border: '1px solid rgba(255,255,255,0.4)',
                              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
                              opacity: pendingUrgent !== null ? 0.7 : 1,
                            }}
                          >
                            <i className="fe fe-zap" /> ACİL İLAN
                            {pendingUrgent !== null && <span style={{fontSize:'9px'}}> (kaydedilmedi)</span>}
                          </span>
                        )}
                        {displayVitrin && (
                          <span
                            className="badge px-2 py-1 text-dark fw-bold shadow-sm d-flex align-items-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                              fontSize: '0.72rem',
                              letterSpacing: '0.5px',
                              border: '1px solid rgba(255,255,255,0.5)',
                              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
                              opacity: pendingVitrin !== null ? 0.7 : 1,
                            }}
                          >
                            <i className="fe fe-star" /> VİTRİN
                            {pendingVitrin !== null && <span style={{fontSize:'9px'}}> (kaydedilmedi)</span>}
                          </span>
                        )}
                        {!displayUrgent && !displayVitrin && (
                          <span
                            className="badge bg-dark bg-opacity-75 text-white px-2 py-1 small rounded-1"
                            style={{ fontSize: '0.7rem' }}
                          >
                            Standart Rozetsiz
                          </span>
                        )}
                      </div>

                      {/* Top-Right Favorite Heart */}
                      <div
                        className="position-absolute top-0 end-0 m-2 rounded-circle bg-dark bg-opacity-50 text-white d-flex align-items-center justify-content-center shadow-sm"
                        style={{ width: '32px', height: '32px', backdropFilter: 'blur(4px)' }}
                      >
                        <i className="fe fe-heart" style={{ fontSize: '15px' }} />
                      </div>

                      {/* Bottom-Left Package Tag */}
                      <div className="position-absolute bottom-0 start-0 m-2" style={{ zIndex: 2 }}>
                        <span
                          className="badge bg-white text-dark shadow-sm border px-2 py-1 small fw-semibold"
                          style={{ fontSize: '0.72rem' }}
                        >
                          <i className="fe fe-package text-primary me-1" />
                          {currentPkgObj?.displayName ?? currentPackage?.packageCode ?? 'Paketsiz'}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3">
                      <h6 className="fw-bold text-dark text-truncate mb-1" title={advert.title || ''}>
                        {detail?.title || advert.title || 'İlan Başlığı'}
                      </h6>
                      <div className="small text-muted d-flex align-items-center gap-1 mb-2">
                        <i className="fe fe-map-pin" style={{ fontSize: '12px' }} />
                        <span>Türkiye</span>
                        <span className="mx-1">•</span>
                        <span>#{advertId}</span>
                      </div>
                      <div className="d-flex align-items-baseline justify-content-between pt-2 border-top">
                        <span className="fw-bold text-primary fs-5">
                          {advertPrice || 'Fiyat Belirtilmemiş'}
                        </span>
                        <span className="badge bg-light text-secondary border small">Yayında</span>
                      </div>
                      <small className="text-muted d-block mt-2" style={{ fontSize: '0.74rem' }}>
                        * Ziyaretçiler aramalarda ve listelerde kartı bu şekilde görür.
                      </small>
                    </div>
                  </div>
                </Col>

                {/* Right Column: Vitrin & Acil Controls */}
                <Col lg={7} md={12}>
                  {/* Vitrin İlanı Card */}
                  <Card className="border-0 shadow-sm rounded-3 bg-white mb-4 overflow-hidden">
                    <Card.Header className="bg-white border-bottom py-2.5 px-3 d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-dark d-flex align-items-center gap-2">
                        <i className="fe fe-star text-warning fs-5" /> Vitrin İlanı (Anasayfa Vitrini)
                      </span>
                      <Badge
                        bg={displayVitrin ? 'warning' : 'secondary'}
                        text={displayVitrin ? 'dark' : 'white'}
                        className="px-2 py-1"
                        style={{ opacity: pendingVitrin !== null ? 0.65 : 1 }}
                      >
                        {displayVitrin ? 'Vitrinde Aktif' : 'Pasif'}
                        {pendingVitrin !== null && ' *'}
                      </Badge>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <p className="text-muted small mb-3">
                        Vitrin özelliği, ilanın Haradan anasayfasının en üstündeki şık <strong>Vitrin Bandı</strong>nda ve öne çıkan vitrin kartı görünümünde sergilenmesini sağlar.
                      </p>

                      {displayVitrin && (
                        <Alert variant="success" className="py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                          <i className="fe fe-check-circle fs-4" />
                          <div>
                            <strong>Vitrin Aktif:</strong> Bu ilan anasayfa vitrininde sergilenmektedir.
                            {currentPkgObj && <span className="ms-1">({currentPkgObj.displayName} paketi)</span>}
                          </div>
                        </Alert>
                      )}

                      <div className="d-flex gap-2 flex-wrap">
                        {!displayVitrin ? (
                          <Button
                            variant={pendingVitrin === true ? 'success' : 'outline-success'}
                            className="d-flex align-items-center gap-2 fw-semibold px-3 py-2"
                            disabled={submitting}
                            onClick={() => handleToggleVitrinPending(true)}
                          >
                            <i className="fe fe-star" /> Vitrin İlanı Yap
                            {vitrinPkg && <span className="opacity-75 fw-normal">({vitrinPkg.displayName})</span>}
                          </Button>
                        ) : (
                          <Button
                            variant={pendingVitrin === false ? 'secondary' : 'outline-secondary'}
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            disabled={submitting}
                            onClick={() => handleToggleVitrinPending(false)}
                          >
                            <i className="fe fe-x" /> Vitrini Kapat
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>

                  {/* Acil İlan Card */}
                  <Card className="border-0 shadow-sm rounded-3 bg-white overflow-hidden">
                    <Card.Header className="bg-white border-bottom py-2.5 px-3 d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-dark d-flex align-items-center gap-2">
                        <i className="fe fe-zap text-danger fs-5" /> Acil İlan Rozeti
                      </span>
                      <Badge
                        bg={displayUrgent ? 'danger' : 'secondary'}
                        className="px-2 py-1"
                        style={{ opacity: pendingUrgent !== null ? 0.65 : 1 }}
                      >
                        {displayUrgent ? 'Aktif' : 'Pasif'}
                        {pendingUrgent !== null && ' *'}
                      </Badge>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <p className="text-muted small mb-3">
                        Acil İlan özelliği, ilanın listelerde ve aramalarda dikkat çekici kırmızı <strong>&quot;ACİL&quot;</strong> rozetiyle öne çıkmasını ve ziyaretçilerin hızlıca dikkatini çekmesini sağlar.
                      </p>

                      {displayUrgent && (
                        <Alert variant="danger" className="small py-2 px-3 mb-3 d-flex align-items-center gap-2">
                          <i className="fe fe-zap fs-5" />
                          <div>
                            <strong>Acil İlan Rozeti Aktif:</strong> Bu ilan listelerde kırmızı ACİL rozetiyle öne çıkmaktadır.
                          </div>
                        </Alert>
                      )}

                      <div className="d-flex gap-2 flex-wrap">
                        {!displayUrgent ? (
                          <Button
                            variant={pendingUrgent === true ? 'warning' : 'outline-warning'}
                            className="d-flex align-items-center gap-2 fw-semibold px-3 py-2"
                            disabled={submitting}
                            onClick={() => handleToggleUrgentPending(true)}
                          >
                            <i className="fe fe-zap" /> Acil İlanı Aktifleştir
                          </Button>
                        ) : (
                          <Button
                            variant={pendingUrgent === false ? 'secondary' : 'outline-secondary'}
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            disabled={submitting}
                            onClick={() => handleToggleUrgentPending(false)}
                          >
                            <i className="fe fe-x" /> Acil İlanı Kapat
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* TAB 3: GEÇMİŞ */}
            {tab === 'history' && (
              <Card className="border-0 shadow-sm rounded-3 bg-white">
                <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold text-dark">Paket Atama & Değişiklik Geçmişi</h6>
                  <Badge bg="secondary" pill>
                    {history.length} Kayıt
                  </Badge>
                </Card.Header>
                <Card.Body className="p-0">
                  {historyLoading && (
                    <div className="text-center py-4">
                      <Spinner animation="border" size="sm" variant="primary" />
                      <div className="small text-muted mt-1">Geçmiş yükleniyor...</div>
                    </div>
                  )}

                  {!historyLoading && history.length === 0 && (
                    <div className="text-center py-4 text-muted">Paket geçmişi kaydı bulunamadı.</div>
                  )}

                  {!historyLoading && history.length > 0 && (
                    <div className="table-responsive">
                      <Table hover className="align-middle mb-0 small">
                        <thead className="table-light">
                          <tr>
                            <th>Paket</th>
                            <th>Durum</th>
                            <th>Başlangıç</th>
                            <th>Bitiş</th>
                            <th>Kaynak</th>
                            <th>Gerekçe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <span className="fw-bold text-dark">{item.packageCode}</span>
                              </td>
                              <td>
                                <Badge bg={statusVariant(item.status)}>
                                  {getPackageAssignmentStatusText(item.status)}
                                </Badge>
                              </td>
                              <td>{formatDateTimeForText(item.startsAt)}</td>
                              <td>{item.endsAt ? formatDateTimeForText(item.endsAt) : 'Süresiz'}</td>
                              <td>
                                <Badge bg="light" text="dark" className="border">
                                  {getPackageAssignmentSourceText(item.source)}
                                </Badge>
                              </td>
                              <td className="text-muted">{item.reason ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
          </>
        )}
      </Modal.Body>

      {/* Footer */}
      <Modal.Footer className="bg-white border-top px-4 py-3 d-flex justify-content-between align-items-center">
        <Button variant="secondary" size="sm" className="px-4" onClick={onClose}>
          Kapat
        </Button>

        {/* İlan Kartı sekmesinde kaydet butonu */}
        {tab === 'card' && (
          <div className="d-flex align-items-center gap-3">
            {hasCardChanges && (
              <span className="small text-warning fw-semibold d-flex align-items-center gap-1">
                <i className="fe fe-alert-circle" /> Kaydedilmemiş değişiklikler var
              </span>
            )}
            <Button
              variant={hasCardChanges ? 'primary' : 'secondary'}
              size="sm"
              className="px-4 d-flex align-items-center gap-2 fw-semibold"
              disabled={!hasCardChanges || submitting}
              onClick={() => void handleCardSave()}
              style={{
                opacity: hasCardChanges ? 1 : 0.35,
                cursor: hasCardChanges ? 'pointer' : 'not-allowed',
                transition: 'all 0.25s ease',
                boxShadow: hasCardChanges ? '0 2px 8px rgba(79, 70, 229, 0.3)' : 'none',
              }}
            >
              {submitting ? (
                <><Spinner size="sm" animation="border" /> Kaydediliyor...</>
              ) : (
                <><i className="fe fe-save" /> Değişiklikleri Kaydet</>
              )}
            </Button>
          </div>
        )}
      </Modal.Footer>
    </Modal>
  );
}
