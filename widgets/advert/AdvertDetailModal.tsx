"use client"
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Badge, Row, Col, Card, Table, Spinner, Alert } from 'react-bootstrap';
import StatusBadge from '@/components/StatusBadge';
import { buildMediaUrl } from '@/contants/urls';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getAdvertStatusText } from '@/helpers/EnumUtils';
import { formatMoney, getErrorMessage } from '@/helpers/HelperUtils';
import { looksLikeHtml, sanitizeRichHtml } from '@/helpers/sanitizeHtml';
import { canModerationAction } from '@/helpers/moderationActions';
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
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'pedigree' | 'history'>('overview');
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
      setActiveSubTab('overview');
      setActiveMediaIndex(0);
      setLightboxIndex(null);
      void fetchDetail();
    } else {
      setDetail(null);
      setError(null);
    }
  }, [advertId]);

  const currentStatus = detail?.status ?? advert?.status ?? 'PENDING_REVIEW';
  const canApprove = advert ? canModerationAction(currentStatus, 'approve') : false;
  const canReject = advert ? canModerationAction(currentStatus, 'reject') : false;
  const canSuspend = advert ? canModerationAction(currentStatus, 'suspend') : false;

  const resolvedCategory = categoryName || detail?.categoryId || advert?.categoryId || 'Kategori Belirtilmemiş';
  const priceFormatted = detail?.price?.amount
    ? formatMoney(detail.price.amount, detail.price.currency || 'TRY')
    : 'Fiyat Belirtilmemiş';

  const mediaList = detail?.media || [];
  const statusHistory = detail?.statusHistory || [];
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

  const hasHorseData = Boolean(sire !== '-' || dam !== '-' || breed !== '-' || tjkNumber);

  // Build BuyBox specifications list (Matches Haradan published advert layout)
  const specRows = useMemo(() => {
    const list: SpecRow[] = [];

    list.push({ label: 'İlan No', value: String(advertId) });
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
  }, [advertId, detail, resolvedCategory, horseName, breed, age, gender, coatColor, sire, dam, damsire, ownerName, tjkNumber, birthDate, companyName, websiteUrl, properties]);

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

            {/* Quick action buttons for header */}
            <div className="d-flex align-items-center gap-2">
              {phone && (
                <a
                  href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Merhaba, Haradan.com'daki ${encodeURIComponent(detail?.title || '')} ilanınız hakkında bilgi almak istiyorum.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-success d-flex align-items-center gap-1 shadow-sm px-3"
                  style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                >
                  <i className="fe fe-message-circle" /> WhatsApp
                </a>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="btn btn-sm btn-dark d-flex align-items-center gap-1 shadow-sm px-3"
                >
                  <i className="fe fe-phone" /> Ara
                </a>
              )}
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
            <>
              {/* SubTabs Bar (Identical to Haradan.com Desktop Tabs) */}
              <div className="d-flex gap-2 mb-3 bg-white p-2 rounded-3 shadow-sm border">
                <Button
                  variant={activeSubTab === 'overview' ? 'primary' : 'light'}
                  size="sm"
                  className="rounded-2 fw-semibold d-flex align-items-center gap-2 border-0 px-3"
                  onClick={() => setActiveSubTab('overview')}
                >
                  <i className="fe fe-info" /> Genel Bilgiler
                </Button>

                {hasHorseData && (
                  <Button
                    variant={activeSubTab === 'pedigree' ? 'primary' : 'light'}
                    size="sm"
                    className="rounded-2 fw-semibold d-flex align-items-center gap-2 border-0 px-3"
                    onClick={() => setActiveSubTab('pedigree')}
                  >
                    <i className="fe fe-git-branch" /> Pedigri (Soyağacı)
                  </Button>
                )}

                <Button
                  variant={activeSubTab === 'history' ? 'primary' : 'light'}
                  size="sm"
                  className="rounded-2 fw-semibold d-flex align-items-center gap-2 border-0 px-3 ms-auto"
                  onClick={() => setActiveSubTab('history')}
                >
                  <i className="fe fe-clock" /> Moderasyon Süreci
                  <Badge bg={activeSubTab === 'history' ? 'light' : 'secondary'} text={activeSubTab === 'history' ? 'dark' : 'white'} pill>
                    {statusHistory.length}
                  </Badge>
                </Button>
              </div>

              {/* TAB 1: GENEL BİLGİLER (HARADAN MAIN 2-COLUMN VIEW) */}
              {activeSubTab === 'overview' && (
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
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/placeholder/image-placeholder.jpg';
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
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/placeholder/image-placeholder.jpg';
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
                  </Col>

                  {/* SAĞ KOLON: HARADAN BUYBOX (FİYAT, BİLGİ TABLOSU, İLETİŞİM) */}
                  <Col lg={5}>
                    <Card className="border-0 shadow-sm rounded-4 bg-white overflow-hidden mb-4 sticky-top" style={{ top: '15px' }}>
                      {/* BuyBox Header: Location & Price */}
                      <div className="p-4 border-bottom bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2 text-secondary">
                          <i className="fe fe-map-pin text-primary fs-5" />
                          <span className="fw-semibold text-dark">
                            {(() => {
                              const city = getProp(['sehir', 'il', 'city', 'province', 'ilAdi', 'sehirAdi']);
                              const district = getProp(['ilce', 'ilçe', 'district', 'town', 'ilceAdi']);
                              const locFromProps = [city, district].filter(Boolean).join(' / ');
                              if (locFromProps) return locFromProps;
                              const dId = detail?.districtId ? String(detail.districtId) : '';
                              return dId && !dId.includes('-') ? `Bölge: ${dId}` : 'Konum Belirtilmedi';
                            })()}
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

              {/* TAB 2: PEDİGRİ (SOYAĞACI) - HARADAN.COM 1:1 REPLICATION */}
              {activeSubTab === 'pedigree' && (
                <Card className="border-0 shadow-sm rounded-4 bg-white p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                    <div>
                      <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                        <i className="fe fe-git-branch text-primary" /> Pedigri (Soyağacı)
                      </h5>
                      <div className="small text-muted">{horseName} atının 3 nesil soy kütüğü</div>
                    </div>
                  </div>

                  <div
                    className="p-4 rounded-4 border"
                    style={{
                      backgroundColor: '#f8fafc',
                      borderColor: '#e2e8f0',
                    }}
                  >
                    <Row className="g-4 align-items-stretch">
                      {/* Gen 0: İLAN SAFKANI (KÖK) */}
                      <Col lg={4} className="d-flex flex-column justify-content-center">
                        <div
                          className="p-4 rounded-3 shadow-sm text-center position-relative"
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderLeft: '5px solid #002B49',
                          }}
                        >
                          <div
                            className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill small fw-bold mb-2"
                            style={{ backgroundColor: '#e2e8f0', color: '#002B49', fontSize: '11px' }}
                          >
                            <i className="fe fe-award" /> SAFKAN (ORİJİN)
                          </div>
                          <h4 className="fw-bold mb-1" style={{ color: '#002B49' }}>
                            {horseName}
                          </h4>
                          <div className="small text-muted">
                            {breed} • {gender} • {coatColor}
                          </div>
                          {birthDate && (
                            <div className="small text-muted mt-1">
                              <i className="fe fe-calendar me-1" /> Doğum: {birthDate}
                            </div>
                          )}
                        </div>
                      </Col>

                      {/* Gen 1: BABA & ANNE (%50) */}
                      <Col lg={4} className="d-flex flex-column justify-content-around gap-3">
                        {/* Baba (Sire) Card */}
                        <div
                          className="p-3 rounded-3 shadow-sm position-relative"
                          style={{
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderLeft: '5px solid #0284c7',
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span
                              className="fw-bold d-flex align-items-center gap-1"
                              style={{ color: '#0284c7', fontSize: '12px' }}
                            >
                              ♂ Baba (Sire)
                            </span>
                            <span
                              className="badge rounded-pill fw-bold"
                              style={{ backgroundColor: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' }}
                            >
                              %50
                            </span>
                          </div>
                          <div className="fs-5 fw-bold text-dark mb-1">
                            {sire && sire !== '-' ? sire : '-'}
                          </div>
                          {sire && sire !== '-' && (
                            <a
                              href={`https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(sire)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="small text-decoration-none d-inline-flex align-items-center gap-1 fw-semibold"
                              style={{ color: '#0284c7' }}
                            >
                              <span>TJK'da Sorgula</span>
                              <i className="fe fe-external-link small" />
                            </a>
                          )}
                        </div>

                        {/* Anne (Dam) Card */}
                        <div
                          className="p-3 rounded-3 shadow-sm position-relative"
                          style={{
                            backgroundColor: '#fdf2f8',
                            border: '1px solid #fbcfe8',
                            borderLeft: '5px solid #db2777',
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span
                              className="fw-bold d-flex align-items-center gap-1"
                              style={{ color: '#db2777', fontSize: '12px' }}
                            >
                              ♀ Anne (Dam)
                            </span>
                            <span
                              className="badge rounded-pill fw-bold"
                              style={{ backgroundColor: 'rgba(219, 39, 119, 0.15)', color: '#db2777' }}
                            >
                              %50
                            </span>
                          </div>
                          <div className="fs-5 fw-bold text-dark mb-1">
                            {dam && dam !== '-' ? dam : '-'}
                          </div>
                          {dam && dam !== '-' && (
                            <a
                              href={`https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(dam)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="small text-decoration-none d-inline-flex align-items-center gap-1 fw-semibold"
                              style={{ color: '#db2777' }}
                            >
                              <span>TJK'da Sorgula</span>
                              <i className="fe fe-external-link small" />
                            </a>
                          )}
                        </div>
                      </Col>

                      {/* Gen 2: BÜYÜK EBEVEYNLER (%25) */}
                      <Col lg={4} className="d-flex flex-column justify-content-between gap-2">
                        {/* Babanın Babası */}
                        <div
                          className="p-2 px-3 rounded-3 shadow-sm"
                          style={{
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #e0f2fe',
                            borderLeft: '3px solid #38bdf8',
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <span style={{ color: '#0284c7', fontSize: '11px', fontWeight: 600 }}>
                              ♂ Babanın Babası
                            </span>
                            <span className="text-muted small" style={{ fontSize: '10px' }}>%25</span>
                          </div>
                          <div className="fw-bold text-dark small">-</div>
                        </div>

                        {/* Babanın Annesi */}
                        <div
                          className="p-2 px-3 rounded-3 shadow-sm"
                          style={{
                            backgroundColor: '#fdf2f8',
                            border: '1px solid #fce7f3',
                            borderLeft: '3px solid #f472b6',
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <span style={{ color: '#db2777', fontSize: '11px', fontWeight: 600 }}>
                              ♀ Babanın Annesi
                            </span>
                            <span className="text-muted small" style={{ fontSize: '10px' }}>%25</span>
                          </div>
                          <div className="fw-bold text-dark small">-</div>
                        </div>

                        {/* Kısrak Babası (Damsire) */}
                        <div
                          className="p-2 px-3 rounded-3 shadow-sm"
                          style={{
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderLeft: '4px solid #0284c7',
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <span style={{ color: '#0284c7', fontSize: '11px', fontWeight: 700 }}>
                              ♂ Kısrak Babası (Damsire)
                            </span>
                            <span
                              className="badge rounded-pill fw-bold"
                              style={{ backgroundColor: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', fontSize: '10px' }}
                            >
                              %25
                            </span>
                          </div>
                          <div className="fw-bold text-dark small">
                            {damsire && damsire !== '-' ? (
                              <a
                                href={`https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(damsire)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-decoration-none fw-bold d-inline-flex align-items-center gap-1"
                                style={{ color: '#0284c7' }}
                              >
                                {damsire} <i className="fe fe-external-link" style={{ fontSize: '10px' }} />
                              </a>
                            ) : (
                              '-'
                            )}
                          </div>
                        </div>

                        {/* Annenin Annesi */}
                        <div
                          className="p-2 px-3 rounded-3 shadow-sm"
                          style={{
                            backgroundColor: '#fdf2f8',
                            border: '1px solid #fce7f3',
                            borderLeft: '3px solid #f472b6',
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <span style={{ color: '#db2777', fontSize: '11px', fontWeight: 600 }}>
                              ♀ Annenin Annesi
                            </span>
                            <span className="text-muted small" style={{ fontSize: '10px' }}>%25</span>
                          </div>
                          <div className="fw-bold text-dark small">-</div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Card>
              )}

              {/* TAB: MODERASYON GEÇMİŞİ */}
              {activeSubTab === 'history' && (
                <Card className="border-0 shadow-sm rounded-4 bg-white p-4">
                  <h5 className="fw-bold text-dark mb-3 pb-2 border-bottom">Moderasyon Süreci & Durum Geçmişi</h5>
                  {statusHistory.length === 0 ? (
                    <div className="text-center py-4 text-muted bg-light rounded-3">Durum geçmişi kaydı bulunamadı.</div>
                  ) : (
                    <div className="timeline position-relative ps-3">
                      {statusHistory.map((item, index) => (
                        <div key={index} className="position-relative pb-4 ps-4 border-start border-2 border-primary">
                          <div
                            className="position-absolute rounded-circle bg-primary"
                            style={{
                              width: '14px',
                              height: '14px',
                              left: '-8px',
                              top: '4px',
                              border: '3px solid #fff',
                              boxShadow: '0 0 0 1px #0d6efd',
                            }}
                          />
                          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                            <div className="d-flex align-items-center gap-2">
                              {item.fromStatus && (
                                <>
                                  <Badge bg="light" className="text-secondary border">
                                    {getAdvertStatusText(item.fromStatus)}
                                  </Badge>
                                  <span className="text-muted">➔</span>
                                </>
                              )}
                              <Badge bg="primary">{getAdvertStatusText(item.toStatus)}</Badge>
                            </div>
                            <span className="small text-muted">
                              <i className="fe fe-calendar me-1" /> {formatDateTimeForText(item.createdAt)}
                            </span>
                          </div>

                          <div className="small text-muted mb-2">
                            İşlemi Yapan:{' '}
                            <Badge bg={item.isSystem ? 'secondary' : 'dark'}>
                              {item.isSystem ? 'Sistem' : `Yönetici ${item.actorUserId ? `(${item.actorUserId.slice(0, 8)}...)` : ''}`}
                            </Badge>
                          </div>

                          {item.reason && (
                            <div
                              className="p-3 rounded-3 border-start border-3 border-danger bg-light small mt-2"
                              style={{ backgroundColor: '#fff5f5' }}
                            >
                              <div className="fw-bold text-danger mb-1">Moderasyon Notu:</div>
                              <div className="text-dark">{item.reason}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </>
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
