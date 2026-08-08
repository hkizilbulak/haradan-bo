"use client"
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Offcanvas, Row } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import Loading from '@/components/Loading';
import RichTextEditor from '@/components/RichTextEditor';
import SafeRichText from '@/components/SafeRichText';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText, toDateTimeLocalValue } from '@/helpers/DateUtils';
import { getCampaignEventTypeText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import { sanitizeRichHtml } from '@/helpers/sanitizeHtml';
import useCursorApi from '@/hooks/useCursorApi';
import useModal from '@/hooks/useModal';
import { campaignService, CampaignRequest, CampaignResponse } from '@/services/campaign.service';
import { packageService, PackageResponse } from '@/services/package.service';
import { providerEmailTemplateService, ProviderEmailTemplateSummary } from '@/services/provider-email-template.service';
import { PageHeading } from '@/widgets';
import CursorPagination from '@/components/CursorPagination';
import { toast } from 'react-toastify';

const headItems = ['Ad', 'Etkinlik', 'Başlık', 'Durum', 'Başlangıç', 'Bitiş', ''];

const initialValues: CampaignRequest = {
  code: '',
  name: '',
  eventType: 'PACKAGE_EXPIRY_1_DAY',
  title: '',
  currencyCode: 'TRY',
  startsAt: '',
  isActive: true,
  emailProviderTemplateId: '',
};

function PackageCodeSelect({
  name,
  label,
  value,
  packages,
  onChange,
}: {
  name: string;
  label: string;
  value?: string;
  packages: PackageResponse[];
  onChange: (e: React.ChangeEvent<any>) => void;
}) {
  const selected = value ?? '';
  const orphan = selected && !packages.some((pkg) => pkg.code === selected);
  return (
    <Form.Group className="mb-3">
      <Form.Label>{label}</Form.Label>
      <Form.Select name={name} value={selected} onChange={onChange}>
        <option value="">Seçilmedi</option>
        {orphan && <option value={selected}>Mevcut paket (katalogda bulunamadı)</option>}
        {packages.map((pkg) => (
          <option key={pkg.code} value={pkg.code}>
            {pkg.displayName}{pkg.isActive ? '' : ' — pasif'}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
}

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
  const values: CampaignRequest = selectedCampaign ? {
    identifier: selectedCampaign.id,
    expectedVersion: selectedCampaign.version,
    code: selectedCampaign.code,
    name: selectedCampaign.name,
    eventType: selectedCampaign.eventType,
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
    currencyCode: selectedCampaign.currencyCode,
    startsAt: toDateTimeLocalValue(selectedCampaign.startsAt),
    endsAt: toDateTimeLocalValue(selectedCampaign.endsAt),
    isActive: selectedCampaign.isActive,
  } : initialValues;

  const schema = Yup.object().shape({
    name: Yup.string().required('Ad zorunludur'),
    eventType: Yup.string().required('Etkinlik zorunludur'),
    title: Yup.string().required('Başlık zorunludur'),
    startsAt: Yup.string().required('Başlangıç zorunludur'),
    endsAt: Yup.string().test('end-after-start', 'Bitiş başlangıçtan sonra olmalı', function (end) {
      const { startsAt } = this.parent as { startsAt?: string };
      if (!end || !startsAt) {
        return true;
      }
      return end > startsAt;
    }),
  });

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end" style={{ width: 'min(900px, 100vw)' }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>{isNew ? 'Yeni Kampanya' : 'Kampanya Düzenle'}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik initialValues={values} validationSchema={schema} onSubmit={onSave}>
          {({ handleSubmit, handleChange, setFieldValue, values, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Ad</Form.Label>
                <Form.Control name="name" value={values.name} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Etkinlik</Form.Label>
                <Form.Select name="eventType" value={values.eventType} onChange={handleChange}>
                  <option value="PACKAGE_EXPIRY_1_DAY">Paket Bitiş 1 Gün</option>
                  <option value="PACKAGE_EXPIRY_5_DAYS">Paket Bitiş 5 Gün</option>
                  <option value="PACKAGE_RENEWAL">Paket Yenileme</option>
                  <option value="PACKAGE_UPGRADE">Paket Yükseltme</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Başlık</Form.Label>
                <Form.Control name="title" value={values.title} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Başlangıç</Form.Label>
                <Form.Control type="datetime-local" name="startsAt" value={values.startsAt} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Bitiş</Form.Label>
                <Form.Control type="datetime-local" name="endsAt" value={values.endsAt ?? ''} onChange={handleChange} />
              </Form.Group>
              <PackageCodeSelect
                name="sourcePackageCode"
                label="Kaynak Paket"
                value={values.sourcePackageCode}
                packages={packages}
                onChange={handleChange}
              />
              <PackageCodeSelect
                name="targetPackageCode"
                label="Hedef Paket"
                value={values.targetPackageCode}
                packages={packages}
                onChange={handleChange}
              />
              <Form.Group className="mb-3">
                <Form.Check type="checkbox" name="isActive" label="Aktif" checked={values.isActive} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Açıklama</Form.Label>
                <Form.Control as="textarea" rows={2} name="description" value={values.description ?? ''} onChange={handleChange} />
              </Form.Group>
              {providerLoading ? (
                <Alert variant="light" className="border">E-posta tasarım şablonları yükleniyor.</Alert>
              ) : providerUnavailable ? (
                <Alert variant="warning">
                  E-posta tasarım şablonları şu anda kullanılamıyor. Yedek e-posta alanlarını düzenleyip kaydedebilirsiniz.
                </Alert>
              ) : providerTemplates.length === 0 ? (
                <Alert variant="info">Kullanılabilir e-posta tasarım şablonu bulunmuyor. Yedek e-posta alanlarını kullanabilirsiniz.</Alert>
              ) : (
                <Form.Group className="mb-3">
                  <Form.Label>E-posta Tasarım Şablonu</Form.Label>
                  <Form.Select name="emailProviderTemplateId" value={values.emailProviderTemplateId ?? ''} onChange={handleChange}>
                    <option value="">Şablon seçilmedi</option>
                    {values.emailProviderTemplateId
                      && !providerTemplates.some((item) => item.id === values.emailProviderTemplateId) && (
                      <option value={values.emailProviderTemplateId}>Mevcut şablon (listede bulunamadı)</option>
                    )}
                    {providerTemplates.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </Form.Select>
                  <Form.Text muted>Zengin e-posta tasarımı için kullanılacak şablonu seçin.</Form.Text>
                </Form.Group>
              )}
              <Form.Group className="mb-3">
                <Form.Label>E-posta Konu (Yedek)</Form.Label>
                <Form.Control name="emailSubject" value={values.emailSubject ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>E-posta Başlık (Yedek)</Form.Label>
                <Form.Control name="emailHeading" value={values.emailHeading ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>E-posta İçerik (Yedek)</Form.Label>
                <RichTextEditor
                  value={values.emailBody ?? ''}
                  onChange={(next) => void setFieldValue('emailBody', next)}
                />
                <Form.Text muted>
                  Tasarım şablonu yoksa kullanılan güvenli zengin metin. Görsel e-posta düzeni tasarım şablonundadır.
                </Form.Text>
              </Form.Group>
              <FallbackEmailPreview value={values} />
              <Button disabled={!isValid || isSubmitting} variant="primary" as="input" type="submit" value={isNew ? 'Ekle' : 'Güncelle'} />
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function CampaignsPage() {
  const [{
    data,
    isLoading,
    isError,
    refetch,
    goNext,
    goPrev,
    canGoPrev,
    canGoNext,
    pageIndex,
  }] = useCursorApi<CampaignResponse>({
    service: campaignService,
    pageSize: 20,
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [packages, setPackages] = useState<PackageResponse[]>([]);
  const [providerTemplates, setProviderTemplates] = useState<ProviderEmailTemplateSummary[]>([]);
  const [providerLoading, setProviderLoading] = useState(true);
  const [providerUnavailable, setProviderUnavailable] = useState(false);

  useEffect(() => {
    packageService
      .search({ filter: '', pageRequest: { page: 0, size: 200, sort: [{ direction: 'ASC', property: 'sortOrder' }] } })
      .then((page) => setPackages(page.content ?? []))
      .catch((error) => toast.error(getErrorMessage(error)));
  }, []);

  useEffect(() => {
    providerEmailTemplateService.list()
      .then((items) => {
        setProviderTemplates(items);
        setProviderUnavailable(false);
        setProviderLoading(false);
      })
      .catch((error) => {
        setProviderTemplates([]);
        setProviderLoading(false);
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const code = axios.isAxiosError(error) ? (error.response?.data as { code?: string } | undefined)?.code : undefined;
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
      />,
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
      } else {
        await campaignService.create(payload);
      }
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const rows = data?.content ?? [];
  const content = rows.map((campaign) => (
    <tr key={campaign.id}>
      <td>{campaign.name}</td>
      <td>{getCampaignEventTypeText(campaign.eventType)}</td>
      <td>{campaign.title}</td>
      <td><StatusBadge status={campaign.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td>{formatDateTimeForText(campaign.startsAt)}</td>
      <td>{campaign.endsAt ? formatDateTimeForText(campaign.endsAt) : '-'}</td>
      <td>
        <a className="font-medium text-cyan-600 me-5 cp" onClick={() => openCampaignModal(campaign)}>
          <i className="fe fe-edit"></i>
        </a>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading heading="Kampanyalar" createButtonText="Kampanya Ekle" onCreate={() => openCampaignModal(undefined)} />
        </Col>
      </Row>
      {isModalOpen && modalContent}
      {isLoading && <Loading />}
      {!isLoading && isError && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Kampanyalar yüklenirken bir hata oluştu.</span>
          <Button size="sm" variant="outline-danger" onClick={() => refetch()}>Tekrar Dene</Button>
        </Alert>
      )}
      {!isLoading && !isError && rows.length === 0 && (
        <Alert variant="light" className="border text-muted">Henüz kampanya oluşturulmamış. İlk kampanyayı ekleyebilirsiniz.</Alert>
      )}
      {!isLoading && !isError && rows.length > 0 && (
        <>
          <PrepareTable headItems={headItems} content={content} page={undefined} onHandlePageChange={() => undefined} />
          <CursorPagination
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onPrev={goPrev}
            onNext={goNext}
            pageIndex={pageIndex}
          />
        </>
      )}
    </Container>
  );
}
