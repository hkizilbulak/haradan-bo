"use client"
import { Button, Col, Container, Form, Offcanvas, Row } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getCampaignEventTypeText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { campaignService, CampaignRequest, CampaignResponse } from '@/services/campaign.service';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';

const headItems = ['Kod', 'Ad', 'Etkinlik', 'Başlık', 'Durum', 'Başlangıç', ''];

const initialValues: CampaignRequest = {
  code: '',
  name: '',
  eventType: 'PACKAGE_EXPIRY_1_DAY',
  title: '',
  currencyCode: 'TRY',
  startsAt: '',
  isActive: true,
};

function CampaignModal({ selectedCampaign, onClose, onSave }: { selectedCampaign?: CampaignResponse; onClose: () => void; onSave: (value: CampaignRequest) => void; }) {
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
    ctaLabel: selectedCampaign.ctaLabel ?? '',
    ctaUrl: selectedCampaign.ctaUrl ?? '',
    badgeText: selectedCampaign.badgeText ?? '',
    imageAssetId: selectedCampaign.imageAssetId ?? '',
    originalAmountMinor: selectedCampaign.originalPrice?.amountMinor,
    campaignAmountMinor: selectedCampaign.campaignPrice?.amountMinor,
    currencyCode: selectedCampaign.currencyCode,
    startsAt: selectedCampaign.startsAt.slice(0, 16),
    endsAt: selectedCampaign.endsAt?.slice(0, 16) ?? '',
    isActive: selectedCampaign.isActive,
  } : initialValues;

  const schema = Yup.object().shape({
    code: Yup.string().required('Kod zorunludur'),
    name: Yup.string().required('Ad zorunludur'),
    eventType: Yup.string().required('Etkinlik zorunludur'),
    title: Yup.string().required('Başlık zorunludur'),
    startsAt: Yup.string().required('Başlangıç zorunludur'),
  });

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>{isNew ? 'Yeni Kampanya' : 'Kampanya Düzenle'}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik initialValues={values} validationSchema={schema} onSubmit={onSave}>
          {({ handleSubmit, handleChange, values, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Kod</Form.Label>
                <Form.Control name="code" value={values.code ?? ''} onChange={handleChange} disabled={!isNew} />
              </Form.Group>
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
              <Form.Group className="mb-3">
                <Form.Label>Kaynak Paket</Form.Label>
                <Form.Control name="sourcePackageCode" value={values.sourcePackageCode ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Hedef Paket</Form.Label>
                <Form.Control name="targetPackageCode" value={values.targetPackageCode ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Para Birimi</Form.Label>
                <Form.Control name="currencyCode" value={values.currencyCode} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="checkbox" name="isActive" label="Aktif" checked={values.isActive} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Açıklama</Form.Label>
                <Form.Control as="textarea" rows={2} name="description" value={values.description ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>E-posta Konu</Form.Label>
                <Form.Control name="emailSubject" value={values.emailSubject ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>E-posta Başlık</Form.Label>
                <Form.Control name="emailHeading" value={values.emailHeading ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>E-posta İçerik</Form.Label>
                <Form.Control as="textarea" rows={4} name="emailBody" value={values.emailBody ?? ''} onChange={handleChange} />
              </Form.Group>
              <Button disabled={!isValid || isSubmitting} variant="primary" as="input" type="submit" value={isNew ? 'Ekle' : 'Güncelle'} />
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function CampaignsPage() {
  const [{ data, isLoading, refetch }] = useApi<CampaignResponse>({
    service: campaignService,
    params: {
      filter: '',
      pageRequest: { page: 0, size: 100, sort: [{ direction: 'DESC', property: 'createdAt' }] },
    },
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();

  const openCampaignModal = (campaign?: CampaignResponse) => {
    openModal(<CampaignModal selectedCampaign={campaign} onClose={closeModal} onSave={handleSave} />);
  };

  const handleSave = async (values: CampaignRequest) => {
    try {
      if (values.identifier) {
        await campaignService.update(values);
      } else {
        await campaignService.create(values);
      }
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const content = data?.content?.map((campaign) => (
    <tr key={campaign.id}>
      <td>{campaign.code}</td>
      <td>{campaign.name}</td>
      <td>{getCampaignEventTypeText(campaign.eventType)}</td>
      <td>{campaign.title}</td>
      <td><StatusBadge status={campaign.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td>{formatDateTimeForText(campaign.createdAt)}</td>
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
      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={() => undefined} />}
    </Container>
  );
}
