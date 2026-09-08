"use client";
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Offcanvas, Row } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText, toDateInputValue } from '@/helpers/DateUtils';
import { formatMoney, getErrorMessage } from '@/helpers/HelperUtils';
import { sanitizeRichHtml } from '@/helpers/sanitizeHtml';
import useCursorApi from '@/hooks/useCursorApi';
import useModal from '@/hooks/useModal';
import { campaignService, CampaignRequest, CampaignResponse } from '@/services/campaign.service';
import { packageService, PackageResponse } from '@/services/package.service';
import { PageHeading } from '@/widgets';
import CursorPagination from '@/components/CursorPagination';
import DeleteModal from '@/components/DeleteModal';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'react-toastify';
import { Edit, Tag, Percent, CheckCircle, Calendar, ArrowRight, Trash2, PauseCircle, PlayCircle } from 'react-feather';

const headItems = [
  'Kampanya Adı',
  'İndirimli Paket',
  'İndirim',
  'Fiyat',
  'Geçerlilik Tarihi',
  'Durum',
  '',
];

const initialValues: CampaignRequest = {
  code: '',
  name: 'Tüm Paketlerde Özel İndirim',
  eventType: 'PACKAGE_UPGRADE',
  targetPackageCode: '',
  sourcePackageCode: '',
  title: '%20 İndirim Fırsatı!',
  description: '',
  badgeText: '%20 İndirim',
  originalAmountMinor: undefined,
  campaignAmountMinor: undefined,
  currencyCode: 'TRY',
  startsAt: toDateInputValue(new Date().toISOString()),
  endsAt: '',
  isActive: true,
  emailSubject: '',
  emailHeading: '',
  emailBody: '',
  emailProviderTemplateId: '',
};

function CampaignModal({
  selectedCampaign,
  packages,
  onClose,
  onSave,
  onDelete,
  onToggleActive,
}: {
  selectedCampaign?: CampaignResponse;
  packages: PackageResponse[];
  onClose: () => void;
  onSave: (value: CampaignRequest) => void;
  onDelete?: () => void;
  onToggleActive?: (campaign: CampaignResponse) => Promise<void>;
}) {
  const isNew = !selectedCampaign?.id;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showToggleActiveConfirm, setShowToggleActiveConfirm] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [percentInput, setPercentInput] = useState<string | null>(null);
  const [discountTLInput, setDiscountTLInput] = useState<string | null>(null);
  const [campaignTLInput, setCampaignTLInput] = useState<string | null>(null);
  const [allPackagesDiscountType, setAllPackagesDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>(() => {
    if (selectedCampaign?.badgeText?.startsWith('₺')) {
      return 'FIXED_AMOUNT';
    }
    return 'PERCENTAGE';
  });
  const [allPackagesDiscountValue, setAllPackagesDiscountValue] = useState<number>(() => {
    if (selectedCampaign?.badgeText) {
      const match = selectedCampaign.badgeText.match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return 20;
  });
  const [allPackagesDiscountInput, setAllPackagesDiscountInput] = useState<string | null>(null);

  const values: CampaignRequest = selectedCampaign
    ? {
      identifier: selectedCampaign.id,
      expectedVersion: selectedCampaign.version,
      code: selectedCampaign.code,
      name: selectedCampaign.name,
      eventType: selectedCampaign.eventType || 'PACKAGE_UPGRADE',
      sourcePackageCode: selectedCampaign.sourcePackageCode ?? '',
      targetPackageCode: selectedCampaign.targetPackageCode ?? '',
      title: selectedCampaign.title,
      description: selectedCampaign.description ?? '',
      emailSubject: selectedCampaign.emailSubject ?? '',
      emailHeading: selectedCampaign.emailHeading ?? '',
      emailBody: selectedCampaign.emailBody ?? '',
      emailProviderTemplateId: selectedCampaign.emailProviderTemplateId ?? '',
      ctaLabel: selectedCampaign.ctaLabel ?? '',
      ctaUrl: selectedCampaign.ctaUrl ?? '',
      badgeText: selectedCampaign.badgeText ?? '',
      imageAssetId: selectedCampaign.imageAssetId ?? '',
      originalAmountMinor: selectedCampaign.originalPrice?.amountMinor,
      campaignAmountMinor: selectedCampaign.campaignPrice?.amountMinor,
      currencyCode: selectedCampaign.currencyCode || 'TRY',
      startsAt: toDateInputValue(selectedCampaign.startsAt),
      endsAt: toDateInputValue(selectedCampaign.endsAt),
      isActive: selectedCampaign.isActive,
    }
    : initialValues;

  const schema = Yup.object().shape({
    name: Yup.string().required('Kampanya adı zorunludur'),
    title: Yup.string().required('Görsel başlık zorunludur'),
    startsAt: Yup.string().required('Başlangıç tarihi zorunludur'),
    endsAt: Yup.string().test('end-after-start', 'Bitiş başlangıçtan sonra veya aynı gün olmalı', function (end) {
      const { startsAt } = this.parent as { startsAt?: string };
      if (!end || !startsAt) {
        return true;
      }
      return end >= startsAt;
    }),
  });

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end" style={{ width: 'min(720px, 100vw)' }}>
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title className="fw-bold d-flex align-items-center gap-2">
          <Tag className="text-primary" size={20} />
          {isNew ? 'Yeni Paket İndirimi & Kampanya Ekle' : 'Kampanyayı Düzenle'}
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="p-4">
        <Formik initialValues={values} validationSchema={schema} onSubmit={onSave}>
          {({ handleSubmit, handleChange, setFieldValue, values, isValid, isSubmitting, errors, touched, dirty, validateForm }) => {
            const selectedPackage = packages.find((p) => p.code === values.targetPackageCode);
            const activePackages = packages.filter((pkg) => pkg.isActive && (pkg.displayPrice?.amountMinor ?? 0) > 0);
            const originalTL = values.originalAmountMinor ? values.originalAmountMinor / 100 : 0;
            const campaignTL = values.campaignAmountMinor ? values.campaignAmountMinor / 100 : 0;
            const discountTL =
              originalTL > 0 && campaignTL >= 0 && campaignTL <= originalTL
                ? Math.round((originalTL - campaignTL) * 100) / 100
                : 0;
            const discountPercent =
              originalTL > 0 && campaignTL >= 0 && campaignTL <= originalTL
                ? Math.round(((originalTL - campaignTL) / originalTL) * 100)
                : 0;

            const handlePackageSelect = (pkgCode: string) => {
              setFieldValue('targetPackageCode', pkgCode);
              if (!pkgCode) {
                setFieldValue('originalAmountMinor', undefined);
                setFieldValue('campaignAmountMinor', undefined);
                if (!values.name || values.name.includes('İndirimi')) {
                  setFieldValue('name', 'Tüm Paketlerde Özel İndirim');
                }
                const badge = allPackagesDiscountType === 'PERCENTAGE' ? `%${allPackagesDiscountValue} İndirim` : `₺${allPackagesDiscountValue} İndirim`;
                if (!values.title || values.title.includes('Özel Fırsatı') || values.title.includes('İndirim Fırsatı!')) {
                  setFieldValue('title', `${badge} Fırsatı!`);
                }
                setFieldValue('badgeText', badge);
                return;
              }
              const pkg = packages.find((p) => p.code === pkgCode);
              if (pkg && pkg.displayPrice?.amountMinor) {
                const origMinor = pkg.displayPrice.amountMinor;
                setFieldValue('originalAmountMinor', origMinor);
                // If title/name empty, suggest intuitive defaults
                if (!values.name || values.name === 'Tüm Paketlerde Özel İndirim') {
                  setFieldValue('name', `${pkg.displayName} İndirimi`);
                }
                if (!values.title || values.title.includes('İndirim Fırsatı!')) {
                  setFieldValue('title', `${pkg.displayName} Özel Fırsatı`);
                }
                const orig = origMinor / 100;
                const pct = discountPercent && discountPercent > 0 ? discountPercent : 20;
                setFieldValue('campaignAmountMinor', Math.max(0, Math.round(orig * (1 - pct / 100) * 100)));
              }
            };

            const applyDiscountPercent = (percent: number) => {
              if (originalTL > 0) {
                const clamped = Math.min(100, Math.max(0, percent));
                const discounted = Math.max(0, Math.round(originalTL * (1 - clamped / 100) * 100));
                setFieldValue('campaignAmountMinor', discounted);
              }
            };

            const applyDiscountTL = (disc: number) => {
              if (originalTL > 0) {
                const clamped = Math.min(originalTL, Math.max(0, disc));
                const discounted = Math.max(0, Math.round((originalTL - clamped) * 100));
                setFieldValue('campaignAmountMinor', discounted);
              }
            };

            const applyCampaignPriceTL = (camp: number) => {
              if (originalTL > 0) {
                const clamped = Math.min(originalTL, Math.max(0, camp));
                setFieldValue('campaignAmountMinor', Math.max(0, Math.round(clamped * 100)));
              } else {
                setFieldValue('campaignAmountMinor', Math.max(0, Math.round(camp * 100)));
              }
            };

            return (
              <Form noValidate onSubmit={handleSubmit} className="d-flex flex-column gap-4">
                {/* 1. Bölüm: Paket ve İndirimli Fiyat Belirleme */}
                <Card className="border shadow-sm">
                  <Card.Header className="bg-light fw-bold py-2 d-flex align-items-center gap-2">
                    <span className="badge bg-primary rounded-pill">1</span>
                    İndirim Uygulanacak Premium Paket & Fiyat
                  </Card.Header>
                  <Card.Body className="p-3">
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        Hangi Premium Pakete İndirim Yapılacak? <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        name="targetPackageCode"
                        value={values.targetPackageCode ?? ''}
                        onChange={(e) => handlePackageSelect(e.target.value)}
                        className="form-select-lg fs-6"
                      >
                        <option value="">✨ Tüm Paketlerde Geçerli</option>
                        {packages
                          .filter((pkg) => pkg.isActive || pkg.code === values.targetPackageCode)
                          .map((pkg) => (
                            <option key={pkg.code} value={pkg.code}>
                              {pkg.displayName} — Normal Fiyat:{' '}
                              {pkg.displayPrice?.amountMinor
                                ? formatMoney(pkg.displayPrice.amountMinor, 'TRY')
                                : 'Fiyat Belirtilmemiş'}
                            </option>
                          ))}
                      </Form.Select>
                    </Form.Group>

                    <div className="mt-3 p-3 rounded-3 border bg-light-subtle">
                      {values.targetPackageCode ? (
                        <>
                          {/* 1. DURUM: BELİRLİ BİR PAKET SEÇİLİ (3'lü Senkronize Hesaplayıcı) */}
                          <Row className="g-3">
                            {/* 1. İndirim Oranı (%) */}
                            <Col md={4}>
                              <div className="bg-white p-3 rounded-3 border shadow-xs">
                                <Form.Label className="small fw-bold text-primary mb-1">
                                  İndirim Oranı (%) <span className="text-danger">*</span>
                                </Form.Label>
                                <InputGroup>
                                  <Form.Control
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="any"
                                    value={percentInput !== null ? percentInput : (discountPercent !== null ? discountPercent : '')}
                                    onFocus={() => setPercentInput(discountPercent !== null ? String(discountPercent) : '')}
                                    onBlur={() => setPercentInput(null)}
                                    onChange={(e) => {
                                      let val = e.target.value;
                                      if (val === '') {
                                        setPercentInput('');
                                        applyDiscountPercent(0);
                                        return;
                                      }
                                      const num = parseFloat(val);
                                      if (!isNaN(num)) {
                                        if (num >= 100 || val.length >= 3) {
                                          val = '100';
                                          setPercentInput('100');
                                          applyDiscountPercent(100);
                                        } else {
                                          setPercentInput(val);
                                          applyDiscountPercent(num);
                                        }
                                      }
                                    }}
                                    placeholder="0"
                                    className="fw-bold fs-5 text-primary border-primary-subtle"
                                  />
                                  <InputGroup.Text className="bg-primary text-white fw-bold">%</InputGroup.Text>
                                </InputGroup>
                              </div>
                            </Col>

                            {/* 2. İndirim Tutarı (TL) */}
                            <Col md={4}>
                              <div className="bg-white p-3 rounded-3 border shadow-xs">
                                <Form.Label className="small fw-bold text-primary mb-1">
                                  İndirim Tutarı (TL) <span className="text-danger">*</span>
                                </Form.Label>
                                <InputGroup>
                                  <Form.Control
                                    type="number"
                                    min={0}
                                    max={originalTL > 0 ? originalTL : undefined}
                                    step="any"
                                    value={discountTLInput !== null ? discountTLInput : (discountTL !== null && discountTL >= 0 ? discountTL : '')}
                                    onFocus={() => setDiscountTLInput(discountTL > 0 ? String(discountTL) : (originalTL > 0 ? '0' : ''))}
                                    onBlur={() => setDiscountTLInput(null)}
                                    onChange={(e) => {
                                      let val = e.target.value;
                                      if (val === '') {
                                        setDiscountTLInput('');
                                        applyDiscountTL(0);
                                        return;
                                      }
                                      let num = parseFloat(val);
                                      if (!isNaN(num)) {
                                        if (num > originalTL) {
                                          num = originalTL;
                                          val = String(originalTL);
                                        } else if (num < 0) {
                                          num = 0;
                                          val = '0';
                                        }
                                        setDiscountTLInput(val);
                                        applyDiscountTL(num);
                                      }
                                    }}
                                    placeholder="0"
                                    className="fw-bold fs-5 text-primary border-primary-subtle"
                                  />
                                  <InputGroup.Text className="bg-primary text-white fw-bold">₺</InputGroup.Text>
                                </InputGroup>
                              </div>
                            </Col>

                            {/* 3. Kampanyalı Fiyat (TL) */}
                            <Col md={4}>
                              <div className="bg-white p-3 rounded-3 border border-success-subtle shadow-xs">
                                <Form.Label className="small fw-bold text-success mb-1">
                                  Kampanyalı Fiyat (TL) <span className="text-danger">*</span>
                                </Form.Label>
                                <InputGroup>
                                  <Form.Control
                                    type="number"
                                    min={0}
                                    max={originalTL > 0 ? originalTL : undefined}
                                    step="any"
                                    value={campaignTLInput !== null ? campaignTLInput : (originalTL > 0 ? campaignTL : '')}
                                    onFocus={() => setCampaignTLInput(originalTL > 0 ? String(campaignTL) : '')}
                                    onBlur={() => setCampaignTLInput(null)}
                                    onChange={(e) => {
                                      let val = e.target.value;
                                      if (val === '') {
                                        setCampaignTLInput('');
                                        applyCampaignPriceTL(0);
                                        return;
                                      }
                                      let num = parseFloat(val);
                                      if (!isNaN(num)) {
                                        if (originalTL > 0 && num > originalTL) {
                                          num = originalTL;
                                          val = String(originalTL);
                                        } else if (num < 0) {
                                          num = 0;
                                          val = '0';
                                        }
                                        setCampaignTLInput(val);
                                        applyCampaignPriceTL(num);
                                      }
                                    }}
                                    placeholder="Örn: 200"
                                    className="fw-bold fs-5 text-success border-success"
                                  />
                                  <InputGroup.Text className="bg-success text-white fw-bold">₺</InputGroup.Text>
                                </InputGroup>
                              </div>
                            </Col>
                          </Row>

                          {/* Canlı Tek Paket Özet Şeridi */}
                          {originalTL > 0 && campaignTL >= 0 && (
                            <div className="mt-3 p-2 px-3 rounded-3 bg-white border border-success-subtle d-flex align-items-center gap-2 shadow-xs">
                              <span className="small text-muted fw-semibold">Müşteri Görünümü:</span>
                              {campaignTL < originalTL && (
                                <>
                                  <span className="text-muted text-decoration-line-through small">
                                    {formatMoney(values.originalAmountMinor || 0, values.currencyCode || 'TRY')}
                                  </span>
                                  <ArrowRight size={14} className="text-muted" />
                                </>
                              )}
                              <span className="fs-5 fw-bolder text-success">
                                {formatMoney(values.campaignAmountMinor || 0, values.currencyCode || 'TRY')}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* 2. DURUM: TÜM PAKETLERDE GEÇERLİ KAMPANYA (İndirim Türü ve Tutarı Yan Yana) */}
                          <div className="bg-white p-3 rounded-3 border shadow-xs">
                            <Row className="g-3">
                              {/* Sol Sütun: İndirim Türü */}
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="small fw-bold text-primary mb-1">
                                    İndirim Türü <span className="text-danger">*</span>
                                  </Form.Label>
                                  <div className="btn-group w-100" style={{ height: '42px' }}>
                                    <button
                                      type="button"
                                      className={`btn d-flex align-items-center justify-content-center text-nowrap px-2 fw-semibold ${allPackagesDiscountType === 'PERCENTAGE' ? 'btn-primary shadow-xs' : 'btn-outline-primary'}`}
                                      style={{ fontSize: '0.85rem' }}
                                      onClick={() => {
                                        setAllPackagesDiscountType('PERCENTAGE');
                                        const newNum = allPackagesDiscountValue > 100 || allPackagesDiscountValue <= 0 ? 20 : allPackagesDiscountValue;
                                        setAllPackagesDiscountValue(newNum);
                                        setAllPackagesDiscountInput(null);
                                        setFieldValue('badgeText', `%${newNum} İndirim`);
                                        if (!values.title || values.title.includes('İndirim Fırsatı!')) {
                                          setFieldValue('title', `%${newNum} İndirim Fırsatı!`);
                                        }
                                      }}
                                    >
                                      % Yüzde
                                    </button>
                                    <button
                                      type="button"
                                      className={`btn d-flex align-items-center justify-content-center text-nowrap px-2 fw-semibold ${allPackagesDiscountType === 'FIXED_AMOUNT' ? 'btn-primary shadow-xs' : 'btn-outline-primary'}`}
                                      style={{ fontSize: '0.85rem' }}
                                      onClick={() => {
                                        setAllPackagesDiscountType('FIXED_AMOUNT');
                                        const newNum = allPackagesDiscountValue <= 0 ? 50 : allPackagesDiscountValue;
                                        setAllPackagesDiscountValue(newNum);
                                        setAllPackagesDiscountInput(null);
                                        setFieldValue('badgeText', `₺${newNum} İndirim`);
                                        if (!values.title || values.title.includes('İndirim Fırsatı!')) {
                                          setFieldValue('title', `₺${newNum} İndirim Fırsatı!`);
                                        }
                                      }}
                                    >
                                      ₺ Sabit Tutar
                                    </button>
                                  </div>
                                </Form.Group>
                              </Col>

                              {/* Sağ Sütun: İndirim Tutarı / Oranı */}
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="small fw-bold text-primary mb-1">
                                    {allPackagesDiscountType === 'PERCENTAGE' ? 'İndirim Oranı (%)' : 'İndirim Tutarı (₺)'} <span className="text-danger">*</span>
                                  </Form.Label>
                                  <InputGroup style={{ height: '42px' }}>
                                    <Form.Control
                                      type="number"
                                      min={1}
                                      max={allPackagesDiscountType === 'PERCENTAGE' ? 100 : undefined}
                                      step="any"
                                      value={allPackagesDiscountInput !== null ? allPackagesDiscountInput : (allPackagesDiscountValue > 0 ? allPackagesDiscountValue : '')}
                                      onFocus={() => setAllPackagesDiscountInput(allPackagesDiscountValue > 0 ? String(allPackagesDiscountValue) : '')}
                                      onBlur={() => setAllPackagesDiscountInput(null)}
                                      onChange={(e) => {
                                        let val = e.target.value;
                                        if (val === '') {
                                          setAllPackagesDiscountInput('');
                                          setAllPackagesDiscountValue(0);
                                          setFieldValue('badgeText', '');
                                          return;
                                        }
                                        let num = parseFloat(val);
                                        if (!isNaN(num)) {
                                          if (allPackagesDiscountType === 'PERCENTAGE' && num > 100) {
                                            num = 100;
                                            val = '100';
                                          } else if (num < 0) {
                                            num = 0;
                                            val = '0';
                                          }
                                          setAllPackagesDiscountInput(val);
                                          setAllPackagesDiscountValue(num);
                                          const badge = allPackagesDiscountType === 'PERCENTAGE' ? `%${num} İndirim` : `₺${num} İndirim`;
                                          setFieldValue('badgeText', badge);
                                          if (!values.title || values.title.includes('İndirim Fırsatı!')) {
                                            setFieldValue('title', `${badge} Fırsatı!`);
                                          }
                                        }
                                      }}
                                      className="fw-bold fs-5 text-primary border-primary-subtle"
                                      placeholder={allPackagesDiscountType === 'PERCENTAGE' ? 'Örn: 20' : 'Örn: 50'}
                                    />
                                    <InputGroup.Text className="bg-primary text-white fw-bold">
                                      {allPackagesDiscountType === 'PERCENTAGE' ? '%' : '₺'}
                                    </InputGroup.Text>
                                  </InputGroup>
                                </Form.Group>
                              </Col>
                            </Row>
                          </div>

                          {/* Aktif Paketlerdeki Müşteri Fiyat Yansıması */}
                          <div className="mt-3 p-3 rounded-3 bg-white border border-success-subtle shadow-xs">
                            <div className="small text-muted fw-bold mb-2 d-flex align-items-center gap-1">
                              <CheckCircle size={15} className="text-success" />
                              <span>Tüm Aktif Paketlerde Kampanya Fiyat Yansıması:</span>
                            </div>
                            <div className="d-flex flex-column gap-2">
                              {activePackages.map((pkg) => {
                                const pMinor = pkg.displayPrice?.amountMinor || 0;
                                const pTL = pMinor / 100;
                                let discTL = 0;
                                if (allPackagesDiscountType === 'PERCENTAGE') {
                                  discTL = Math.round(pTL * ((allPackagesDiscountValue || 0) / 100) * 100) / 100;
                                } else {
                                  discTL = Math.min(pTL, allPackagesDiscountValue || 0);
                                }
                                const finalTL = Math.max(0, Math.round((pTL - discTL) * 100) / 100);

                                return (
                                  <div
                                    key={pkg.code}
                                    className="d-flex align-items-center justify-content-between p-2 px-3 rounded bg-light-subtle border small flex-wrap gap-2"
                                  >
                                    <span className="fw-semibold text-dark">{pkg.displayName}</span>
                                    <div className="d-flex align-items-center gap-2">
                                      <span className="text-muted text-decoration-line-through">
                                        {formatMoney(pMinor, 'TRY')}
                                      </span>
                                      <ArrowRight size={13} className="text-muted" />
                                      <span className="fw-bold text-success fs-6">
                                        {formatMoney(Math.round(finalTL * 100), 'TRY')}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </Card.Body>
                </Card>

                {/* 2. Bölüm: Kampanya Tanımı & Tarih */}
                <Card className="border shadow-sm">
                  <Card.Header className="bg-light fw-bold py-2 d-flex align-items-center gap-2">
                    <span className="badge bg-primary rounded-pill">2</span>
                    Kampanya Bilgileri & Süresi
                  </Card.Header>
                  <Card.Body className="p-3">
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">
                            Kampanya Adı <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            isInvalid={touched.name && Boolean(errors.name)}
                            placeholder="Örn: Bahar Fırsatı Kampanyası"
                          />
                          <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">
                            Görsel Başlık <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            name="title"
                            value={values.title}
                            onChange={handleChange}
                            isInvalid={touched.title && Boolean(errors.title)}
                            placeholder="Örn: %30 İndirim Fırsatı!"
                          />
                          <Form.Control.Feedback type="invalid">{errors.title}</Form.Control.Feedback>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">
                            Başlangıç Tarihi <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            type="date"
                            name="startsAt"
                            value={values.startsAt}
                            onChange={handleChange}
                            isInvalid={touched.startsAt && Boolean(errors.startsAt)}
                          />
                          <Form.Control.Feedback type="invalid">{errors.startsAt}</Form.Control.Feedback>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Bitiş Tarihi</Form.Label>
                          <Form.Control
                            type="date"
                            name="endsAt"
                            value={values.endsAt ?? ''}
                            onChange={handleChange}
                            isInvalid={touched.endsAt && Boolean(errors.endsAt)}
                          />
                          <Form.Text className="text-muted">Süresiz ise boş bırakabilirsiniz.</Form.Text>
                        </Form.Group>
                      </Col>

                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Kampanya Açıklaması</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            name="description"
                            value={values.description ?? ''}
                            onChange={handleChange}
                            placeholder="Kullanıcıların göreceği kampanya detayları..."
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <div className="pt-2 d-flex flex-column gap-2">
                  <Button
                    disabled={(!isNew && !dirty) || !isValid || isSubmitting}
                    variant="outline-primary"
                    type="button"
                    className="w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                    style={{
                      opacity: (!isNew && !dirty) || !isValid || isSubmitting ? 0.45 : 1,
                      transition: 'all 0.2s ease',
                      cursor: (!isNew && !dirty) || !isValid || isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                    onClick={async () => {
                      const validationErrors = await validateForm();
                      if (Object.keys(validationErrors).length > 0) {
                        handleSubmit();
                        return;
                      }
                      if (isNew) {
                        setShowCreateConfirm(true);
                      } else {
                        setShowUpdateConfirm(true);
                      }
                    }}
                  >
                    <CheckCircle size={16} />
                    <span>{isNew ? 'Kampanyayı Başlat' : 'Değişiklikleri Kaydet'}</span>
                  </Button>
                  {!isNew && selectedCampaign && (
                    <Button
                      type="button"
                      variant={selectedCampaign.isActive ? 'outline-warning' : 'outline-success'}
                      disabled={isSubmitting}
                      className="w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                      onClick={() => setShowToggleActiveConfirm(true)}
                    >
                      {selectedCampaign.isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                      <span>{selectedCampaign.isActive ? 'Kampanyayı Pasife Al' : 'Kampanyayı Aktifleştir'}</span>
                    </Button>
                  )}

                  {!isNew && (
                    <Button
                      variant="outline-danger"
                      type="button"
                      disabled={isSubmitting}
                      className="w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 size={16} />
                      <span>Kampanyayı Sil</span>
                    </Button>
                  )}
                </div>

                <ConfirmModal
                  show={showCreateConfirm}
                  onHide={() => setShowCreateConfirm(false)}
                  onConfirm={async () => {
                    setShowCreateConfirm(false);
                    handleSubmit();
                  }}
                  type="create"
                  title="Kampanyayı Başlat"
                  message="Yeni kampanyayı oluşturup yayına almak istediğinizden emin misiniz?"
                  confirmText="Evet, Başlat"
                  isLoading={isSubmitting}
                />

                <ConfirmModal
                  show={showUpdateConfirm}
                  onHide={() => setShowUpdateConfirm(false)}
                  onConfirm={async () => {
                    setShowUpdateConfirm(false);
                    handleSubmit();
                  }}
                  type="update"
                  title="Değişiklikleri Kaydet"
                  message="Kampanya üzerinde yapılan değişiklikleri kaydetmek istediğinizden emin misiniz?"
                  confirmText="Evet, Kaydet"
                  isLoading={isSubmitting}
                />

                {selectedCampaign && (
                  <ConfirmModal
                    show={showToggleActiveConfirm}
                    onHide={() => setShowToggleActiveConfirm(false)}
                    onConfirm={async () => {
                      setIsTogglingActive(true);
                      try {
                        if (onToggleActive) {
                          await onToggleActive(selectedCampaign);
                        }
                        setShowToggleActiveConfirm(false);
                      } finally {
                        setIsTogglingActive(false);
                      }
                    }}
                    type={selectedCampaign.isActive ? 'warning' : 'success'}
                    title={selectedCampaign.isActive ? 'Kampanyayı Pasife Al' : 'Kampanyayı Aktifleştir'}
                    message={
                      selectedCampaign.isActive ? (
                        <span>
                          <strong className="text-dark">"{selectedCampaign.name}"</strong> kampanyasını pasife almak istediğinizden emin misiniz? Kullanıcılar bu kampanyadan yararlanamayacaktır.
                        </span>
                      ) : (
                        <span>
                          <strong className="text-dark">"{selectedCampaign.name}"</strong> kampanyasını aktifleştirmek istediğinizden emin misiniz?
                        </span>
                      )
                    }
                    confirmText={selectedCampaign.isActive ? 'Evet, Pasife Al' : 'Evet, Aktifleştir'}
                    isLoading={isTogglingActive}
                  />
                )}
              </Form>
            );
          }}
        </Formik>
        {showDeleteConfirm && (
          <DeleteModal
            title="Kampanyayı Sil"
            message={`"${selectedCampaign?.name}" adlı kampanyayı silmek istediğinizden emin misiniz?`}
            onClose={() => setShowDeleteConfirm(false)}
            onHandleDelete={() => {
              setShowDeleteConfirm(false);
              onDelete?.();
            }}
          />
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function CampaignsSection() {
  const [{ data, isLoading, isError, refetch, goNext, goPrev, canGoPrev, canGoNext, pageIndex }] =
    useCursorApi<CampaignResponse>({
      service: campaignService,
      pageSize: 20,
    });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [packages, setPackages] = useState<PackageResponse[]>([]);
  const handleDeleteCampaign = async (campaign: CampaignResponse) => {
    try {
      await campaignService.delete(campaign.id);
      toast.success('Kampanya başarıyla silindi.');
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Kampanya silinirken bir hata oluştu.');
    }
  };

  useEffect(() => {
    packageService
      .search({ filter: '', pageRequest: { page: 0, size: 200, sort: [{ direction: 'ASC', property: 'sortOrder' }] } })
      .then((page) => setPackages(page.content ?? []))
      .catch((error) => toast.error(getErrorMessage(error)));
  }, []);

  const handleToggleActiveCampaign = async (campaign: CampaignResponse) => {
    try {
      await campaignService.update({
        identifier: campaign.id,
        expectedVersion: campaign.version,
        name: campaign.name,
        eventType: campaign.eventType || 'PACKAGE_UPGRADE',
        sourcePackageCode: campaign.sourcePackageCode ?? '',
        targetPackageCode: campaign.targetPackageCode ?? '',
        title: campaign.title,
        description: campaign.description ?? '',
        emailSubject: campaign.emailSubject ?? '',
        emailHeading: campaign.emailHeading ?? '',
        emailBody: campaign.emailBody ?? '',
        emailProviderTemplateId: campaign.emailProviderTemplateId ?? '',
        ctaLabel: campaign.ctaLabel ?? '',
        ctaUrl: campaign.ctaUrl ?? '',
        badgeText: campaign.badgeText ?? '',
        imageAssetId: campaign.imageAssetId ?? '',
        originalAmountMinor: campaign.originalPrice?.amountMinor,
        campaignAmountMinor: campaign.campaignPrice?.amountMinor,
        currencyCode: campaign.currencyCode || 'TRY',
        startsAt: toDateInputValue(campaign.startsAt),
        endsAt: toDateInputValue(campaign.endsAt),
        isActive: !campaign.isActive,
      });
      toast.success(campaign.isActive ? 'Kampanya pasife alındı.' : 'Kampanya başarıyla aktifleştirildi.');
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Kampanya durumu güncellenirken bir hata oluştu.');
    }
  };

  const openCampaignModal = (campaign?: CampaignResponse) => {
    openModal(
      <CampaignModal
        selectedCampaign={campaign}
        packages={packages}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={campaign ? () => handleDeleteCampaign(campaign) : undefined}
        onToggleActive={campaign ? () => handleToggleActiveCampaign(campaign) : undefined}
      />
    );
  };

  const handleSave = async (values: CampaignRequest) => {
    try {
      const payload: CampaignRequest = {
        ...values,
        emailBody: sanitizeRichHtml(values.emailBody ?? '') || undefined,
      };
      if (payload.identifier) {
        await campaignService.update(payload);
        toast.success('Kampanya başarıyla güncellendi.');
      } else {
        await campaignService.create(payload);
        toast.success('Kampanya başarıyla oluşturuldu ve yayına alındı.');
      }
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const rows = data?.content ?? [];
  const activeCount = rows.filter((c) => c.isActive).length;

  const content = rows.map((campaign) => {
    const targetPkg = packages.find(
      (p) => p.code === campaign.targetPackageCode || p.code === campaign.sourcePackageCode
    );
    const orig = campaign.originalPrice?.amountMinor;
    const camp = campaign.campaignPrice?.amountMinor;
    const hasCamp = typeof camp === 'number' && !isNaN(camp);
    const hasOrig = typeof orig === 'number' && !isNaN(orig);
    const discountPercent =
      hasOrig && hasCamp && orig > 0 && camp < orig
        ? Math.round(((orig - camp) / orig) * 100)
        : null;

    return (
      <tr key={campaign.id}>
        <td>
          <div className="fw-bold text-dark">{campaign.name}</div>
          <div className="small text-muted">{campaign.title}</div>
        </td>
        <td>
          {targetPkg ? (
            <Badge bg="primary" className="fw-semibold px-2 py-1">
              {targetPkg.displayName}
            </Badge>
          ) : campaign.targetPackageCode ? (
            <Badge bg="secondary" className="fw-semibold px-2 py-1">
              {campaign.targetPackageCode}
            </Badge>
          ) : (
            <Badge bg="light" text="dark" className="border fw-semibold px-2 py-1">
              Tüm Paketler
            </Badge>
          )}
        </td>
        <td>
          {discountPercent != null ? (
            <Badge bg="success" className="fw-bold">
              %{discountPercent} İndirim
            </Badge>
          ) : campaign.badgeText ? (
            <Badge bg="success" className="fw-bold">
              {campaign.badgeText}
            </Badge>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>
        <td>
          {hasCamp ? (
            <div className="d-flex flex-column">
              {hasOrig && orig !== camp ? (
                <span className="text-decoration-line-through text-muted small">
                  {formatMoney(orig, campaign.currencyCode || 'TRY')}
                </span>
              ) : null}
              <span className="fw-bold text-success fs-6">
                {formatMoney(camp, campaign.currencyCode || 'TRY')}
              </span>
            </div>
          ) : hasOrig ? (
            <span className="fw-bold text-dark">
              {formatMoney(orig, campaign.currencyCode || 'TRY')}
            </span>
          ) : (
            <span className="text-muted">Pakete Göre</span>
          )}
        </td>
        <td>
          <div className="d-flex align-items-center gap-2 text-dark fw-medium" style={{ fontSize: '0.875rem' }}>
            <Calendar size={15} className="text-primary flex-shrink-0" />
            <span>
              {formatDateForText(campaign.startsAt)}
              {campaign.endsAt ? (
                <> <span className="text-muted">→</span> {formatDateForText(campaign.endsAt)}</>
              ) : (
                <span className="text-muted ms-1 small">(Süresiz)</span>
              )}
            </span>
          </div>
        </td>
        <td>
          <StatusBadge status={campaign.isActive ? 'ACTIVE' : 'INACTIVE'} />
        </td>
        <td className="text-end">
          <Button
            size="sm"
            variant="outline-primary"
            className="d-inline-flex align-items-center gap-1"
            onClick={() => openCampaignModal(campaign)}
            title="Kampanyayı Düzenle"
          >
            <Edit size={14} />
            <span>Düzenle</span>
          </Button>
        </td>
      </tr>
    );
  });

  return (
    <>
      <Row className="mb-2">
        <Col lg={12}>
          <PageHeading
            heading="Kampanyalar"
            createButtonText="Kampanya Ekle"
            onCreate={() => openCampaignModal(undefined)}
          />
        </Col>
      </Row>

      {/* Özet Kartlar */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center gap-3 py-3">
              <div
                className="rounded-3 p-3 bg-light-primary text-primary d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px' }}
              >
                <Tag size={22} />
              </div>
              <div>
                <h6 className="text-muted mb-0 small">Toplam Kampanya</h6>
                <h4 className="fw-bold mb-0 text-dark">{rows.length}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center gap-3 py-3">
              <div
                className="rounded-3 p-3 bg-light-success text-success d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px' }}
              >
                <CheckCircle size={22} />
              </div>
              <div>
                <h6 className="text-muted mb-0 small">Aktif Kampanyalar</h6>
                <h4 className="fw-bold mb-0 text-success">{activeCount}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center gap-3 py-3">
              <div
                className="rounded-3 p-3 bg-light-warning text-warning d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px' }}
              >
                <Percent size={22} />
              </div>
              <div>
                <h6 className="text-muted mb-0 small">İndirimli Paketler</h6>
                <h4 className="fw-bold mb-0 text-dark">
                  {new Set(rows.filter((c) => c.targetPackageCode).map((c) => c.targetPackageCode)).size} Paket
                </h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {isModalOpen && modalContent}
      {isLoading && <Loading />}
      {!isLoading && isError && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Kampanyalar yüklenirken bir hata oluştu.</span>
          <Button size="sm" variant="outline-danger" onClick={() => refetch()}>
            Tekrar Dene
          </Button>
        </Alert>
      )}
      {!isLoading && !isError && rows.length === 0 && (
        <Alert variant="light" className="border text-center p-5">
          <Tag size={40} className="text-muted mb-3 d-block mx-auto opacity-50" />
          <h5 className="fw-bold text-dark">Henüz indirimli kampanya tanımlanmamış</h5>
          <p className="text-muted mb-3 small">
            Premium paketler için indirim kampanyası oluşturarak tüm kullanıcılarınıza avantajlı fiyatlar sunabilirsiniz.
          </p>
          <Button variant="primary" onClick={() => openCampaignModal(undefined)}>
            İlk Kampanyayı Oluştur
          </Button>
        </Alert>
      )}
      {!isLoading && !isError && rows.length > 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <PrepareTable headItems={headItems} content={content} page={undefined} onHandlePageChange={() => undefined} />
            <div className="p-3 border-top">
              <CursorPagination
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                onPrev={goPrev}
                onNext={goNext}
                pageIndex={pageIndex}
              />
            </div>
          </Card.Body>
        </Card>
      )}
    </>
  );
}
