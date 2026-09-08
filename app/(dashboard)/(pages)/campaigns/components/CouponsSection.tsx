"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Badge, Button, Card, Col, Form, Offcanvas, Row, InputGroup } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import { formatDateForText, toDateInputValue, toApiDateStart, toApiDateEnd } from '@/helpers/DateUtils';
import { formatMoney, getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { couponService, CouponResponse, CreateCouponPayload, UpdateCouponPayload } from '@/services/coupon.service';
import { packageService, PackageResponse } from '@/services/package.service';
import DeleteModal from '@/components/DeleteModal';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';
import { Edit, Copy, Check, Percent, Tag, Users, CheckCircle, RefreshCw, Trash2 } from 'react-feather';

const headItems = [
  'Kupon Kodu',
  'Kupon Adı',
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

  const initialValues = {
    code: coupon?.code ?? '',
    name: coupon?.name ?? '',
    discountType: coupon?.discountType ?? 'PERCENTAGE',
    discountValue: coupon?.discountValue
      ? coupon.discountType === 'FIXED_AMOUNT'
        ? coupon.discountValue / 100
        : coupon.discountValue
      : 20,
    maxUses: coupon?.maxUses ?? '',
    maxUsesPerUser: coupon?.maxUsesPerUser ?? 1,
    minSpendAmountMinor: coupon?.minSpendAmountMinor ? coupon.minSpendAmountMinor / 100 : '',
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
      .required('İndirim değeri zorunludur.'),
    maxUsesPerUser: Yup.number().positive('Kullanıcı başı limit 1 veya üzeri olmalıdır.').required(),
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
    <Offcanvas show placement="end" onHide={onClose} scroll style={{ width: 'min(560px, 100vw)' }}>
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title className="fw-bold d-flex align-items-center gap-2">
          <Percent className="text-primary" size={20} />
          {isEdit ? 'Kuponu Düzenle' : 'Yeni İndirim Kuponu Oluştur'}
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
                name: values.name,
                discountType: values.discountType as 'PERCENTAGE' | 'FIXED_AMOUNT',
                discountValue:
                  values.discountType === 'FIXED_AMOUNT'
                    ? Math.round(Number(values.discountValue) * 100)
                    : Number(values.discountValue),
                maxUses: values.maxUses ? Number(values.maxUses) : null,
                maxUsesPerUser: Number(values.maxUsesPerUser),
                minSpendAmountMinor: values.minSpendAmountMinor
                  ? Math.round(Number(values.minSpendAmountMinor) * 100)
                  : null,
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
          {({ handleSubmit, handleChange, setFieldValue, values, errors, touched, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit} className="d-flex flex-column gap-3">
              {/* Kupon Kodu & Tanım */}
              <Card className="border shadow-sm">
                <Card.Header className="bg-light fw-bold py-2 d-flex align-items-center gap-2">
                  <span className="badge bg-primary rounded-pill">1</span>
                  Kupon Kodu ve Başlığı
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
                        className="fw-bold fs-5 text-primary text-uppercase"
                      />
                      {!isEdit && (
                        <Button
                          variant="outline-secondary"
                          type="button"
                          onClick={() => setFieldValue('code', generateRandomCouponCode())}
                          title="Rastgele Kupon Kodu Üret"
                          className="d-flex align-items-center gap-1"
                        >
                          <RefreshCw size={14} />
                          <span>Kod Üret</span>
                        </Button>
                      )}
                    </InputGroup>
                    <Form.Control.Feedback type="invalid">{errors.code}</Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      Kullanıcılarınız ödeme sırasında bu kodu girerek indirim kazanacaktır.
                    </Form.Text>
                  </Form.Group>

                  <Form.Group>
                    <Form.Label className="fw-semibold">
                      Kupon Adı / Açıklaması <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={values.name}
                      onChange={handleChange}
                      isInvalid={touched.name && Boolean(errors.name)}
                      placeholder="Örn: Yeni Üyelere Özel %20 İndirim"
                    />
                    <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                  </Form.Group>
                </Card.Body>
              </Card>

              {/* İndirim Kriterleri */}
              <Card className="border shadow-sm">
                <Card.Header className="bg-light fw-bold py-2 d-flex align-items-center gap-2">
                  <span className="badge bg-primary rounded-pill">2</span>
                  İndirim Miktarı & Geçerli Paket
                </Card.Header>
                <Card.Body className="p-3">
                  <Row className="g-3 mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">İndirim Türü</Form.Label>
                        <Form.Select
                          name="discountType"
                          value={values.discountType}
                          onChange={(e) => {
                            handleChange(e);
                            if (e.target.value === 'PERCENTAGE' && Number(values.discountValue) > 100) {
                              setFieldValue('discountValue', 20);
                            }
                          }}
                        >
                          <option value="PERCENTAGE">Yüzdesel (%) İndirim</option>
                          <option value="FIXED_AMOUNT">Sabit Tutar (TL) İndirim</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">
                          İndirim Değeri ({values.discountType === 'PERCENTAGE' ? '%' : 'TL'}){' '}
                          <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            type="number"
                            name="discountValue"
                            value={values.discountValue}
                            onChange={handleChange}
                            isInvalid={touched.discountValue && Boolean(errors.discountValue)}
                            className="fw-bold"
                          />
                          <InputGroup.Text>
                            {values.discountType === 'PERCENTAGE' ? '%' : '₺'}
                          </InputGroup.Text>
                        </InputGroup>
                        <Form.Control.Feedback type="invalid">{errors.discountValue}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <div className="d-flex align-items-center gap-1 flex-wrap">
                        <span className="small text-muted me-1">Hızlı Seç:</span>
                        {values.discountType === 'PERCENTAGE' ? (
                          [10, 20, 25, 30, 50].map((val) => (
                            <Button
                              key={val}
                              size="sm"
                              variant="outline-secondary"
                              className="py-0 px-2 small"
                              onClick={() => setFieldValue('discountValue', val)}
                            >
                              %{val}
                            </Button>
                          ))
                        ) : (
                          [50, 100, 150, 250, 500].map((val) => (
                            <Button
                              key={val}
                              size="sm"
                              variant="outline-secondary"
                              className="py-0 px-2 small"
                              onClick={() => setFieldValue('discountValue', val)}
                            >
                              {val} ₺
                            </Button>
                          ))
                        )}
                      </div>
                    </Col>
                  </Row>

                  <Form.Group className="mb-2">
                    <Form.Label className="fw-semibold">Hangi Pakette Geçerli Olsun?</Form.Label>
                    <Form.Select
                      name="applicablePackageCode"
                      value={values.applicablePackageCode}
                      onChange={handleChange}
                    >
                      <option value="">✨ Tüm Paketlerde Geçerli</option>
                      {packages.map((pkg) => (
                        <option key={pkg.code} value={pkg.code}>
                          {pkg.displayName} (
                          {pkg.displayPrice?.amountMinor
                            ? formatMoney(pkg.displayPrice.amountMinor, 'TRY')
                            : 'Ücretsiz'}
                          )
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Yalnızca belirli bir pakete özel kupon tanımlamak için ilgili paketi seçebilirsiniz.
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>

              {/* Kullanım Limitleri & Tarihler */}
              <Card className="border shadow-sm">
                <Card.Header className="bg-light fw-bold py-2 d-flex align-items-center gap-2">
                  <span className="badge bg-primary rounded-pill">3</span>
                  Kullanım Limitleri ve Süresi
                </Card.Header>
                <Card.Body className="p-3">
                  <Row className="g-3 mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold">Toplam Kullanım Limiti</Form.Label>
                        <Form.Control
                          type="number"
                          name="maxUses"
                          value={values.maxUses}
                          onChange={handleChange}
                          placeholder="Sınırsız için boş bırakın"
                        />
                        <Form.Text className="text-muted small">Örn: İlk 100 kişi için 100</Form.Text>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold">Kişi Başı Limit</Form.Label>
                        <Form.Control
                          type="number"
                          name="maxUsesPerUser"
                          value={values.maxUsesPerUser}
                          onChange={handleChange}
                        />
                        <Form.Text className="text-muted small">Her üyenin azami kullanım hakkı</Form.Text>
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold">
                          Minimum Harcama Tutarı (TL)
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            type="number"
                            name="minSpendAmountMinor"
                            value={values.minSpendAmountMinor}
                            onChange={handleChange}
                            placeholder="Zorunlu sepet tutarı yoksa boş bırakın"
                          />
                          <InputGroup.Text>₺</InputGroup.Text>
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold">Başlangıç Tarihi</Form.Label>
                        <Form.Control
                          type="date"
                          name="startsAt"
                          value={values.startsAt}
                          onChange={handleChange}
                        />
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
                        />
                        <Form.Text className="text-muted small">Süresiz ise boş bırakın</Form.Text>
                      </Form.Group>
                    </Col>

                    {isEdit && (
                      <Col md={12}>
                        <Form.Check
                          type="switch"
                          id="coupon-active-switch"
                          name="isActive"
                          label="Kupon Aktif"
                          checked={values.isActive}
                          onChange={handleChange}
                          className="fw-semibold text-primary"
                        />
                      </Col>
                    )}
                  </Row>
                </Card.Body>
              </Card>

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
          )}
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
    toast.success('Kupon başarıyla oluşturuldu. Kullanıcılarınıza verebilirsiniz!');
    closeModal();
    refetch();
  };

  const handleUpdate = async (id: string, payload: UpdateCouponPayload) => {
    await couponService.update(id, payload);
    toast.success('Kupon başarıyla güncellendi.');
    closeModal();
    refetch();
  };

  const handleToggleActive = async (coupon: CouponResponse) => {
    try {
      await couponService.setActive(coupon.id, coupon.version, !coupon.isActive);
      toast.success(coupon.isActive ? 'Kupon pasife alındı.' : 'Kupon aktif edildi.');
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
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

  const formatDiscount = (c: CouponResponse) => {
    if (c.discountType === 'PERCENTAGE') {
      return `%${c.discountValue} İndirim`;
    }
    return `${(c.discountValue / 100).toLocaleString('tr-TR')} ₺ İndirim`;
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
          <div className="d-flex align-items-center gap-2">
            <span
              className="fw-bold px-2 py-1 rounded border text-primary"
              style={{ backgroundColor: '#f0f7ff', letterSpacing: '0.5px' }}
            >
              {c.code}
            </span>
            <Button
              size="sm"
              variant={isCopied ? 'success' : 'outline-secondary'}
              className="p-1 px-2 d-inline-flex align-items-center gap-1"
              title="Kodu Kopyala"
              onClick={() => copyCouponCode(c.code)}
            >
              {isCopied ? <Check size={13} /> : <Copy size={13} />}
              <span className="small">{isCopied ? 'Kopyalandı' : 'Kopyala'}</span>
            </Button>
          </div>
        </td>
        <td>
          <div className="fw-semibold text-dark">{c.name}</div>
          {c.minSpendAmountMinor && (
            <div className="small text-muted">
              Min: {formatMoney(c.minSpendAmountMinor, 'TRY')}
            </div>
          )}
        </td>
        <td>
          <Badge bg="info" className="fs-7 py-1 px-2">
            {formatDiscount(c)}
          </Badge>
        </td>
        <td>
          {pkg ? (
            <Badge bg="primary" className="fw-semibold">
              {pkg.displayName}
            </Badge>
          ) : c.applicablePackageCode ? (
            <Badge bg="secondary">{c.applicablePackageCode}</Badge>
          ) : (
            <Badge bg="light" text="dark" className="border">
              ✨ Tüm Paketler
            </Badge>
          )}
        </td>
        <td>
          <div className="small fw-semibold text-dark">
            {c.usesCount} / {c.maxUses ? c.maxUses : '∞'}
          </div>
          <div className="small text-muted">
            (Kişi başı maks: {c.maxUsesPerUser})
          </div>
        </td>
        <td>
          <span className="small text-muted">
            {formatDateForText(c.startsAt)}
            {c.endsAt ? ` - ${formatDateForText(c.endsAt)}` : ' (Süresiz)'}
          </span>
        </td>
        <td>
          <Badge bg={c.isActive ? 'success' : 'danger'}>
            {c.isActive ? 'Aktif' : 'Pasif'}
          </Badge>
        </td>
        <td className="text-nowrap text-end">
          <Button
            size="sm"
            variant="outline-primary"
            className="me-2"
            title="Düzenle"
            aria-label="Kupon Düzenle"
            onClick={() => openEditModal(c)}
          >
            <Edit size={14} />
          </Button>
          <Button
            size="sm"
            variant={c.isActive ? 'outline-warning' : 'outline-success'}
            onClick={() => handleToggleActive(c)}
          >
            {c.isActive ? 'Pasif Et' : 'Aktif Et'}
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
            heading="Kupon Yönetimi"
            createButtonText="Yeni Kupon Ekle"
            onCreate={openCreateModal}
          />
        </Col>
      </Row>

      {/* Kupon İstatistik Kartları */}
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
                <h6 className="text-muted mb-0 small">Tanımlı Kuponlar</h6>
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
                className="rounded-3 p-3 bg-light-info text-info d-flex align-items-center justify-content-center"
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

      {/* Sabit Arama Barı */}
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
                    placeholder="Kupon kodu (ör. HARADAN2026) veya kupon adı ile ara..."
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

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {isLoading && !data && <Loading />}
          {!isLoading && isError && (
            <div className="text-danger p-4 text-center">Kuponlar yüklenirken bir hata oluştu.</div>
          )}
          {!isLoading && !isError && filteredCoupons.length === 0 && (
            <div className="p-5 text-center text-muted">
              <Percent size={40} className="text-muted mb-3 d-block mx-auto opacity-50" />
              <h5 className="fw-bold text-dark">
                {hasActiveFilters
                  ? 'Arama kriterlerine uygun kupon bulunamadı'
                  : 'Henüz indirim kuponu oluşturulmamış'}
              </h5>
              <p className="text-muted mb-3 small">
                {hasActiveFilters
                  ? 'Farklı bir filtre deneyebilir veya filtreleri sıfırlayabilirsiniz.'
                  : 'Yeni kupon oluşturup kodunu kullanıcılarınıza vererek indirim tanımlayabilirsiniz.'}
              </p>
              {!hasActiveFilters && (
                <Button variant="primary" onClick={openCreateModal}>
                  Yeni Kupon Oluştur
                </Button>
              )}
            </div>
          )}
          {!isLoading && !isError && filteredCoupons.length > 0 && (
            <PrepareTable
              headItems={headItems}
              content={content}
              page={data?.page}
              onHandlePageChange={handlePageChange}
            />
          )}
        </Card.Body>
      </Card>
    </>
  );
}
