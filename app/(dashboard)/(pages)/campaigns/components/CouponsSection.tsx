"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Offcanvas, Row } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText, toDateInputValue, toApiDateStart, toApiDateEnd } from '@/helpers/DateUtils';
import { formatMoney, getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { couponService, CouponResponse, CreateCouponPayload, UpdateCouponPayload } from '@/services/coupon.service';
import { packageService, PackageResponse } from '@/services/package.service';
import DeleteModal from '@/components/DeleteModal';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';
import { Edit, Copy, Check, Percent, Users, CheckCircle, RefreshCw, Trash2, Calendar, ArrowRight } from 'react-feather';

const headItems = [
  'Kupon Kodu & Adı',
  'İndirim',
  'Geçerli Paket',
  'Kullanım Durumu',
  'Geçerlilik Tarihi',
  'Durum',
  '',
];

function generateRandomCouponCode(): string {
  const prefixes = ['HRD', 'VIP', 'BAHAR', 'FIRSAT', 'OZEL', 'YAZ', 'HARA'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${randomChars}`;
}

interface CouponFormValues {
  code: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number | string;
  maxUses: number | string;
  maxUsesPerUser: number | string;
  applicablePackageCode: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

function CouponFormModal({
  coupon,
  packages,
  onClose,
  onSave,
  onDelete,
}: {
  coupon?: CouponResponse;
  packages: PackageResponse[];
  onClose: () => void;
  onSave: (values: CreateCouponPayload | UpdateCouponPayload) => Promise<void>;
  onDelete?: () => Promise<void> | void;
}) {
  const isEdit = Boolean(coupon);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [percentInput, setPercentInput] = useState<string | null>(null);
  const [discountTLInput, setDiscountTLInput] = useState<string | null>(null);
  const [campaignTLInput, setCampaignTLInput] = useState<string | null>(null);

  const initialValues: CouponFormValues = {
    code: coupon?.code ?? '',
    name: coupon?.name ?? '',
    discountType: coupon?.discountType ?? 'PERCENTAGE',
    discountValue: coupon?.discountValue
      ? coupon.discountType === 'FIXED_AMOUNT'
        ? coupon.discountValue / 100
        : coupon.discountValue
      : 20,
    maxUses: coupon?.maxUses ?? '',
    maxUsesPerUser: coupon?.maxUsesPerUser ?? '',
    applicablePackageCode: coupon?.applicablePackageCode ?? '',
    startsAt: coupon?.startsAt
      ? toDateInputValue(coupon.startsAt)
      : toDateInputValue(new Date().toISOString()),
    endsAt: coupon?.endsAt ? toDateInputValue(coupon.endsAt) : '',
    isActive: coupon?.isActive ?? true,
  };

  const schema = Yup.object().shape({
    code: Yup.string().required('Kupon kodu zorunludur.'),
    name: Yup.string().required('Kupon adı zorunludur.'),
    discountType: Yup.string().oneOf(['PERCENTAGE', 'FIXED_AMOUNT']).required(),
    discountValue: Yup.number()
      .positive("İndirim değeri 0'dan büyük olmalıdır.")
      .when('discountType', {
        is: 'PERCENTAGE',
        then: (schema) => schema.max(100, 'Yüzdesel indirim azami 100 olabilir.'),
      })
      .required('İndirim değeri zorunludur.'),
    maxUsesPerUser: Yup.number()
      .min(1, 'Kullanıcı başı limit 1 veya üzeri olmalıdır.')
      .nullable()
      .transform((val, orig) => (orig === '' ? null : val)),
    startsAt: Yup.string().required('Başlangıç tarihi zorunludur.'),
    endsAt: Yup.string().test('end-after-start', 'Bitiş başlangıçtan sonra veya aynı gün olmalıdır.', function (end) {
      const { startsAt } = this.parent as { startsAt?: string };
      if (!end || !startsAt) {
        return true;
      }
      return end >= startsAt;
    }),
  });

  return (
    <Offcanvas show placement="end" onHide={onClose} scroll style={{ width: 'min(720px, 100vw)' }}>
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title className="fw-bold d-flex align-items-center gap-2">
          <Percent className="text-primary" size={20} />
          {isEdit ? 'Kuponu Düzenle' : 'Yeni İndirim Kuponu Ekle'}
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="p-4">
        <Formik
          initialValues={initialValues}
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              const startsAtIso = toApiDateStart(values.startsAt) || new Date().toISOString();
              const endsAtIso = values.endsAt ? toApiDateEnd(values.endsAt) ?? null : null;

              const payloadBase = {
                name: values.name.trim(),
                discountType: values.discountType,
                discountValue:
                  values.discountType === 'FIXED_AMOUNT'
                    ? Math.round(Number(values.discountValue) * 100)
                    : Number(values.discountValue),
                maxUses: values.maxUses ? Number(values.maxUses) : null,
                maxUsesPerUser: values.maxUsesPerUser ? Number(values.maxUsesPerUser) : 1,
                minSpendAmountMinor: null,
                applicablePackageCode: values.applicablePackageCode ? values.applicablePackageCode : null,
                startsAt: startsAtIso,
                endsAt: endsAtIso,
              };

              if (isEdit && coupon) {
                await onSave({
                  ...payloadBase,
                  expectedVersion: coupon.version,
                  isActive: values.isActive,
                } as UpdateCouponPayload);
              } else {
                await onSave({
                  ...payloadBase,
                  code: values.code.trim().toUpperCase(),
                } as CreateCouponPayload);
              }
            } catch (err) {
              toast.error(getErrorMessage(err));
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ handleSubmit, handleChange, setFieldValue, values, errors, touched, isSubmitting }) => {
            const activePackages = packages.filter((p) => p.isActive);
            const selectedPackage = packages.find((p) => p.code === values.applicablePackageCode);
            const isSpecificPackage = Boolean(selectedPackage?.displayPrice?.amountMinor);
            const originalTL = isSpecificPackage
              ? selectedPackage!.displayPrice!.amountMinor / 100
              : 0;

            const discountTL = isSpecificPackage
              ? values.discountType === 'FIXED_AMOUNT'
                ? Math.min(originalTL, Number(values.discountValue) || 0)
                : Math.round(originalTL * ((Number(values.discountValue) || 0) / 100) * 100) / 100
              : 0;

            const discountPercent = isSpecificPackage
              ? values.discountType === 'PERCENTAGE'
                ? Math.min(100, Number(values.discountValue) || 0)
                : originalTL > 0
                  ? Math.min(100, Math.round(((Number(values.discountValue) || 0) / originalTL) * 100))
                  : 0
              : 0;

            const campaignTL = isSpecificPackage
              ? Math.max(0, Math.round((originalTL - discountTL) * 100) / 100)
              : 0;

            const applyDiscountPercent = (percent: number) => {
              const clamped = Math.min(100, Math.max(0, percent));
              setFieldValue('discountType', 'PERCENTAGE');
              setFieldValue('discountValue', clamped);
            };

            const applyDiscountTL = (disc: number) => {
              const clamped = Math.min(originalTL, Math.max(0, disc));
              setFieldValue('discountType', 'FIXED_AMOUNT');
              setFieldValue('discountValue', clamped);
            };

            const applyCampaignPriceTL = (camp: number) => {
              const clamped = Math.min(originalTL, Math.max(0, camp));
              const disc = Math.max(0, Math.round((originalTL - clamped) * 100) / 100);
              setFieldValue('discountType', 'FIXED_AMOUNT');
              setFieldValue('discountValue', disc);
            };

            return (
              <Form noValidate onSubmit={handleSubmit} className="d-flex flex-column gap-4">
                {/* 1. Bölüm: İndirim ve Geçerli Paket Belirleme */}
                <Card className="border shadow-sm">
                  <Card.Header className="bg-light fw-bold py-2 d-flex align-items-center gap-2">
                    <span className="badge bg-primary rounded-pill">1</span>
                    İndirim Uygulanacak Premium Paket & Fiyat
                  </Card.Header>
                  <Card.Body className="p-3">
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Hangi Premium Pakette Geçerli Olsun?</Form.Label>
                      <Form.Select
                        name="applicablePackageCode"
                        value={values.applicablePackageCode}
                        onChange={(e) => {
                          handleChange(e);
                          const pkg = packages.find((p) => p.code === e.target.value);
                          if (pkg?.displayPrice?.amountMinor && values.discountType === 'FIXED_AMOUNT') {
                            const pTL = pkg.displayPrice.amountMinor / 100;
                            if (Number(values.discountValue) > pTL) {
                              setFieldValue('discountValue', Math.round(pTL * 0.2));
                            }
                          }
                        }}
                        className="form-select-lg fs-6"
                      >
                        <option value="">✨ Tüm Paketlerde Geçerli</option>
                        {packages
                          .filter((pkg) => pkg.isActive || pkg.code === values.applicablePackageCode)
                          .map((pkg) => (
                            <option key={pkg.code} value={pkg.code}>
                              {pkg.displayName} — Normal Fiyat:{' '}
                              {pkg.displayPrice?.amountMinor
                                ? formatMoney(pkg.displayPrice.amountMinor, 'TRY')
                                : 'Ücretsiz'}
                            </option>
                          ))}
                      </Form.Select>
                    </Form.Group>

                    <div className="mt-3 p-3 rounded-3 border bg-light-subtle">
                      {isSpecificPackage ? (
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
                                    onFocus={() => setDiscountTLInput(discountTL > 0 ? String(discountTL) : '')}
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

                            {/* 3. Kuponlu Fiyat (TL) */}
                            <Col md={4}>
                              <div className="bg-white p-3 rounded-3 border border-success-subtle shadow-xs">
                                <Form.Label className="small fw-bold text-success mb-1">
                                  Kuponlu Fiyat (TL) <span className="text-danger">*</span>
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
                                        if (num > originalTL) {
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
                          {originalTL > 0 && (
                            <div className="mt-3 p-2 px-3 rounded-3 bg-white border border-success-subtle d-flex align-items-center justify-content-between gap-2 shadow-xs flex-wrap">
                              <div className="d-flex align-items-center gap-2">
                                <span className="small text-muted fw-semibold">Müşteri Görünümü:</span>
                                {campaignTL < originalTL && (
                                  <>
                                    <span className="text-muted text-decoration-line-through small">
                                      {formatMoney(Math.round(originalTL * 100), 'TRY')}
                                    </span>
                                    <ArrowRight size={14} className="text-muted" />
                                  </>
                                )}
                                <span className="fs-5 fw-bolder text-success">
                                  {formatMoney(Math.round(campaignTL * 100), 'TRY')}
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* 2. DURUM: TÜM PAKETLERDE GEÇERLİ KUPON (İndirim Türü ve Tutarı Yan Yana) */}
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
                                      className={`btn d-flex align-items-center justify-content-center text-nowrap px-2 fw-semibold ${values.discountType === 'PERCENTAGE' ? 'btn-primary shadow-xs' : 'btn-outline-primary'}`}
                                      style={{ fontSize: '0.85rem' }}
                                      onClick={() => {
                                        setFieldValue('discountType', 'PERCENTAGE');
                                        if (Number(values.discountValue) > 100 || !values.discountValue) {
                                          setFieldValue('discountValue', 20);
                                        }
                                      }}
                                    >
                                      % Yüzde
                                    </button>
                                    <button
                                      type="button"
                                      className={`btn d-flex align-items-center justify-content-center text-nowrap px-2 fw-semibold ${values.discountType === 'FIXED_AMOUNT' ? 'btn-primary shadow-xs' : 'btn-outline-primary'}`}
                                      style={{ fontSize: '0.85rem' }}
                                      onClick={() => {
                                        setFieldValue('discountType', 'FIXED_AMOUNT');
                                        if (Number(values.discountValue) < 10) {
                                          setFieldValue('discountValue', 50);
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
                                    {values.discountType === 'PERCENTAGE' ? 'İndirim Oranı (%)' : 'İndirim Tutarı (₺)'} <span className="text-danger">*</span>
                                  </Form.Label>
                                  <InputGroup style={{ height: '42px' }}>
                                    <Form.Control
                                      type="number"
                                      min={0}
                                      max={values.discountType === 'PERCENTAGE' ? 100 : undefined}
                                      step="any"
                                      name="discountValue"
                                      value={values.discountValue}
                                      onChange={handleChange}
                                      isInvalid={touched.discountValue && Boolean(errors.discountValue)}
                                      className="fw-bold fs-5 text-primary border-primary-subtle"
                                      placeholder={values.discountType === 'PERCENTAGE' ? 'Örn: 20' : 'Örn: 50'}
                                    />
                                    <InputGroup.Text className="bg-primary text-white fw-bold">
                                      {values.discountType === 'PERCENTAGE' ? '%' : '₺'}
                                    </InputGroup.Text>
                                  </InputGroup>
                                  <Form.Control.Feedback type="invalid">{errors.discountValue}</Form.Control.Feedback>
                                </Form.Group>
                              </Col>
                            </Row>
                          </div>

                          {/* Aktif Paketlerdeki Müşteri Fiyat Yansıması */}
                          <div className="mt-3 p-3 rounded-3 bg-white border border-success-subtle shadow-xs">
                            <div className="small text-muted fw-bold mb-2 d-flex align-items-center gap-1">
                              <CheckCircle size={15} className="text-success" />
                              <span>Tüm Aktif Paketlerde Kupon Fiyat Yansıması:</span>
                            </div>
                            <div className="d-flex flex-column gap-2">
                              {activePackages.map((pkg) => {
                                const pMinor = pkg.displayPrice?.amountMinor || 0;
                                const pTL = pMinor / 100;
                                let discTL = 0;
                                if (values.discountType === 'PERCENTAGE') {
                                  discTL = Math.round(pTL * ((Number(values.discountValue) || 0) / 100) * 100) / 100;
                                } else {
                                  discTL = Math.min(pTL, Number(values.discountValue) || 0);
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

                {/* 2. Bölüm: Kupon Kodu ve Kullanım Limitleri */}
                <Card className="border shadow-sm">
                  <Card.Header className="bg-light fw-bold py-2 d-flex align-items-center gap-2">
                    <span className="badge bg-primary rounded-pill">2</span>
                    Kupon Kodu ve Kullanım Limitleri
                  </Card.Header>
                  <Card.Body className="p-3">
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        Kupon Kodu <span className="text-danger">*</span>
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type="text"
                          name="code"
                          disabled={isEdit}
                          value={values.code}
                          onChange={(e) => setFieldValue('code', e.target.value.toUpperCase())}
                          isInvalid={touched.code && Boolean(errors.code)}
                          placeholder="Örn: HARADAN2026"
                          className="fw-bold fs-5 text-primary text-uppercase font-monospace"
                        />
                        {!isEdit && (
                          <Button
                            variant="outline-primary"
                            type="button"
                            onClick={() => setFieldValue('code', generateRandomCouponCode())}
                            title="Rastgele Kupon Kodu Üret"
                            className="d-flex align-items-center gap-1 fw-semibold"
                          >
                            <RefreshCw size={15} />
                            <span>Kod Üret</span>
                          </Button>
                        )}
                      </InputGroup>
                      <Form.Control.Feedback type="invalid">{errors.code}</Form.Control.Feedback>
                    </Form.Group>

                    <Row className="g-3 pt-2 border-top">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Toplam Kullanım Limiti</Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            name="maxUses"
                            value={values.maxUses}
                            onChange={handleChange}
                            placeholder="Sınırsız için boş bırakın"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Kişi Başı Azami Kullanım</Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            name="maxUsesPerUser"
                            value={values.maxUsesPerUser}
                            onChange={handleChange}
                            placeholder="Varsayılan: 1"
                            isInvalid={touched.maxUsesPerUser && Boolean(errors.maxUsesPerUser)}
                          />
                          <Form.Control.Feedback type="invalid">{errors.maxUsesPerUser}</Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* 3. Bölüm: Kupon Başlığı, Geçerlilik Tarihi ve Durum */}
                <Card className="border shadow-sm">
                  <Card.Header className="bg-light fw-bold py-2 d-flex align-items-center gap-2">
                    <span className="badge bg-primary rounded-pill">3</span>
                    Kupon Başlığı, Geçerlilik Süresi & Durum
                  </Card.Header>
                  <Card.Body className="p-3">
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        Kupon Adı / Kampanya Başlığı <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        isInvalid={touched.name && Boolean(errors.name)}
                        placeholder="Örn: Bahar Fırsatına Özel %20 İndirim"
                      />
                      <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                    </Form.Group>

                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">
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
                          <Form.Label className="small fw-semibold">Bitiş Tarihi</Form.Label>
                          <Form.Control
                            type="date"
                            name="endsAt"
                            value={values.endsAt}
                            onChange={handleChange}
                            isInvalid={touched.endsAt && Boolean(errors.endsAt)}
                          />
                          <Form.Control.Feedback type="invalid">{errors.endsAt}</Form.Control.Feedback>
                          <Form.Text className="text-muted small">Süresiz ise boş bırakabilirsiniz.</Form.Text>
                        </Form.Group>
                      </Col>

                      {isEdit && (
                        <Col md={12}>
                          <div className="pt-2 border-top">
                            <Form.Check
                              type="switch"
                              id="coupon-active-switch"
                              name="isActive"
                              label="Kupon Aktif (Kullanıcılar kuponu kullanabilir)"
                              checked={values.isActive}
                              onChange={handleChange}
                              className="fw-semibold text-primary"
                            />
                          </div>
                        </Col>
                      )}
                    </Row>
                  </Card.Body>
                </Card>

                {/* Alt Aksiyon Butonları */}
                <div className="pt-2 d-flex flex-column gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="w-100 py-2 fs-6 fw-bold"
                  >
                    {isEdit ? 'Değişiklikleri Güncelle' : 'Kuponu Oluştur ve Yayınla'}
                  </Button>
                  {isEdit && (
                    <Button
                      type="button"
                      variant="outline-danger"
                      disabled={isSubmitting}
                      className="w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 size={16} />
                      <span>Kuponu Sil</span>
                    </Button>
                  )}
                </div>
              </Form>
            );
          }}
        </Formik>

        {showDeleteConfirm && (
          <DeleteModal
            title="Kuponu Sil"
            message={`"${coupon?.name || coupon?.code}" adlı kuponu silmek istediğinizden emin misiniz?`}
            onClose={() => setShowDeleteConfirm(false)}
            onHandleDelete={async () => {
              setShowDeleteConfirm(false);
              if (onDelete) {
                await onDelete();
              }
            }}
          />
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function CouponsSection() {
  const [{ data, isLoading, isError, refetch, handlePageChange, handleFilter }] = useApi<CouponResponse>({
    service: couponService,
    params: {
      filter: '',
      pageRequest: {
        page: 0,
        size: 100,
      },
    },
  });

  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [packages, setPackages] = useState<PackageResponse[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleDeleteCoupon = async (coupon: CouponResponse) => {
    try {
      await couponService.delete(coupon.id);
      toast.success('Kupon başarıyla silindi.');
      closeModal();
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Kupon silinirken bir hata oluştu.');
    }
  };

  useEffect(() => {
    packageService
      .search({ filter: '', pageRequest: { page: 0, size: 100, sort: [{ direction: 'ASC', property: 'sortOrder' }] } })
      .then((res) => setPackages(res.content ?? []))
      .catch((err) => toast.error(getErrorMessage(err)));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilter(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    handleFilter('');
  };

  const hasActiveFilters = Boolean(searchQuery.trim());

  const filteredCoupons = useMemo(() => {
    const raw = data?.content ?? [];
    if (!searchQuery.trim()) return raw;
    const q = searchQuery.trim().toLowerCase();
    return raw.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.applicablePackageCode && c.applicablePackageCode.toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  const handleCreate = async (payload: CreateCouponPayload | UpdateCouponPayload) => {
    await couponService.create(payload as CreateCouponPayload);
    toast.success('Kupon başarıyla oluşturuldu ve yayına alındı.');
    closeModal();
    refetch();
  };

  const handleUpdate = async (id: string, payload: UpdateCouponPayload) => {
    await couponService.update(id, payload);
    toast.success('Kupon başarıyla güncellendi.');
    closeModal();
    refetch();
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      toast.success(`"${code}" kupon kodu panoya kopyalandı!`);
      setTimeout(() => setCopiedCode(null), 2500);
    });
  };

  const openCreateModal = () => {
    openModal(
      <CouponFormModal
        packages={packages}
        onClose={closeModal}
        onSave={handleCreate}
      />
    );
  };

  const openEditModal = (coupon: CouponResponse) => {
    openModal(
      <CouponFormModal
        coupon={coupon}
        packages={packages}
        onClose={closeModal}
        onSave={(payload) => handleUpdate(coupon.id, payload as UpdateCouponPayload)}
        onDelete={() => handleDeleteCoupon(coupon)}
      />
    );
  };

  const allCoupons = data?.content ?? [];
  const totalUsesCount = allCoupons.reduce((sum, c) => sum + (c.usesCount || 0), 0);
  const activeCouponsCount = allCoupons.filter((c) => c.isActive).length;

  const content = filteredCoupons.map((c) => {
    const pkg = packages.find((p) => p.code === c.applicablePackageCode);
    const isCopied = copiedCode === c.code;

    return (
      <tr key={c.id}>
        <td>
          <div className="d-flex flex-column gap-1">
            <div className="d-flex align-items-center gap-2">
              <span
                className="fw-bold px-2 py-1 rounded border text-primary font-monospace"
                style={{ backgroundColor: '#f0f7ff', letterSpacing: '0.5px', fontSize: '0.875rem' }}
              >
                {c.code}
              </span>
              <Button
                size="sm"
                variant={isCopied ? 'success' : 'outline-secondary'}
                className="p-1 px-2 d-inline-flex align-items-center gap-1 border-0"
                style={{ fontSize: '0.75rem' }}
                title="Kodu Kopyala"
                onClick={() => copyCouponCode(c.code)}
              >
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{isCopied ? 'Kopyalandı' : 'Kopyala'}</span>
              </Button>
            </div>
            <div className="fw-semibold text-dark fs-6 mt-1">{c.name}</div>
          </div>
        </td>
        <td>
          {c.discountType === 'PERCENTAGE' ? (
            <Badge bg="success" className="fw-bold px-2 py-1">
              %{c.discountValue} İndirim
            </Badge>
          ) : (
            <Badge bg="info" className="fw-bold px-2 py-1">
              {formatMoney(c.discountValue, 'TRY')} İndirim
            </Badge>
          )}
        </td>
        <td>
          {pkg ? (
            <Badge bg="primary" className="fw-semibold">
              {pkg.displayName}
            </Badge>
          ) : c.applicablePackageCode ? (
            <Badge bg="secondary">{c.applicablePackageCode}</Badge>
          ) : (
            <span className="text-muted small">✨ Tüm Paketler</span>
          )}
        </td>
        <td>
          <div className="d-flex flex-column">
            <div className="d-flex align-items-center gap-1">
              <Users size={14} className="text-muted flex-shrink-0" />
              <span className="fw-bold text-dark">
                {c.usesCount} <span className="text-muted fw-normal">/ {c.maxUses ? c.maxUses : '∞'}</span>
              </span>
            </div>
            <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
              (Kişi başı maks: {c.maxUsesPerUser})
            </span>
          </div>
        </td>
        <td>
          <div className="d-flex align-items-center gap-2 text-dark fw-medium" style={{ fontSize: '0.875rem' }}>
            <Calendar size={15} className="text-primary flex-shrink-0" />
            <span>
              {formatDateForText(c.startsAt)}
              {c.endsAt ? (
                <> <span className="text-muted">→</span> {formatDateForText(c.endsAt)}</>
              ) : (
                <span className="text-muted ms-1 small">(Süresiz)</span>
              )}
            </span>
          </div>
        </td>
        <td>
          <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} />
        </td>
        <td className="text-end">
          <Button
            size="sm"
            variant="outline-primary"
            className="d-inline-flex align-items-center gap-1"
            onClick={() => openEditModal(c)}
            title="Kuponu Düzenle"
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
            heading="Kuponlar"
            createButtonText="Kupon Ekle"
            onCreate={openCreateModal}
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
                <Percent size={22} />
              </div>
              <div>
                <h6 className="text-muted mb-0 small">Toplam Kupon</h6>
                <h4 className="fw-bold mb-0 text-dark">{allCoupons.length}</h4>
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
                <h6 className="text-muted mb-0 small">Aktif Kuponlar</h6>
                <h4 className="fw-bold mb-0 text-success">{activeCouponsCount}</h4>
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
                <Users size={22} />
              </div>
              <div>
                <h6 className="text-muted mb-0 small">Toplam Kupon Kullanımı</h6>
                <h4 className="fw-bold mb-0 text-dark">{totalUsesCount} Kez</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Arama ve Filtreleme */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body className="p-3">
          <Form onSubmit={handleSearchSubmit}>
            <Row className="align-items-center g-2">
              <Col md={12}>
                <InputGroup>
                  <InputGroup.Text className="bg-light border-end-0">
                    <i className="fe fe-search text-muted"></i>
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    className="border-start-0"
                    placeholder="Kupon kodu (ör. HRD-AB12) veya kupon adı ile ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button type="submit" variant="primary">
                    Ara
                  </Button>
                  {searchQuery && (
                    <Button variant="outline-secondary" onClick={handleClearSearch}>
                      Aramayı Temizle
                    </Button>
                  )}
                </InputGroup>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {isModalOpen && modalContent}

      {isLoading && !data && <Loading />}

      {!isLoading && isError && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Kuponlar yüklenirken bir hata oluştu.</span>
          <Button size="sm" variant="outline-danger" onClick={() => refetch()}>
            Tekrar Dene
          </Button>
        </Alert>
      )}

      {!isLoading && !isError && filteredCoupons.length === 0 && (
        <Alert variant="light" className="border text-center p-5">
          <Percent size={40} className="text-muted mb-3 d-block mx-auto opacity-50" />
          <h5 className="fw-bold text-dark">
            {hasActiveFilters
              ? 'Arama kriterlerine uygun kupon bulunamadı'
              : 'Henüz indirim kuponu tanımlanmamış'}
          </h5>
          <p className="text-muted mb-3 small">
            {hasActiveFilters
              ? 'Farklı bir arama terimi deneyebilir veya filtreyi temizleyebilirsiniz.'
              : 'Kullanıcılarınıza özel indirim kuponları tanımlayarak avantajlı paket alımları sağlayabilirsiniz.'}
          </p>
          {!hasActiveFilters && (
            <Button variant="primary" onClick={openCreateModal}>
              İlk Kuponu Oluştur
            </Button>
          )}
        </Alert>
      )}

      {!isLoading && !isError && filteredCoupons.length > 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <PrepareTable
              headItems={headItems}
              content={content}
              page={data?.page}
              onHandlePageChange={handlePageChange}
            />
          </Card.Body>
        </Card>
      )}
    </>
  );
}
