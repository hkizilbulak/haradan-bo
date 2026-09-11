"use client"
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Badge, Row, Col, Card, Table, Spinner, Alert } from 'react-bootstrap';
import StatusBadge from '@/components/StatusBadge';
import { buildMediaUrl, buildAdvertDetailUrl } from '@/contants/urls';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { formatMoney, getErrorMessage } from '@/helpers/HelperUtils';
import { looksLikeHtml, sanitizeRichHtml } from '@/helpers/sanitizeHtml';
import { canModerationAction } from '@/helpers/moderationActions';
import { useResolvedLocation } from '@/helpers/location';
import { ModerationAdvertResponse } from '@/models';
import { advertService, ModerationAdvertDetail } from '@/services/advert.service';

interface AdvertDetailModalProps {
  advert: ModerationAdvertResponse | null;
  onClose: () => void;
  categoryName?: string;
  onApprove?: (advert: ModerationAdvertResponse) => void;
  onReject?: (advert: ModerationAdvertResponse) => void;
  onSuspend?: (advert: ModerationAdvertResponse) => void;
  onPackage?: (advert: ModerationAdvertResponse) => void;
}

interface SpecRow {
  label: string;
  value: string;
  isClickable?: boolean;
  href?: string;
}

export default function AdvertDetailModal({
  advert,
  onClose,
  categoryName,
  onApprove,
  onReject,
  onSuspend,
  onPackage,
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
  const isPublished = currentStatus === 'PUBLISHED' || advert?.status === 'PUBLISHED';
  const canApprove = advert ? canModerationAction(currentStatus, 'approve') : false;
  const canReject = advert ? canModerationAction(currentStatus, 'reject') : false;
  const canSuspend = advert ? canModerationAction(currentStatus, 'suspend') : false;

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

  const mediaList = detail?.media || [];
  const properties = (detail?.properties || {}) as Record<string, any>;

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
  const rawPriceAmount = (detail?.price as any)?.amountMinor ?? (detail?.price as any)?.amount;
  const priceFormatted = rawPriceAmount != null
    ? formatMoney(rawPriceAmount, detail?.price?.currency || 'TRY')
    : (() => {
        const propPrice = getProp(['fiyat', 'price', 'ucret', 'bedel']);
        if (propPrice) return propPrice;
        return 'Fiyat Belirtilmemiş';
      })();

  const resolvedLocation = useResolvedLocation(detail);

  // Horse & Advert specific fields
  const horseName = getProp(['registeredName', 'atAdi', 'isim', 'horseName', 'title']) || detail?.title || advert?.title || '-';
  const breed = getProp(['horseBreed', 'irk', 'breed', 'atIrki']) || '-';
  const age = getProp(['horseAge', 'yas', 'age']) || '-';
  const gender = getProp(['horseGender', 'cinsiyet', 'gender']) || '-';
  const coatColor = getProp(['coatColor', 'donu', 'don', 'renk']) || '-';
  const sire = getProp(['baba', 'sire', 'babaAdi', 'babaSire']) || '-';
  const dam = getProp(['anne', 'dam', 'anneAdi', 'anneDam']) || '-';
  const damsire = getProp(['damsire', 'anneBabasi', 'kisrakBabasi', 'annesininBabasi']) || '-';
  const ownerName = getProp(['owner', 'sahip', 'ownerName']) || '-';
  const tjkNumber = getProp(['tjkNumber', 'tjkNo', 'tjkId']) || '';
  const birthDate = getProp(['birthDate', 'dogumTarihi']) || '';
  const phone = getProp(['sellerPhone', 'phone', 'telefon', 'iletisimTelefonu']) || '';
  const companyName = getProp(['companyName', 'firmaAdi', 'sirket']) || '';
  const websiteUrl = getProp(['websiteUrl', 'website', 'webSitesi']) || '';

  // Build BuyBox specifications list (Matches Haradan published advert layout)
  const specRows = useMemo(() => {
    const list: SpecRow[] = [];

    list.push({
      label: 'İlan No',
      value: String(advertId),
      isClickable: isPublished && Boolean(advertId),
      href: isPublished && advertId ? buildAdvertDetailUrl(advertId) : undefined,
    });
    list.push({
      label: 'İlan Tarihi',
      value: detail?.publishedAt
        ? formatDateTimeForText(detail.publishedAt)
        : formatDateTimeForText(new Date().toISOString()),
    });
    list.push({ label: 'Kategori', value: resolvedCategory });

    if (horseName && horseName !== '-') list.push({ label: 'At Adı', value: horseName });

    if (sire && sire !== '-') {
      list.push({
        label: 'Baba (Sire)',
        value: sire,
        isClickable: true,
        href: `https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(sire)}`,
      });
    }

    if (dam && dam !== '-') {
      list.push({
        label: 'Anne (Dam)',
        value: dam,
        isClickable: true,
        href: `https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(dam)}`,
      });
    }

    if (damsire && damsire !== '-') {
      list.push({
        label: 'Anne Babası (Damsire)',
        value: damsire,
        isClickable: true,
        href: `https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(damsire)}`,
      });
    }

    if (breed && breed !== '-') list.push({ label: 'Irk', value: breed });
    if (age && age !== '-') list.push({ label: 'Yaş', value: age });
    if (gender && gender !== '-') list.push({ label: 'Cinsiyet', value: gender });
    if (coatColor && coatColor !== '-') list.push({ label: 'Donu', value: coatColor });
    if (ownerName && ownerName !== '-') list.push({ label: 'Sahip', value: ownerName });
    if (tjkNumber) list.push({ label: 'TJK No', value: tjkNumber });
    if (birthDate) list.push({ label: 'Doğum Tarihi', value: birthDate });
    if (companyName) list.push({ label: 'Firma / Şirket', value: companyName });
    if (websiteUrl) list.push({ label: 'Web Sitesi', value: websiteUrl, isClickable: true, href: websiteUrl });
    if (phone) list.push({ label: 'İletişim Telefonu', value: phone });

    // Catch any other properties not in the predefined list
    const knownKeys = new Set([
      'registeredname', 'atadi', 'isim', 'horsename', 'title',
      'horsebreed', 'irk', 'ırk', 'breed', 'atirki',
      'horseage', 'yas', 'yaş', 'age',
      'horsegender', 'cinsiyet', 'gender',
      'coatcolor', 'donu', 'don', 'renk',
      'baba', 'sire', 'babaadi', 'babasire',
      'anne', 'dam', 'anneadi', 'annedam',
      'damsire', 'annebabasi', 'kisrakbabasi', 'annesininbabasi',
      'owner', 'sahip', 'ownername',
      'tjknumber', 'tjkno', 'tjkid',
      'birthdate', 'dogumtarihi',
      'sellerphone', 'phone', 'telefon', 'iletisimtelefonu', 'saticitelefonu',
      'companyname', 'firmaadi', 'sirket',
      'websiteurl', 'website', 'websitesi',
    ]);

    for (const [key, val] of Object.entries(properties)) {
      const normKey = normText(key);
      if (!knownKeys.has(normKey) && val != null && val !== '') {
        const readableKey = key
          .replace(/_/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .toLowerCase()
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        list.push({ label: readableKey, value: typeof val === 'boolean' ? (val ? 'Evet' : 'Hayır') : String(val) });
      }
    }

    return list;
  }, [advertId, isPublished, detail, resolvedCategory, horseName, breed, age, gender, coatColor, sire, dam, damsire, ownerName, tjkNumber, birthDate, companyName, websiteUrl, properties]);

  const copyToClipboard = (text: string, keyName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const activeMedia = mediaList[activeMediaIndex] ?? mediaList[0];
  const activeMediaUrl = activeMedia ? buildMediaUrl(activeMedia.assetId, 'DETAIL') : null;

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
                <Badge bg="light" text="dark" className="border fw-normal">
                  #{advertId}
                </Badge>
              </div>
            </div>
            {isPublished && advertId && (
              <Button
                as="a"
                href={buildAdvertDetailUrl(advertId)}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                size="sm"
                className="d-flex align-items-center gap-1 px-3 py-2 fw-semibold shadow-sm"
              >
                <i className="fe fe-external-link" /> Gerçek İlana Git
              </Button>
            )}
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
                                alt={detail?.title || 'İlan Görseli'}
                                className="w-100 h-100 object-fit-contain"
                                crossOrigin="use-credentials"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/placeholder/placeholder-img.jpg';
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
                          {mediaList.map((m, idx) => {
                            const isCurrent = idx === activeMediaIndex;
                            return (
                              <div
                                key={m.assetId || idx}
                                onClick={() => setActiveMediaIndex(idx)}
                                className={`rounded-3 overflow-hidden flex-shrink-0 border ${
                                  isCurrent ? 'border-primary border-3 shadow-sm' : 'border-light'
                                }`}
                                style={{ width: '74px', height: '56px', cursor: 'pointer' }}
                              >
                                <img
                                  src={buildMediaUrl(m.assetId, 'DETAIL')}
                                  alt={`Küçük Resim ${idx + 1}`}
                                  className="w-100 h-100 object-fit-cover"
                                  crossOrigin="use-credentials"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/placeholder/placeholder-img.jpg';
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
                                  {row.href ? (
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
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <div className="small text-muted fw-semibold">İLAN SAHİBİ</div>
                            <div className="fw-bold text-dark">
                              {ownerName && ownerName !== '-' ? ownerName : 'Kullanıcı'}
                            </div>
                            <div className="small font-monospace text-muted text-truncate" style={{ maxWidth: '180px' }}>
                              ID: {detail?.ownerUserId || advert.ownerUserId || '-'}
                            </div>
                          </div>
                          {detail?.ownerUserId && (
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => copyToClipboard(detail.ownerUserId, 'owner')}
                              title="ID Kopyala"
                              className="d-flex align-items-center gap-1"
                            >
                              <i className={`fe ${copiedKey === 'owner' ? 'fe-check text-success' : 'fe-copy'}`} />
                              <span className="small">{copiedKey === 'owner' ? 'Kopyalandı' : 'Kopyala'}</span>
                            </Button>
                          )}
                        </div>

                        {phone ? (
                          <div className="d-flex flex-column gap-2">
                            <a
                              href={`tel:${phone}`}
                              className="btn btn-dark w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-3"
                            >
                              <i className="fe fe-phone fs-5" /> {phone}
                            </a>
                            <a
                              href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Merhaba, Haradan.com'daki ${encodeURIComponent(detail?.title || '')} ilanınız hakkında bilgi almak istiyorum.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn text-white w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-3"
                              style={{ backgroundColor: '#25D366' }}
                            >
                              <i className="fe fe-message-circle fs-5" /> WhatsApp ile Mesaj Gönder
                            </a>
                          </div>
                        ) : (
                          <div className="text-center py-2 text-muted small fst-italic">
                            İletişim numarası belirtilmemiş.
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
          <div className="d-flex gap-2 flex-wrap">
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
                <i className="fe fe-check" /> İlanı Onayla
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
                variant="warning"
                className="d-flex align-items-center gap-1 shadow-sm px-3 fw-semibold"
                onClick={() => {
                  onClose();
                  onSuspend(advert);
                }}
              >
                <i className="fe fe-slash" /> Askıya Al
              </Button>
            )}
            {onPackage && (
              <Button
                size="sm"
                variant="info"
                className="d-flex align-items-center gap-1 shadow-sm text-white px-3 fw-semibold"
                onClick={() => {
                  onClose();
                  onPackage(advert);
                }}
              >
                <i className="fe fe-package" /> Paket İşlemleri
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" className="px-4" onClick={onClose}>
            Kapat
          </Button>
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
                src={buildMediaUrl(mediaList[lightboxIndex].assetId, 'DETAIL')}
                alt={`Önizleme ${lightboxIndex + 1}`}
                className="img-fluid rounded"
                style={{ maxHeight: '75vh', objectFit: 'contain' }}
                crossOrigin="use-credentials"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder/placeholder-img.jpg';
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
