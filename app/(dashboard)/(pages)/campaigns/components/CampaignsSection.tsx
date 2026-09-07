"use client";
import React, { useEffect, useState } from 'react';
import { Accordion, Alert, Badge, Button, Card, Col, Form, InputGroup, Offcanvas, Row } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import Loading from '@/components/Loading';
import RichTextEditor from '@/components/RichTextEditor';
import SafeRichText from '@/components/SafeRichText';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText, toDateTimeLocalValue } from '@/helpers/DateUtils';
import { formatMoney, getErrorMessage } from '@/helpers/HelperUtils';
import { sanitizeRichHtml } from '@/helpers/sanitizeHtml';
import useCursorApi from '@/hooks/useCursorApi';
import useModal from '@/hooks/useModal';
import { campaignService, CampaignRequest, CampaignResponse } from '@/services/campaign.service';
import { packageService, PackageResponse } from '@/services/package.service';
import { providerEmailTemplateService, ProviderEmailTemplateSummary } from '@/services/provider-email-template.service';
import { PageHeading } from '@/widgets';
import CursorPagination from '@/components/CursorPagination';
import DeleteModal from '@/components/DeleteModal';
import { toast } from 'react-toastify';
import { Edit, Tag, Percent, CheckCircle, Calendar, ArrowRight, Trash2 } from 'react-feather';

const headItems = [
  'Kampanya Adı',
  'İndirimli Paket',
  'Normal Fiyat',
  'Kampanyalı Fiyat',
  'İndirim',
  'Durum',
  'Geçerlilik Tarihi',
  '',
];

const initialValues: CampaignRequest = {
  code: '',
  name: '',
  eventType: 'PACKAGE_UPGRADE',
  targetPackageCode: '',
  sourcePackageCode: '',
  title: '',
  description: '',
  originalAmountMinor: undefined,
  campaignAmountMinor: undefined,
  currencyCode: 'TRY',
  startsAt: new Date().toISOString().slice(0, 16),
  endsAt: '',
  isActive: true,
  emailSubject: '',
  emailHeading: '',
  emailBody: '',
  emailProviderTemplateId: '',
};

function FallbackEmailPreview({ value }: { value: CampaignRequest }) {
  return (
    <Card className="border-primary-subtle shadow-sm mb-4">
      <Card.Header className="small text-muted">Güvenli Yedek E-posta Önizlemesi</Card.Header>
      <Card.Body>
        <div className="small text-muted mb-1">Konu</div>
        <div className="fw-semibold mb-3">{value.emailSubject?.trim() || 'E-posta konusu'}</div>
        <h4>{value.emailHeading?.trim() || 'E-posta başlığı'}</h4>
        <SafeRichText value={value.emailBody} className="text-muted" />
        {!value.emailBody?.trim() && <p className="text-muted mb-0">Yedek e-posta içeriği burada görünür.</p>}
      </Card.Body>
    </Card>
  );
}

function CampaignModal({
  selectedCampaign,
  packages,
  providerTemplates,
  providerLoading,
  providerUnavailable,
  onClose,
  onSave,
}: {
  selectedCampaign?: CampaignResponse;
  packages: PackageResponse[];
  providerTemplates: ProviderEmailTemplateSummary[];
  providerLoading: boolean;
  providerUnavailable: boolean;
  onClose: () => void;
  onSave: (value: CampaignRequest) => void;
}) {
  const isNew = !selectedCampaign?.id;

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
      startsAt: toDateTimeLocalValue(selectedCampaign.startsAt),
      endsAt: toDateTimeLocalValue(selectedCampaign.endsAt),
      isActive: selectedCampaign.isActive,
    }
    : initialValues;

  const schema = Yup.object().shape({
    name: Yup.string().required('Kampanya adı zorunludur'),
    title: Yup.string().required('Görsel başlık zorunludur'),
    startsAt: Yup.string().required('Başlangıç tarihi zorunludur'),
    endsAt: Yup.string().test('end-after-start', 'Bitiş başlangıçtan sonra olmalı', function (end) {
      const { startsAt } = this.parent as { startsAt?: string };
      if (!end || !startsAt) {
        return true;
      }
      return end > startsAt;
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
          {({ handleSubmit, handleChange, setFieldValue, values, isValid, isSubmitting, errors, touched }) => {
            const selectedPackage = packages.find((p) => p.code === values.targetPackageCode);
            const originalTL = values.originalAmountMinor ? values.originalAmountMinor / 100 : 0;
            const campaignTL = values.campaignAmountMinor ? values.campaignAmountMinor / 100 : 0;
            const discountPercent =
              originalTL > 0 && campaignTL > 0 && campaignTL < originalTL
                ? Math.round(((originalTL - campaignTL) / originalTL) * 100)
                : null;

            const handlePackageSelect = (pkgCode: string) => {
              setFieldValue('targetPackageCode', pkgCode);
              const pkg = packages.find((p) => p.code === pkgCode);
              if (pkg && pkg.displayPrice?.amountMinor) {
                setFieldValue('originalAmountMinor', pkg.displayPrice.amountMinor);
                // If title/name empty, suggest intuitive defaults
                if (!values.name) {
                  setFieldValue('name', `${pkg.displayName} İndirimi`);
                }
                if (!values.title) {
                  setFieldValue('title', `${pkg.displayName} Özel Fırsatı`);
                }
              }
            };

            const applyDiscountPercent = (percent: number) => {
              if (originalTL > 0) {
                const discounted = Math.round(originalTL * (1 - percent / 100) * 100);
                setFieldValue('campaignAmountMinor', discounted);
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
                        <option value="">-- Lütfen bir paket seçin --</option>
                        {packages.map((pkg) => (
                          <option key={pkg.code} value={pkg.code}>
                            {pkg.displayName} — Normal Fiyat:{' '}
                            {pkg.displayPrice?.amountMinor
                              ? formatMoney(pkg.displayPrice.amountMinor, 'TRY')
                              : 'Fiyat Belirtilmemiş'}
                            {pkg.isActive ? '' : ' (Pasif)'}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Seçilen paketin mevcut satış fiyatı herkes için aşağıdaki indirimli kampanya fiyatına düşecektir.
                      </Form.Text>
                    </Form.Group>

                    {values.targetPackageCode && (
                      <Row className="g-3 align-items-end">
                        <Col md={5}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold text-muted">Normal Satış Fiyatı (TL)</Form.Label>
                            <InputGroup>
                              <Form.Control
                                type="number"
                                name="originalAmountTL"
                                value={originalTL || ''}
                                onChange={(e) =>
                                  setFieldValue(
                                    'originalAmountMinor',
                                    e.target.value ? Math.round(Number(e.target.value) * 100) : undefined
                                  )
                                }
                                placeholder="Örn: 250"
                              />
                              <InputGroup.Text>₺</InputGroup.Text>
                            </InputGroup>
                          </Form.Group>
                        </Col>

                        <Col md={7}>
                          <Form.Group>
                            <div className="d-flex justify-content-between align-items-center">
                              <Form.Label className="small fw-bold text-success">
                                İndirimli Kampanya Fiyatı (TL) <span className="text-danger">*</span>
                              </Form.Label>
                              {discountPercent && (
                                <Badge bg="success" className="mb-1">
                                  %{discountPercent} İndirim
                                </Badge>
                              )}
                            </div>
                            <InputGroup>
                              <Form.Control
                                type="number"
                                className="border-success fw-bold text-success"
                                name="campaignAmountTL"
                                value={campaignTL || ''}
                                onChange={(e) =>
                                  setFieldValue(
                                    'campaignAmountMinor',
                                    e.target.value ? Math.round(Number(e.target.value) * 100) : undefined
                                  )
                                }
                                placeholder="Örn: 150"
                              />
                              <InputGroup.Text className="bg-success text-white">₺</InputGroup.Text>
                            </InputGroup>
                          </Form.Group>
                        </Col>

                        {originalTL > 0 && (
                          <Col md={12}>
                            <div className="d-flex align-items-center gap-2 flex-wrap pt-1">
                              <span className="small text-muted">Hızlı Oran Seç:</span>
                              {[10, 20, 30, 40, 50].map((pct) => (
                                <Button
                                  key={pct}
                                  size="sm"
                                  variant="outline-secondary"
                                  className="py-0 px-2"
                                  onClick={() => applyDiscountPercent(pct)}
                                >
                                  %{pct} İndirim
                                </Button>
                              ))}
                            </div>
                          </Col>
                        )}
                      </Row>
                    )}
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
                            type="datetime-local"
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
                            type="datetime-local"
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

                      <Col md={12}>
                        <Form.Check
                          type="switch"
                          id="campaign-active-switch"
                          name="isActive"
                          label="Kampanya Hemen Aktif Olsun"
                          checked={values.isActive}
                          onChange={handleChange}
                          className="fw-semibold text-primary"
                        />
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* 3. Bölüm: İsteğe Bağlı Bildirim & E-posta Tasarımı (Akordiyon) */}
                <Accordion defaultActiveKey="" className="border-0">
                  <Accordion.Item eventKey="0" className="border shadow-sm">
                    <Accordion.Header>
                      <span className="fw-semibold text-secondary small">
                        ✉️ İsteğe Bağlı Bildirim & E-posta Tasarım Ayarları (Gelişmiş)
                      </span>
                    </Accordion.Header>
                    <Accordion.Body className="p-3">
                      <Form.Group className="mb-3 d-none">
                        {/* Event type kept for backward compatibility and e2e */}
                        <Form.Select name="eventType" value={values.eventType} onChange={handleChange}>
                          <option value="PACKAGE_UPGRADE">Paket Yükseltme / İndirimi</option>
                          <option value="PACKAGE_EXPIRY_1_DAY">Paket Bitiş 1 Gün</option>
                          <option value="PACKAGE_EXPIRY_5_DAYS">Paket Bitiş 5 Gün</option>
                          <option value="PACKAGE_RENEWAL">Paket Yenileme</option>
                        </Form.Select>
                      </Form.Group>

                      {providerLoading ? (
                        <Alert variant="light" className="border">
                          E-posta tasarım şablonları yükleniyor.
                        </Alert>
                      ) : providerUnavailable ? (
                        <Alert variant="warning" className="small">
                          E-posta tasarım şablonları şu anda kullanılamıyor. Yedek e-posta alanlarını düzenleyip
                          kaydedebilirsiniz.
                        </Alert>
                      ) : providerTemplates.length === 0 ? (
                        <Alert variant="info" className="small">
                          Kullanılabilir e-posta tasarım şablonu bulunmuyor. Yedek e-posta alanlarını kullanabilirsiniz.
                        </Alert>
                      ) : (
                        <Form.Group className="mb-3">
                          <Form.Label className="small fw-semibold">E-posta Tasarım Şablonu</Form.Label>
                          <Form.Select
                            name="emailProviderTemplateId"
                            value={values.emailProviderTemplateId ?? ''}
                            onChange={handleChange}
                          >
                            <option value="">Şablon seçilmedi</option>
                            {values.emailProviderTemplateId &&
                              !providerTemplates.some((item) => item.id === values.emailProviderTemplateId) && (
                                <option value={values.emailProviderTemplateId}>Mevcut şablon (listede bulunamadı)</option>
                              )}
                            {providerTemplates.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      )}

                      <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold">E-posta Konu (Yedek)</Form.Label>
                        <Form.Control
                          name="emailSubject"
                          value={values.emailSubject ?? ''}
                          onChange={handleChange}
                          placeholder="Örn: Size Özel İndirim Fırsatı"
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold">E-posta Başlık (Yedek)</Form.Label>
                        <Form.Control
                          name="emailHeading"
                          value={values.emailHeading ?? ''}
                          onChange={handleChange}
                          placeholder="Örn: Paketinizi Avantajla Yükseltin"
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold">E-posta İçerik (Yedek)</Form.Label>
                        <RichTextEditor
                          value={values.emailBody ?? ''}
                          onChange={(next) => void setFieldValue('emailBody', next)}
                        />
                      </Form.Group>

                      <FallbackEmailPreview value={values} />
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>

                <div className="pt-2">
                  <Button
                    disabled={!isValid || isSubmitting}
                    variant="primary"
                    as="input"
                    type="submit"
                    className="w-100 py-2 fs-6 fw-bold"
                    value={isNew ? 'Kampanyayı Başlat' : 'Değişiklikleri Güncelle'}
                  />
                </div>
              </Form>
            );
          }}
        </Formik>
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
  const [providerTemplates, setProviderTemplates] = useState<ProviderEmailTemplateSummary[]>([]);
  const [providerLoading, setProviderLoading] = useState(true);
  const [providerUnavailable, setProviderUnavailable] = useState(false);
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<CampaignResponse | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteCampaignTarget) return;
    try {
      await campaignService.delete(deleteCampaignTarget.id);
      toast.success('Kampanya başarıyla silindi.');
      setDeleteCampaignTarget(null);
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

  useEffect(() => {
    providerEmailTemplateService
      .list()
      .then((items) => {
        setProviderTemplates(items);
        setProviderUnavailable(false);
        setProviderLoading(false);
      })
      .catch((error) => {
        setProviderTemplates([]);
        setProviderLoading(false);
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const code = axios.isAxiosError(error)
          ? (error.response?.data as { code?: string } | undefined)?.code
          : undefined;
        if (status === 503 || code === 'DEPENDENCY_UNAVAILABLE') {
          setProviderUnavailable(true);
          return;
        }
        setProviderUnavailable(true);
        toast.error(getErrorMessage(error));
      });
  }, []);

  const openCampaignModal = (campaign?: CampaignResponse) => {
    openModal(
      <CampaignModal
        selectedCampaign={campaign}
        packages={packages}
        providerTemplates={providerTemplates}
        providerLoading={providerLoading}
        providerUnavailable={providerUnavailable}
        onClose={closeModal}
        onSave={handleSave}
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
    const discountPercent =
      orig && camp && camp < orig ? Math.round(((orig - camp) / orig) * 100) : null;

    return (
      <tr key={campaign.id}>
        <td>
          <div className="fw-bold text-dark">{campaign.name}</div>
          <div className="small text-muted">{campaign.title}</div>
        </td>
        <td>
          {targetPkg ? (
            <Badge bg="primary" className="fw-semibold">
              {targetPkg.displayName}
            </Badge>
          ) : campaign.targetPackageCode ? (
            <Badge bg="secondary">{campaign.targetPackageCode}</Badge>
          ) : (
            <span className="text-muted small">Tüm Paketler</span>
          )}
        </td>
        <td>
          {orig ? (
            <span className="text-decoration-line-through text-muted small">
              {formatMoney(orig, campaign.currencyCode || 'TRY')}
            </span>
          ) : (
            '-'
          )}
        </td>
        <td>
          {camp ? (
            <span className="fw-bold text-success fs-6">
              {formatMoney(camp, campaign.currencyCode || 'TRY')}
            </span>
          ) : (
            '-'
          )}
        </td>
        <td>
          {discountPercent ? (
            <Badge bg="danger" className="fw-bold">
              %{discountPercent} İndirim
            </Badge>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>
        <td>
          <StatusBadge status={campaign.isActive ? 'ACTIVE' : 'INACTIVE'} />
        </td>
        <td>
          <span className="small text-muted d-flex align-items-center gap-1">
            <Calendar size={13} />
            {formatDateTimeForText(campaign.startsAt)}
            {campaign.endsAt ? ` - ${formatDateTimeForText(campaign.endsAt)}` : ' (Süresiz)'}
          </span>
        </td>
        <td className="text-end">
          <div className="d-inline-flex align-items-center gap-1">
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
            <Button
              size="sm"
              variant="outline-danger"
              className="d-inline-flex align-items-center"
              onClick={() => setDeleteCampaignTarget(campaign)}
              title="Kampanyayı Sil"
            >
              <Trash2 size={14} />
            </Button>
          </div>
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
      {deleteCampaignTarget && (
        <DeleteModal
          title="Kampanyayı Sil"
          message={`"${deleteCampaignTarget.name}" adlı kampanyayı silmek istediğinizden emin misiniz?`}
          onClose={() => setDeleteCampaignTarget(null)}
          onHandleDelete={handleConfirmDelete}
        />
      )}
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
