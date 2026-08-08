"use client"
import { Alert, Badge, Button, Card, Col, Container, Form, Offcanvas, Row } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import RichTextEditor from '@/components/RichTextEditor';
import SafeRichText from '@/components/SafeRichText';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { formatMoney, formatMoneyInput, getErrorMessage, parseMoneyInput } from '@/helpers/HelperUtils';
import { sanitizeRichHtml } from '@/helpers/sanitizeHtml';
import React, { useState } from 'react';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { packageService, PackageRequest, PackageResponse } from '@/services/package.service';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';

const headItems = ['Ad', 'Fiyat', 'Durum', 'Oluşturulma', ''];

const initialValues: PackageRequest = {
  displayName: '',
  description: '',
  badgeText: '',
  benefits: [''],
  amountMinor: undefined,
  defaultDurationDays: null,
  allowsUrgent: false,
  showcaseEligible: false,
  searchPriority: 0,
  broadcastOnPublish: false,
  isActive: true,
};

function PackagePreview({ value }: { value: PackageRequest }) {
  const benefits = (value.benefits ?? []).map((item) => item.trim()).filter(Boolean);
  const capabilities = [
    value.allowsUrgent ? 'Acil ilan' : null,
    value.showcaseEligible ? 'Vitrin' : null,
    value.broadcastOnPublish ? 'Yayın bildirimi' : null,
  ].filter(Boolean) as string[];

  return (
    <Card className="border-primary-subtle shadow-sm mb-4">
      <Card.Header className="small text-muted">Canlı Önizleme</Card.Header>
      <Card.Body>
        {value.badgeText?.trim() && <Badge bg="primary" className="mb-2">{value.badgeText}</Badge>}
        <Card.Title>{value.displayName.trim() || 'Paket adı'}</Card.Title>
        <SafeRichText value={value.description} className="text-muted mb-3" />
        <div className="fs-3 fw-semibold mb-1">{value.amountMinor == null ? 'Fiyat belirtilmedi' : formatMoney(value.amountMinor, 'TRY')}</div>
        <div className="text-muted mb-3">
          {value.defaultDurationDays ? `${value.defaultDurationDays} gün geçerli` : 'Süre belirtilmedi'}
        </div>
        {benefits.length > 0 && (
          <ul className="mb-3 ps-3">
            {benefits.map((benefit, index) => <li key={`${benefit}-${index}`}>{benefit}</li>)}
          </ul>
        )}
        <div className="d-flex flex-wrap gap-2">
          {capabilities.length > 0
            ? capabilities.map((capability) => <Badge key={capability} bg="light" text="dark" className="border">{capability}</Badge>)
            : <span className="small text-muted">Ek özellik seçilmedi</span>}
        </div>
      </Card.Body>
    </Card>
  );
}

function PackageModal({ selectedPackage, onClose, onSave }: { selectedPackage?: PackageResponse; onClose: () => void; onSave: (value: PackageRequest) => Promise<void>; }) {
  const isNew = !selectedPackage?.code;
  const values: PackageRequest = selectedPackage ? {
    identifier: selectedPackage.code,
    expectedVersion: selectedPackage.version,
    code: selectedPackage.code,
    displayName: selectedPackage.displayName,
    description: selectedPackage.description ?? '',
    badgeText: selectedPackage.badgeText ?? '',
    benefits: selectedPackage.benefits?.length ? selectedPackage.benefits : [''],
    amountMinor: selectedPackage.displayPrice?.amountMinor,
    defaultDurationDays: selectedPackage.defaultDurationDays ?? null,
    allowsUrgent: selectedPackage.allowsUrgent,
    showcaseEligible: selectedPackage.showcaseEligible,
    searchPriority: selectedPackage.searchPriority,
    broadcastOnPublish: selectedPackage.broadcastOnPublish,
    isActive: selectedPackage.isActive,
  } : initialValues;
  const [priceInput, setPriceInput] = useState(() => formatMoneyInput(values.amountMinor));
  const parsedPrice = parseMoneyInput(priceInput);

  const schema = Yup.object().shape({
    displayName: Yup.string().required('Ad zorunludur'),
    benefits: Yup.array().of(Yup.string()).test('benefits', 'En az bir fayda yazın', (items) =>
      Boolean(items?.some((item) => String(item ?? '').trim())),
    ),
    searchPriority: Yup.number().min(0, '0–100').max(100, '0–100').required(),
    defaultDurationDays: Yup.number().nullable().min(1, 'Süre en az 1 gün olmalıdır'),
  });

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end" style={{ width: 'min(900px, 100vw)' }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>{isNew ? 'Yeni Paket' : 'Paket Düzenle'}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik
          initialValues={values}
          enableReinitialize
          validationSchema={schema}
          onSubmit={async (formValues) => {
            const price = parseMoneyInput(priceInput);
            if (price.kind === 'invalid') {
              return;
            }
            await onSave({
              ...formValues,
              amountMinor: price.kind === 'valid' ? price.amountMinor : undefined,
            });
          }}
        >
          {({ handleSubmit, handleChange, setFieldValue, values, errors, touched, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Ad</Form.Label>
                <Form.Control name="displayName" value={values.displayName} onChange={handleChange} isInvalid={touched.displayName && !!errors.displayName} />
                <Form.Control.Feedback type="invalid">{errors.displayName as string}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Kısa Açıklama</Form.Label>
                <RichTextEditor
                  value={values.description ?? ''}
                  onChange={(next) => void setFieldValue('description', next)}
                />
                <Form.Text muted>
                  Zengin metin (kalın, italik, liste, bağlantı). İçerik kayıttan önce temizlenir; ham HTML/script kabul edilmez.
                </Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Rozet (Opsiyonel)</Form.Label>
                <Form.Control name="badgeText" value={values.badgeText ?? ''} onChange={handleChange} placeholder="Örn. En Popüler" />
                <Form.Text muted>Örn. En Popüler, Önerilen, Avantajlı</Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Faydalar</Form.Label>
                {(values.benefits ?? []).map((benefit, index) => (
                  <div key={`benefit-${index}`} className="d-flex gap-2 mb-2">
                    <Form.Control
                      value={benefit}
                      onChange={(e) => {
                        const next = [...values.benefits];
                        next[index] = e.target.value;
                        void setFieldValue('benefits', next);
                      }}
                      placeholder="Fayda metni (emoji serbest)"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      disabled={(values.benefits?.length ?? 0) <= 1}
                      onClick={() => void setFieldValue('benefits', values.benefits.filter((_, i) => i !== index))}
                    >
                      Sil
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline-primary"
                  onClick={() => void setFieldValue('benefits', [...(values.benefits ?? []), ''])}
                >
                  + Fayda Ekle
                </Button>
                {touched.benefits && typeof errors.benefits === 'string' && (
                  <div className="invalid-feedback d-block">{errors.benefits}</div>
                )}
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Fiyat (₺)</Form.Label>
                <Form.Control
                  type="text"
                  inputMode="decimal"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onBlur={() => {
                    const price = parseMoneyInput(priceInput);
                    if (price.kind === 'empty') {
                      void setFieldValue('amountMinor', undefined);
                    } else if (price.kind === 'valid') {
                      void setFieldValue('amountMinor', price.amountMinor);
                      setPriceInput(formatMoneyInput(price.amountMinor));
                    }
                  }}
                  isInvalid={parsedPrice.kind === 'invalid'}
                  placeholder="Örn. 199,90"
                />
                <Form.Control.Feedback type="invalid">
                  Fiyatı 200,50 veya 1.200,50 biçiminde girin.
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Varsayılan Süre (Gün)</Form.Label>
                <Form.Control type="number" name="defaultDurationDays" value={values.defaultDurationDays ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="checkbox" name="allowsUrgent" label="Acil İlan" checked={values.allowsUrgent} onChange={handleChange} />
                <Form.Check type="checkbox" name="showcaseEligible" label="Vitrin Uygun" checked={values.showcaseEligible} onChange={handleChange} />
                <Form.Check type="checkbox" name="broadcastOnPublish" label="Yayınlanınca Bildirim Gönder" checked={values.broadcastOnPublish} onChange={handleChange} />
                <Form.Check type="checkbox" name="isActive" label="Aktif" checked={values.isActive} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <div className="d-flex justify-content-between">
                  <Form.Label>Arama Önceliği</Form.Label>
                  <strong>{values.searchPriority}/100</strong>
                </div>
                <Form.Range min={0} max={100} name="searchPriority" value={values.searchPriority} onChange={handleChange} />
                <Form.Text muted>
                  Yüksek değer, diğer koşullar eşit olduğunda bu paketteki ilanlara arama sıralamasında daha fazla öncelik verir. 0 normal, 100 maksimum.
                </Form.Text>
              </Form.Group>
              <PackagePreview value={values} />
              <Button disabled={!isValid || isSubmitting || parsedPrice.kind === 'invalid'} variant="primary" as="input" type="submit" value={isNew ? 'Ekle' : 'Güncelle'} />
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function PackagesPage() {
  const [{ data, isLoading, refetch }] = useApi<PackageResponse>({
    service: packageService,
    params: {
      filter: '',
      pageRequest: { page: 0, size: 100, sort: [{ direction: 'ASC', property: 'sortOrder' }] },
    },
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [reorderBusy, setReorderBusy] = useState(false);

  const openPackageModal = (pkg?: PackageResponse) => {
    openModal(<PackageModal selectedPackage={pkg} onClose={closeModal} onSave={handleSave} />);
  };

  const handleSave = async (values: PackageRequest) => {
    try {
      const payload: PackageRequest = {
        ...values,
        description: sanitizeRichHtml(values.description ?? '') || undefined,
        benefits: (values.benefits ?? []).map((b) => String(b ?? '').trim()).filter(Boolean),
      };
      if (payload.code && payload.identifier) {
        await packageService.update(payload);
      } else {
        await packageService.create(payload);
      }
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const movePackage = async (index: number, direction: -1 | 1) => {
    const rows = data?.content ?? [];
    const target = index + direction;
    if (reorderBusy || target < 0 || target >= rows.length) {
      return;
    }
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    const payload = next.map((pkg, sortOrder) => ({
      id: pkg.id ?? '',
      expectedVersion: pkg.version,
      sortOrder,
    }));
    if (payload.some((row) => !row.id)) {
      toast.error('Paket sıralaması şu anda güncellenemiyor. Sayfayı yenileyip tekrar deneyin.');
      return;
    }
    setReorderBusy(true);
    try {
      await packageService.reorder(payload);
      toast.success('Sıra güncellendi');
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setReorderBusy(false);
    }
  };

  const content = data?.content?.map((pkg, index) => (
    <tr key={pkg.code}>
      <td>{pkg.displayName}</td>
      <td>{formatMoney(pkg.displayPrice?.amountMinor, pkg.displayPrice?.currency ?? pkg.currencyCode)}</td>
      <td><StatusBadge status={pkg.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td>{formatDateTimeForText(pkg.createdAt)}</td>
      <td className="text-nowrap">
        <div className="d-flex flex-wrap gap-1">
          <Button size="sm" variant="outline-secondary" disabled={reorderBusy || index === 0} onClick={() => void movePackage(index, -1)}>↑</Button>
          <Button size="sm" variant="outline-secondary" disabled={reorderBusy || index === (data?.content?.length ?? 0) - 1} onClick={() => void movePackage(index, 1)}>↓</Button>
          <Button size="sm" variant="outline-primary" onClick={() => openPackageModal(pkg)}>
            <i className="fe fe-edit"></i>
          </Button>
        </div>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading heading="Paketler" createButtonText="Paket Ekle" onCreate={() => openPackageModal(undefined)} />
        </Col>
      </Row>
      {isModalOpen && modalContent}
      {isLoading && <Loading />}
      {!isLoading && (data?.content?.length ?? 0) === 0 && (
        <Alert variant="light" className="border text-muted">Henüz paket yok. Yeni paket ekleyebilirsiniz.</Alert>
      )}
      {!isLoading && (data?.content?.length ?? 0) > 0 && (
        <PrepareTable headItems={headItems} content={content} page={undefined} onHandlePageChange={() => undefined} />
      )}
    </Container>
  );
}
