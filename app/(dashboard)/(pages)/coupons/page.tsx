"use client"
import React, { useState } from 'react';
import { Badge, Button, Card, Col, Container, Form, Offcanvas, Row, InputGroup } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { couponService, CouponResponse, CreateCouponPayload, UpdateCouponPayload } from '@/services/coupon.service';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';

const headItems = ['Kupon Kodu', 'Adı', 'İndirim', 'Kullanım Limiti', 'Geçerlilik Tarihi', 'Kapsam', 'Durum', ''];

function CouponFormModal({
  coupon,
  onClose,
  onSave,
}: {
  coupon?: CouponResponse;
  onClose: () => void;
  onSave: (values: CreateCouponPayload | UpdateCouponPayload) => Promise<void>;
}) {
  const isEdit = Boolean(coupon);

  const initialValues = {
    code: coupon?.code ?? '',
    name: coupon?.name ?? '',
    discountType: coupon?.discountType ?? 'PERCENTAGE',
    discountValue: coupon?.discountValue ? (coupon.discountType === 'FIXED_AMOUNT' ? coupon.discountValue / 100 : coupon.discountValue) : 10,
    maxUses: coupon?.maxUses ?? '',
    maxUsesPerUser: coupon?.maxUsesPerUser ?? 1,
    minSpendAmountMinor: coupon?.minSpendAmountMinor ? coupon.minSpendAmountMinor / 100 : '',
    applicablePackageCode: coupon?.applicablePackageCode ?? '',
    startsAt: coupon?.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    endsAt: coupon?.endsAt ? new Date(coupon.endsAt).toISOString().slice(0, 16) : '',
    isActive: coupon?.isActive ?? true,
  };

  const schema = Yup.object().shape({
    code: Yup.string().required('Kupon kodu zorunludur.'),
    name: Yup.string().required('Kupon adı zorunludur.'),
    discountType: Yup.string().oneOf(['PERCENTAGE', 'FIXED_AMOUNT']).required(),
    discountValue: Yup.number().positive('İndirim değeri 0\'dan büyük olmalıdır.').required('İndirim değeri zorunludur.'),
    maxUsesPerUser: Yup.number().positive().required(),
  });

  return (
    <Offcanvas show placement="end" onHide={onClose} scroll style={{ width: '450px' }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>{isEdit ? 'Kupon Düzenle' : 'Yeni Kupon Oluştur'}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik
          initialValues={initialValues}
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              const startsAtIso = new Date(values.startsAt).toISOString();
              const endsAtIso = values.endsAt ? new Date(values.endsAt).toISOString() : null;

              const payloadBase = {
                name: values.name,
                discountType: values.discountType as 'PERCENTAGE' | 'FIXED_AMOUNT',
                discountValue: values.discountType === 'FIXED_AMOUNT' ? Math.round(Number(values.discountValue) * 100) : Number(values.discountValue),
                maxUses: values.maxUses ? Number(values.maxUses) : null,
                maxUsesPerUser: Number(values.maxUsesPerUser),
                minSpendAmountMinor: values.minSpendAmountMinor ? Math.round(Number(values.minSpendAmountMinor) * 100) : null,
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
                  code: values.code,
                } as CreateCouponPayload);
              }
            } catch (err) {
              toast.error(getErrorMessage(err));
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ handleSubmit, handleChange, values, errors, touched, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit} className="d-flex flex-column gap-3">
              <Form.Group>
                <Form.Label>Kupon Kodu</Form.Label>
                <Form.Control
                  type="text"
                  name="code"
                  disabled={isEdit}
                  value={values.code}
                  onChange={handleChange}
                  isInvalid={touched.code && Boolean(errors.code)}
                  placeholder="Örn: HARADAN2026"
                />
                <Form.Control.Feedback type="invalid">{errors.code}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group>
                <Form.Label>Kupon Adı / Açıklaması</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={values.name}
                  onChange={handleChange}
                  isInvalid={touched.name && Boolean(errors.name)}
                  placeholder="Örn: Bahar İndirimi Kampanyası"
                />
                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>İndirim Türü</Form.Label>
                    <Form.Select name="discountType" value={values.discountType} onChange={handleChange}>
                      <option value="PERCENTAGE">Yüzdesel (%)</option>
                      <option value="FIXED_AMOUNT">Sabit Tutar (TL)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>İndirim Değeri {values.discountType === 'PERCENTAGE' ? '(%)' : '(TL)'}</Form.Label>
                    <Form.Control
                      type="number"
                      name="discountValue"
                      value={values.discountValue}
                      onChange={handleChange}
                      isInvalid={touched.discountValue && Boolean(errors.discountValue)}
                    />
                    <Form.Control.Feedback type="invalid">{errors.discountValue}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Toplam Kullanım Limiti</Form.Label>
                    <Form.Control
                      type="number"
                      name="maxUses"
                      value={values.maxUses}
                      onChange={handleChange}
                      placeholder="Sınırsız için boş bırakın"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Kullanıcı Başı Limit</Form.Label>
                    <Form.Control
                      type="number"
                      name="maxUsesPerUser"
                      value={values.maxUsesPerUser}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group>
                <Form.Label>Min. Harcama Tutarı (TL)</Form.Label>
                <Form.Control
                  type="number"
                  name="minSpendAmountMinor"
                  value={values.minSpendAmountMinor}
                  onChange={handleChange}
                  placeholder="Yoksa boş bırakın"
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Geçerli İlan Paketi</Form.Label>
                <Form.Select name="applicablePackageCode" value={values.applicablePackageCode} onChange={handleChange}>
                  <option value="">Tüm Paketlerde Geçerli</option>
                  <option value="STARTER">Starter Paket</option>
                  <option value="MIDDLE">Middle Paket</option>
                  <option value="ADVANCED">Advanced Paket</option>
                </Form.Select>
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Başlangıç Tarihi</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      name="startsAt"
                      value={values.startsAt}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Bitiş Tarihi</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      name="endsAt"
                      value={values.endsAt}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {isEdit && (
                <Form.Group className="mt-2">
                  <Form.Check
                    type="switch"
                    id="coupon-active-switch"
                    name="isActive"
                    label="Kupon Aktif"
                    checked={values.isActive}
                    onChange={handleChange}
                  />
                </Form.Group>
              )}

              <div className="mt-3">
                <Button type="submit" variant="primary" disabled={isSubmitting} className="w-100">
                  {isEdit ? 'Güncelle' : 'Kupon Oluştur'}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function CouponsPage() {
  const [{ data, isLoading, isError, refetch, handlePageChange, handleFilter }] = useApi<CouponResponse>({
    service: couponService,
    params: {
      filter: '',
      pageRequest: {
        page: 0,
        size: 10,
      },
    },
  });

  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [, setEditingCoupon] = useState<CouponResponse | undefined>();
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilter(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    handleFilter('');
  };

  const handleCreate = async (payload: CreateCouponPayload | UpdateCouponPayload) => {
    await couponService.create(payload as CreateCouponPayload);
    toast.success('Kupon başarıyla oluşturuldu.');
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

  const openCreateModal = () => {
    setEditingCoupon(undefined);
    openModal(
      <CouponFormModal
        onClose={closeModal}
        onSave={handleCreate}
      />
    );
  };

  const openEditModal = (coupon: CouponResponse) => {
    setEditingCoupon(coupon);
    openModal(
      <CouponFormModal
        coupon={coupon}
        onClose={closeModal}
        onSave={(payload) => handleUpdate(coupon.id, payload as UpdateCouponPayload)}
      />
    );
  };

  const formatDiscount = (c: CouponResponse) => {
    if (c.discountType === 'PERCENTAGE') {
      return `%${c.discountValue}`;
    }
    return `${(c.discountValue / 100).toLocaleString('tr-TR')} TL`;
  };

  const content = data?.content?.map((c) => (
    <tr key={c.id}>
      <td><span className="fw-bold text-primary">{c.code}</span></td>
      <td>{c.name}</td>
      <td><Badge bg="info">{formatDiscount(c)}</Badge></td>
      <td>{c.usesCount} / {c.maxUses ? c.maxUses : '∞'}</td>
      <td>
        <span className="small">
          {formatDateTimeForText(c.startsAt)} - {c.endsAt ? formatDateTimeForText(c.endsAt) : 'Süresiz'}
        </span>
      </td>
      <td><Badge bg="secondary">{c.applicablePackageCode ?? 'Tüm Paketler'}</Badge></td>
      <td>
        <Badge bg={c.isActive ? 'success' : 'danger'}>
          {c.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      </td>
      <td className="text-nowrap">
        <Button size="sm" variant="outline-primary" className="me-2" onClick={() => openEditModal(c)}>
          Düzenle
        </Button>
        <Button size="sm" variant={c.isActive ? 'outline-warning' : 'outline-success'} onClick={() => handleToggleActive(c)}>
          {c.isActive ? 'Pasif Et' : 'Aktif Et'}
        </Button>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading
            heading="Kupon Yönetimi"
            createButtonText="Yeni Kupon Ekle"
            onCreate={openCreateModal}
            onToggleFilter={() => setShowFilterPanel(!showFilterPanel)}
          />
        </Col>
      </Row>

      {/* Arama ve Filtre Paneli */}
      {showFilterPanel && (
        <Card className="mt-3 mb-3 border-0 shadow-sm">
          <Card.Body>
            <Form onSubmit={handleSearchSubmit}>
              <Row className="g-2 align-items-center">
                <Col md={8} sm={12}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Kupon kodu veya adına göre ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button type="submit" variant="primary">
                      Ara
                    </Button>
                    {searchQuery && (
                      <Button variant="outline-secondary" onClick={handleClearSearch}>
                        Temizle
                      </Button>
                    )}
                  </InputGroup>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}

      {isModalOpen && modalContent}

      <Card className="mt-3">
        <Card.Body>
          {isLoading && !data && <Loading />}
          {!isLoading && isError && (
            <div className="text-danger p-3 text-center">Kuponlar yüklenirken bir hata oluştu.</div>
          )}
          {!isLoading && !isError && (data?.content?.length ?? 0) === 0 && (
            <div className="p-4 text-center text-muted">
              Henüz kupon oluşturulmamış. Yeni kupon ekleyebilirsiniz.
            </div>
          )}
          {!isLoading && !isError && (data?.content?.length ?? 0) > 0 && (
            <PrepareTable
              headItems={headItems}
              content={content}
              page={data?.page}
              onHandlePageChange={handlePageChange}
            />
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
