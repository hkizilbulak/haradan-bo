"use client"
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Badge, Row, Col, Card, Table, Spinner, Alert } from 'react-bootstrap';
import StatusBadge from '@/components/StatusBadge';
import { buildMediaUrl, buildAdvertDetailUrl } from '@/contants/urls';
import { formatDateForText, formatDateTimeForText } from '@/helpers/DateUtils';
import { formatMoney, getErrorMessage } from '@/helpers/HelperUtils';
import { looksLikeHtml, sanitizeRichHtml } from '@/helpers/sanitizeHtml';
import { canModerationAction } from '@/helpers/moderationActions';
import { useResolvedLocation } from '@/helpers/location';
import { ModerationAdvertResponse } from '@/models';
import { advertService, ModerationAdvertDetail, DEFAULT_MOCK_MEDIA } from '@/services/advert.service';
import { buildModerationAdvertSpecRows, resolveDisplayAdvertNo, SpecRow } from '@/helpers/advertCategoryHelper';

interface AdvertDetailModalProps {
  advert: ModerationAdvertResponse | null;
  onClose: () => void;
  categoryName?: string;
  onApprove?: (advert: ModerationAdvertResponse) => void;
  onReject?: (advert: ModerationAdvertResponse) => void;
  onSuspend?: (advert: ModerationAdvertResponse) => void;
}

export default function AdvertDetailModal({
  advert,
  onClose,
  categoryName,
  onApprove,
  onReject,
  onSuspend,
}: AdvertDetailModalProps) {
  const advertId = advert?.identifier ?? advert?.id;
  const [detail, setDetail] = useState<ModerationAdvertDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!advertId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await advertService.getDetail(advertId);
      setDetail(res);
      if (res.media && res.media.length > 0) {
        const coverIdx = res.media.findIndex((m) => m.isCover);
        setActiveMediaIndex(coverIdx >= 0 ? coverIdx : 0);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (advert) {
      setActiveMediaIndex(0);
      setLightboxIndex(null);
      void fetchDetail();
    } else {
      setDetail(null);
      setError(null);
    }
  }, [advertId]);

  const currentStatus = detail?.status ?? advert?.status ?? 'PENDING_REVIEW';
  const isRejected = currentStatus === 'REJECTED';
  const isSuspended = currentStatus === 'SUSPENDED';
  const isPublished = currentStatus === 'PUBLISHED' || advert?.status === 'PUBLISHED';
  const canApprove = advert ? (canModerationAction(currentStatus, 'approve') || isSuspended) : false;
  const canReject = advert ? canModerationAction(currentStatus, 'reject') : false;
  const canSuspend = advert ? canModerationAction(currentStatus, 'suspend') : false;

  const suspensionInfo = useMemo(() => {
    if (!isSuspended && !(detail as any)?.suspensionReason && !(advert as any)?.suspensionReason) {
      return null;
    }

    let reason: string | null = (detail as any)?.suspensionReason || (advert as any)?.suspensionReason || (detail as any)?.reason || null;
    let createdAt: string | null = null;

    if (detail?.statusHistory && detail.statusHistory.length > 0) {
      const historyReversed = [...detail.statusHistory].reverse();
      const suspendedEntry = historyReversed.find(
        (h) => h.toStatus?.toUpperCase() === 'SUSPENDED'
      );
      if (suspendedEntry) {
        if (!reason && suspendedEntry.reason) {
          reason = suspendedEntry.reason;
        }
        if (suspendedEntry.createdAt) {
          createdAt = suspendedEntry.createdAt;
        }
      }
    }

    if (!reason && !isSuspended) {
      return null;
    }

    return {
      reason: reason?.trim() || 'Yayından kaldırılma gerekçesi belirtilmemiş.',
      createdAt: createdAt ? formatDateTimeForText(createdAt) : null,
    };
  }, [detail, advert, isSuspended]);

  const rejectionInfo = useMemo(() => {
    if (!isRejected && !detail?.rejectionReason && !advert?.rejectionReason) {
      return null;
    }

    let reason: string | null = detail?.rejectionReason || advert?.rejectionReason || null;
    let createdAt: string | null = null;

    if (detail?.statusHistory && detail.statusHistory.length > 0) {
      const historyReversed = [...detail.statusHistory].reverse();
      const rejectedEntry = historyReversed.find(
        (h) => h.toStatus?.toUpperCase() === 'REJECTED'
      );
      if (rejectedEntry) {
        if (!reason && rejectedEntry.reason) {
          reason = rejectedEntry.reason;
        }
        if (rejectedEntry.createdAt) {
          createdAt = rejectedEntry.createdAt;
        }
      }
    }

    if (!reason && !isRejected) {
      return null;
    }

    return {
      reason: reason?.trim() || 'Reddedilme gerekçesi belirtilmemiş.',
      createdAt: createdAt ? formatDateTimeForText(createdAt) : null,
    };
  }, [detail, advert, isRejected]);

  const mediaList = useMemo(() => {
    // 1. Direct detail.media
    if (detail?.media && Array.isArray(detail.media) && detail.media.length > 0) {
      return detail.media;
    }
    // 2. advert.media
    if ((advert as any)?.media && Array.isArray((advert as any).media) && (advert as any).media.length > 0) {
      return (advert as any).media;
    }
    // 3. detail.cover or advert.cover
    const coverObj = (detail as any)?.cover || (advert as any)?.cover;
    if (coverObj) {
      const coverUrl = coverObj.publicUrl || coverObj.url || coverObj.assetId;
      if (coverUrl && typeof coverUrl === 'string' && coverUrl.trim()) {
        return [{ assetId: coverUrl.trim(), displayOrder: 0, isCover: true }];
      }
    }
    // 4. properties.images or properties.imageUrl or properties.coverUrl
    const props = ((detail?.properties || (advert as any)?.properties) || {}) as Record<string, any>;
    if (Array.isArray(props.images) && props.images.length > 0) {
      return props.images.map((img: any, idx: number) => ({
        assetId: typeof img === 'string' ? img : (img.url || img.publicUrl || img.assetId),
        displayOrder: idx,
        isCover: idx === 0,
      }));
    }
    const propImg = props.imageUrl || props.coverUrl || props.image || (advert as any)?.imageUrl;
    if (propImg && typeof propImg === 'string' && propImg.trim()) {
      return [{ assetId: propImg.trim(), displayOrder: 0, isCover: true }];
    }
    // 5. Default mock photos for known demo adverts
    const targetId = String(advert?.id || advertId || '').trim();
    if (targetId && DEFAULT_MOCK_MEDIA[targetId]) {
      return DEFAULT_MOCK_MEDIA[targetId];
    }
    return [];
  }, [detail, advert, advertId]);

  const resolveMediaSrc = (m: any): string => {
    if (!m) return '';
    if (typeof m === 'string') return buildMediaUrl(m, 'DETAIL');
    const url = m.publicUrl || m.url || m.imageUrl || m.src;
    if (url && typeof url === 'string' && url.trim()) {
      return buildMediaUrl(url, 'DETAIL');
    }
    if (m.assetId && typeof m.assetId === 'string' && m.assetId.trim()) {
      return buildMediaUrl(m.assetId, 'DETAIL');
    }
    return '';
  };

  const properties = useMemo(() => {
    return {
      ...((advert as any)?.properties || {}),
      ...((detail as any)?.properties || {}),
    } as Record<string, any>;
  }, [detail, advert]);

  const normText = (s: string) =>
    (s || '')
      .toLowerCase()
      .replace(/['’`"]/g, '')
      .replace(/[-_\s\(\)]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');

  // Helper to extract property by varying case/names
  const getProp = (keys: string[]): string => {
    const normKeys = keys.map(normText);
    for (const [pk, pv] of Object.entries(properties)) {
      if (pv == null || pv === '') continue;
      const pkNorm = normText(pk);
      if (normKeys.some((k) => k === pkNorm)) {
        return String(pv).trim();
      }
    }
    for (const [pk, pv] of Object.entries(properties)) {
      if (pv == null || pv === '') continue;
      const pkNorm = normText(pk);
      if (normKeys.some((k) => pkNorm.includes(k) || k.includes(pkNorm))) {
        return String(pv).trim();
      }
    }
    return '';
  };

  const resolvedCategory = categoryName || detail?.categoryId || advert?.categoryId || 'Kategori Belirtilmemiş';

  const priceFormatted = useMemo(() => {
    const priceObj = detail?.price || (advert as any)?.price;
    const currency = priceObj?.currency || 'TRY';

    if (priceObj != null) {
      if (typeof priceObj === 'number') {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(priceObj);
      }
      if (priceObj.amountMinor != null && !isNaN(Number(priceObj.amountMinor))) {
        return formatMoney(Number(priceObj.amountMinor), currency);
      }
      if (priceObj.amount != null && !isNaN(Number(priceObj.amount))) {
        const amt = Number(priceObj.amount);
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amt);
      }
    }

    // Check properties from detail or advert
    const propPrice = getProp([
      'fiyat',
      'price',
      'ucret',
      'bedel',
      'fiyatminor',
      'amountminor',
      'amount',
      'satisfiyati',
      'ucreti',
    ]);

    if (propPrice) {
      if (propPrice.includes('₺') || /tl/i.test(propPrice)) {
        return propPrice;
      }
      const numOnly = propPrice.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
      const parsedNum = parseFloat(numOnly);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(parsedNum);
      }
      return `${propPrice} TL`;
    }

    return 'Fiyat Belirtilmemiş';
  }, [detail, advert, properties]);

  const resolvedLocation = useResolvedLocation(detail, advert);

  // Seller & Contact info for bottom section
  const ownerName =
    (detail as any)?.ownerName ||
    (advert as any)?.ownerName ||
    getProp(['owner', 'sahip', 'ownerName', 'sellerName']) ||
    '-';
  const phone =
    (detail as any)?.sellerPhone ||
    (advert as any)?.sellerPhone ||
    (detail as any)?.phone ||
    (advert as any)?.phone ||
    (detail as any)?.userPhone ||
    (advert as any)?.userPhone ||
    (detail as any)?.contactPhone ||
    getProp(['sellerPhone', 'phone', 'telefon', 'iletisimTelefonu', 'saticiTelefonu', 'cepTelefonu', 'contactPhone']) ||
    '';

  const cleanWhatsAppPhone = (raw: string) => {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0090')) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length === 11) {
      digits = '90' + digits.slice(1);
    } else if (digits.length === 10 && digits.startsWith('5')) {
      digits = '90' + digits;
    }
    return digits;
  };

  const displayAdvertNo = useMemo(() => {
    const rawAdvertId = advert?.identifier ?? advert?.id ?? detail?.id;
    const props = (detail?.properties || advert?.properties || {}) as Record<string, any>;
    return resolveDisplayAdvertNo(rawAdvertId, props);
  }, [advert, detail]);

  const openWhatsAppChat = (phoneNumber?: string | null) => {
    const rawTarget = phoneNumber || phone;
    let target = rawTarget ? cleanWhatsAppPhone(rawTarget) : '';
    if (!target) {
      const entered = window.prompt(
        'İlan sahibinin sistemde kayıtlı telefon numarası bulunamadı.\nLütfen mesaj göndermek istediğiniz WhatsApp numarasını giriniz (örn: 0532xxxxxxx):'
      );
      if (!entered || !entered.trim()) return;
      target = cleanWhatsAppPhone(entered.trim());
      if (!target) {
        alert('Lütfen geçerli bir telefon numarası giriniz.');
        return;
      }
    }
    const advertTitle = detail?.title || advert?.title || 'İlanınız';
    const advertNo = displayAdvertNo || advert?.id || advertId || '';
    const text = encodeURIComponent(
      `Merhaba, Haradan.com'daki ${advertNo ? `#${advertNo} numaralı ` : ''}"${advertTitle}" başlıklı ilanınız ile ilgili yazıyorum.`
    );
    window.open(`https://wa.me/${target}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  // Build BuyBox specifications list specific to each category (matches live advert layout)
  const specRows = useMemo(() => {
    return buildModerationAdvertSpecRows(detail, advert, categoryName);
  }, [detail, advert, categoryName]);

  const copyToClipboard = (text: string, keyName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const activeMedia = mediaList[activeMediaIndex] ?? mediaList[0];
  const activeMediaUrl = activeMedia ? resolveMediaSrc(activeMedia) : null;

  if (!advert) return null;

  return (
    <>
      <Modal
        show={Boolean(advert)}
        onHide={onClose}
        size="xl"
        centered
        scrollable
        backdrop="static"
      >
        {/* Top Navbar / Header */}
        <Modal.Header closeButton className="border-bottom bg-white py-3 px-4">
          <div className="d-flex align-items-center justify-content-between w-100 pe-3 flex-wrap gap-2">
            <div>
              {/* Breadcrumbs style */}
              <div className="text-muted small mb-1 d-flex align-items-center gap-1">
                <span>Ana Sayfa</span>
                <span>›</span>
                <span>{resolvedCategory}</span>
                <span>›</span>
                <span className="text-dark fw-semibold">{detail?.title || advert.title}</span>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h4 className="modal-title mb-0 fw-bold text-dark">
                  {detail?.title || advert.title || 'İlan'}
                </h4>
                <StatusBadge status={currentStatus} />
                <button
                  type="button"
                  onClick={() => copyToClipboard(displayAdvertNo, 'headerAdvertNo')}
                  className="badge bg-light text-dark border fw-normal text-decoration-none d-inline-flex align-items-center gap-1 cursor-pointer py-1 px-2"
                  style={{ cursor: 'pointer', border: '1px solid #dee2e6' }}
                  title="İlan No Kopyala"
                >
                  <span>#{displayAdvertNo}</span>
                  <i className={`fe ${copiedKey === 'headerAdvertNo' ? 'fe-check text-success' : 'fe-copy'} ms-1`} style={{ fontSize: '11px' }} />
                  {copiedKey === 'headerAdvertNo' && <span className="small text-success ms-1">Kopyalandı</span>}
                </button>
              </div>
            </div>
          </div>
        </Modal.Header>

        {/* Modal Body with Haradan Advert Page Layout */}
        <Modal.Body className="p-3 p-md-4" style={{ backgroundColor: '#f8fafc' }}>
          {loading && (
            <div className="text-center py-5 bg-white rounded-3 shadow-sm my-3">
              <Spinner animation="border" variant="primary" role="status" />
              <div className="mt-3 text-muted fw-semibold">İlan sayfası hazırlanıyor...</div>
            </div>
          )}

          {!loading && error && (
            <Alert variant="danger" className="d-flex align-items-center justify-content-between shadow-sm">
              <div>
                <i className="fe fe-alert-circle me-2 fs-5 align-middle" />
                {error}
              </div>
              <Button size="sm" variant="outline-danger" onClick={() => void fetchDetail()}>
                <i className="fe fe-refresh-cw me-1" /> Tekrar Dene
              </Button>
            </Alert>
          )}

          {!loading && !error && (
            <Row className="g-4">
                  {/* SOL KOLON: GALERİ VİTRİNİ & AÇIKLAMA */}
                  <Col lg={7}>
                    {/* Main Gallery Showcase */}
                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4 bg-white">
                      <div className="position-relative bg-dark" style={{ minHeight: '380px' }}>
                        {activeMediaUrl ? (
                          <>
                            <div
                              className="d-flex align-items-center justify-content-center w-100"
                              style={{ height: '380px', cursor: 'pointer' }}
                              onClick={() => setLightboxIndex(activeMediaIndex)}
                              title="Büyütmek için tıklayın"
                            >
                              <img
                                src={activeMediaUrl}
                                alt={detail?.title || advert?.title || 'İlan Görseli'}
                                className="w-100 h-100 object-fit-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (!target.src.includes('placeholder-img.jpg')) {
                                    target.src = '/images/placeholder/placeholder-img.jpg';
                                  }
                                }}
                              />
                            </div>

                            {/* Badges on image */}
                            <div className="position-absolute top-0 start-0 m-3 d-flex gap-2">
                              {activeMedia?.isCover && (
                                <Badge bg="warning" text="dark" className="shadow-sm py-2 px-3 fw-bold">
                                  ★ Kapak Fotoğrafı
                                </Badge>
                              )}
                            </div>

                            <div className="position-absolute bottom-0 end-0 m-3 px-3 py-1 bg-dark bg-opacity-75 text-white rounded-pill small fw-semibold shadow">
                              <i className="fe fe-camera me-1" /> {activeMediaIndex + 1} / {mediaList.length}
                            </div>

                            {/* Arrow buttons */}
                            {mediaList.length > 1 && (
                              <>
                                <Button
                                  variant="dark"
                                  size="sm"
                                  className="position-absolute top-50 start-0 translate-middle-y ms-2 rounded-circle bg-opacity-75 border-0 shadow"
                                  style={{ width: '40px', height: '40px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
                                  }}
                                >
                                  <i className="fe fe-chevron-left" />
                                </Button>
                                <Button
                                  variant="dark"
                                  size="sm"
                                  className="position-absolute top-50 end-0 translate-middle-y me-2 rounded-circle bg-opacity-75 border-0 shadow"
                                  style={{ width: '40px', height: '40px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMediaIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
                                  }}
                                >
                                  <i className="fe fe-chevron-right" />
                                </Button>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="d-flex flex-column align-items-center justify-content-center py-5 text-white-50" style={{ height: '380px' }}>
                            <i className="fe fe-camera fs-1 mb-2 opacity-50" />
                            <span className="fw-semibold">Bu ilan için henüz fotoğraf yüklenmemiş.</span>
                          </div>
                        )}
                      </div>

                      {/* Thumbnail Bar */}
                      {mediaList.length > 1 && (
                        <div className="p-3 bg-white border-top d-flex gap-2 overflow-auto">
                          {mediaList.map((m: any, idx: number) => {
                            const isCurrent = idx === activeMediaIndex;
                            return (
                              <div
                                key={m.assetId || m.publicUrl || idx}
                                onClick={() => setActiveMediaIndex(idx)}
                                className={`rounded-3 overflow-hidden flex-shrink-0 border ${
                                  isCurrent ? 'border-primary border-3 shadow-sm' : 'border-light'
                                }`}
                                style={{ width: '74px', height: '56px', cursor: 'pointer' }}
                              >
                                <img
                                  src={resolveMediaSrc(m)}
                                  alt={`Küçük Resim ${idx + 1}`}
                                  className="w-100 h-100 object-fit-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.src.includes('placeholder-img.jpg')) {
                                      target.src = '/images/placeholder/placeholder-img.jpg';
                                    }
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>

                    {/* İlan Açıklaması Card */}
                    <Card className="border-0 shadow-sm rounded-4 bg-white p-4">
                      <h5 className="fw-bold text-dark mb-3 pb-2 border-bottom d-flex align-items-center gap-2">
                        <i className="fe fe-file-text text-primary" /> İlan Açıklaması
                      </h5>
                      {detail?.description?.trim() ? (
                        looksLikeHtml(detail.description) ? (
                          <div
                            className="text-dark text-break"
                            style={{ lineHeight: '1.7', fontSize: '15px' }}
                            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(detail.description) }}
                          />
                        ) : (
                          <div
                            className="text-dark text-break"
                            style={{ whiteSpace: 'pre-line', lineHeight: '1.7', fontSize: '15px' }}
                          >
                            {detail.description}
                          </div>
                        )
                      ) : (
                        <div className="text-muted fst-italic py-3">Bu ilan için açıklama belirtilmemiş.</div>
                      )}
                    </Card>

                    {/* Red Nedeni Card (Reddedilen İlanlar İçin) */}
                    {isRejected && (
                      <Card className="border-0 shadow-sm rounded-4 bg-white p-4 mt-4 border-start border-danger border-4">
                        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                          <h5 className="fw-bold text-danger mb-0 d-flex align-items-center gap-2">
                            <i className="fe fe-alert-octagon text-danger" /> Red Nedeni
                          </h5>
                          {rejectionInfo?.createdAt && (
                            <span className="text-muted small">
                              <i className="fe fe-clock me-1" />
                              {rejectionInfo.createdAt}
                            </span>
                          )}
                        </div>
                        <div
                          className="p-3 rounded-3 bg-danger-subtle text-danger-emphasis border border-danger-subtle"
                          style={{ whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '14.5px' }}
                        >
                          {rejectionInfo?.reason || 'Reddedilme gerekçesi belirtilmemiş.'}
                        </div>
                      </Card>
                    )}

                    {/* Yayından Kaldırılma Nedeni Card (Yayından Kaldırılan İlanlar İçin) */}
                    {isSuspended && (
                      <Card className="border-0 shadow-sm rounded-4 bg-white p-4 mt-4 border-start border-secondary border-4">
                        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                          <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                            <i className="fe fe-pause-circle text-secondary" /> Yayından Kaldırılma Nedeni
                          </h5>
                          {suspensionInfo?.createdAt && (
                            <span className="text-muted small">
                              <i className="fe fe-clock me-1" />
                              {suspensionInfo.createdAt}
                            </span>
                          )}
                        </div>
                        <div
                          className="p-3 rounded-3 bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle"
                          style={{ whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '14.5px' }}
                        >
                          {suspensionInfo?.reason || 'Yayından kaldırılma gerekçesi belirtilmemiş.'}
                        </div>
                      </Card>
                    )}
                  </Col>

                  {/* SAĞ KOLON: HARADAN BUYBOX (FİYAT, BİLGİ TABLOSU, İLETİŞİM) */}
                  <Col lg={5}>
                    <Card className="border-0 shadow-sm rounded-4 bg-white overflow-hidden mb-4 sticky-top" style={{ top: '15px' }}>
                      {/* BuyBox Header: Location & Price */}
                      <div className="p-4 border-bottom bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2 text-secondary">
                          <i className="fe fe-map-pin text-primary fs-5" />
                          <span className="fw-semibold text-dark">
                            {resolvedLocation}
                          </span>
                        </div>
                        <div className="fs-3 fw-bold text-dark">
                          {priceFormatted}
                        </div>
                      </div>

                      {/* Spec Table (The signature Haradan key-value list) */}
                      <div className="p-2">
                        <Table hover className="align-middle mb-0" style={{ fontSize: '13.5px' }}>
                          <tbody>
                            {specRows.map((row, idx) => (
                              <tr key={idx} className="border-bottom">
                                <td className="text-muted fw-semibold py-2 px-3" style={{ width: '42%', border: 0 }}>
                                  {row.label}
                                </td>
                                <td className="text-end fw-bold text-dark py-2 px-3 text-break" style={{ border: 0 }}>
                                  {row.label === 'İlan No' ? (
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(row.value, 'advertNo')}
                                      className="btn btn-sm text-decoration-none d-inline-flex align-items-center gap-1 fw-bold shadow-none"
                                      style={{
                                        backgroundColor: copiedKey === 'advertNo' ? '#ecfdf5' : '#f0f9ff',
                                        color: copiedKey === 'advertNo' ? '#16a34a' : '#0284c7',
                                        border: `1px solid ${copiedKey === 'advertNo' ? '#86efac' : '#bae6fd'}`,
                                        borderRadius: '6px',
                                        padding: '2px 8px',
                                        fontSize: '12.5px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease-in-out',
                                      }}
                                      title={copiedKey === 'advertNo' ? 'Kopyalandı!' : 'İlan No Kopyala'}
                                    >
                                      <span>{row.value}</span>
                                      <i
                                        className={`fe ${copiedKey === 'advertNo' ? 'fe-check text-success' : 'fe-copy'}`}
                                        style={{ fontSize: '12px', color: copiedKey === 'advertNo' ? '#16a34a' : '#0284c7' }}
                                      />
                                    </button>
                                  ) : row.href ? (
                                    <a
                                      href={row.href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-decoration-none d-inline-flex align-items-center gap-1 fw-bold"
                                      style={{
                                        backgroundColor: '#f0f9ff',
                                        color: '#0284c7',
                                        border: '1px solid #bae6fd',
                                        borderRadius: '6px',
                                        padding: '2px 8px',
                                        fontSize: '12.5px',
                                      }}
                                    >
                                      <span>{row.value}</span>
                                      <i className="fe fe-external-link" style={{ fontSize: '11px', color: '#0284c7' }} />
                                    </a>
                                  ) : row.isBoolean && (row.value === 'Evet' || row.value === 'Hayır') ? (
                                    <span
                                      className={`badge rounded-pill ${
                                        row.value === 'Evet'
                                          ? 'bg-success-subtle text-success border border-success-subtle'
                                          : 'bg-danger-subtle text-danger border border-danger-subtle'
                                      } px-2 py-1 fw-semibold`}
                                      style={{ fontSize: '12px' }}
                                    >
                                      <i className={`fe ${row.value === 'Evet' ? 'fe-check' : 'fe-x'} me-1`} />
                                      {row.value}
                                    </span>
                                  ) : (
                                    row.value
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>

                      {/* Seller & Contact Block */}
                      <div className="p-4 bg-light border-top">
                        <div className="mb-3">
                          <div className="small text-muted fw-semibold">İLAN SAHİBİ</div>
                          <div className="fw-bold text-dark fs-6">
                            {ownerName && ownerName !== '-' ? ownerName : 'Kullanıcı'}
                          </div>
                        </div>

                        {phone ? (
                          <div className="d-flex flex-column gap-2">
                            <a
                              href={`tel:${phone}`}
                              className="btn btn-dark w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-3"
                            >
                              <i className="fe fe-phone fs-5" /> {phone}
                            </a>
                            <button
                              type="button"
                              onClick={() => openWhatsAppChat(phone)}
                              className="btn text-white w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-3 border-0"
                              style={{ backgroundColor: '#25D366' }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                              </svg>
                              <span>WhatsApp ile Mesaj Gönder</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-center py-2 text-muted small">
                            <div className="fst-italic mb-2">İletişim numarası belirtilmemiş.</div>
                            <Button
                              size="sm"
                              variant="outline-success"
                              className="w-100 d-flex align-items-center justify-content-center gap-2 fw-semibold"
                              onClick={() => openWhatsAppChat()}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                              </svg>
                              <span>WhatsApp ile Mesaj Gönder</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>
          )}
        </Modal.Body>

        {/* Modal Footer with Moderator Action Buttons */}
        <Modal.Footer className="d-flex justify-content-between align-items-center bg-white border-top px-4 py-3">
          <div className="d-flex gap-2 flex-wrap align-items-center">
            {canApprove && onApprove && (
              <Button
                size="sm"
                variant="success"
                className="d-flex align-items-center gap-1 shadow-sm px-3 fw-semibold"
                onClick={() => {
                  onClose();
                  onApprove(advert);
                }}
              >
                <i className="fe fe-check" /> {isSuspended ? 'Yayınla' : 'İlanı Onayla'}
              </Button>
            )}
            {canReject && onReject && (
              <Button
                size="sm"
                variant="danger"
                className="d-flex align-items-center gap-1 shadow-sm px-3 fw-semibold"
                onClick={() => {
                  onClose();
                  onReject(advert);
                }}
              >
                <i className="fe fe-x" /> İlanı Reddet
              </Button>
            )}
            {canSuspend && onSuspend && (
              <Button
                size="sm"
                variant="secondary"
                className="d-flex align-items-center gap-1 shadow-sm px-3 fw-semibold text-white"
                onClick={() => {
                  onClose();
                  onSuspend(advert);
                }}
              >
                <i className="fe fe-slash" /> Yayından Kaldır
              </Button>
            )}
          </div>
          <div className="d-flex gap-2 align-items-center">
            {isPublished && (displayAdvertNo || advertId) && (
              <Button
                as="a"
                href={buildAdvertDetailUrl(displayAdvertNo || advertId || '')}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                size="sm"
                className="d-flex align-items-center gap-1 px-3 fw-semibold shadow-sm text-decoration-none"
              >
                <i className="fe fe-external-link" /> Gerçek İlana Git
              </Button>
            )}
            <Button variant="outline-secondary" size="sm" className="px-4" onClick={onClose}>
              Kapat
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && mediaList[lightboxIndex] && (
        <Modal
          show={true}
          onHide={() => setLightboxIndex(null)}
          size="lg"
          centered
          contentClassName="bg-transparent border-0"
        >
          <div className="position-relative bg-dark rounded-3 overflow-hidden shadow-lg p-2 text-center">
            <div className="d-flex justify-content-between align-items-center text-white px-3 py-2">
              <span className="small">
                Fotoğraf {lightboxIndex + 1} / {mediaList.length}
                {mediaList[lightboxIndex].isCover && (
                  <Badge bg="warning" text="dark" className="ms-2">
                    Kapak
                  </Badge>
                )}
              </span>
              <Button
                size="sm"
                variant="link"
                className="text-white p-0 fs-5 text-decoration-none"
                onClick={() => setLightboxIndex(null)}
              >
                <i className="fe fe-x" />
              </Button>
            </div>

            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
              <img
                src={resolveMediaSrc(mediaList[lightboxIndex])}
                alt={`Önizleme ${lightboxIndex + 1}`}
                className="img-fluid rounded"
                style={{ maxHeight: '75vh', objectFit: 'contain' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('placeholder-img.jpg')) {
                    target.src = '/images/placeholder/placeholder-img.jpg';
                  }
                }}
              />
            </div>

            {mediaList.length > 1 && (
              <div className="d-flex justify-content-between position-absolute top-50 start-0 end-0 px-3 translate-middle-y">
                <Button
                  size="sm"
                  variant="dark"
                  className="rounded-circle bg-opacity-75"
                  style={{ width: '40px', height: '40px' }}
                  disabled={lightboxIndex === 0}
                  onClick={() => setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                >
                  <i className="fe fe-chevron-left" />
                </Button>
                <Button
                  size="sm"
                  variant="dark"
                  className="rounded-circle bg-opacity-75"
                  style={{ width: '40px', height: '40px' }}
                  disabled={lightboxIndex === mediaList.length - 1}
                  onClick={() =>
                    setLightboxIndex((prev) => (prev !== null && prev < mediaList.length - 1 ? prev + 1 : prev))
                  }
                >
                  <i className="fe fe-chevron-right" />
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
