"use client"
import { useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Form, Offcanvas, Row, Badge } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getNotificationEventTypeText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { notificationTemplateService, NotificationTemplateRequest, NotificationTemplateResponse } from '@/services/notification-template.service';
import { providerEmailTemplateService, ProviderEmailTemplateSummary } from '@/services/provider-email-template.service';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';
import { Edit } from 'react-feather';
import axios from 'axios';

const headItems = ['Olay', 'Ad', 'E-posta Tasarım Şablonu', 'Durum', 'Güncelleme', ''];

function formatTemplateUpdatedAt(createdAt?: string | null, updatedAt?: string | null) {
  if (!updatedAt) {
    return 'Henüz düzenlenmedi';
  }
  if (createdAt) {
    const createdMs = Date.parse(createdAt);
    const updatedMs = Date.parse(updatedAt);
    if (
      !Number.isNaN(createdMs)
      && !Number.isNaN(updatedMs)
      && Math.abs(updatedMs - createdMs) < 1000
    ) {
      return 'Sistem varsayılanı';
    }
  }
  return formatDateTimeForText(updatedAt);
}

function TemplateModal({
  template,
  providerTemplates,
  providerUnavailable,
  onClose,
  onSave,
}: {
  template?: NotificationTemplateResponse;
  providerTemplates: ProviderEmailTemplateSummary[];
  providerUnavailable: boolean;
  onClose: () => void;
  onSave: (value: NotificationTemplateRequest) => void;
}) {
  const [variables, setVariables] = useState<string[]>([]);
  const [variablesLoading, setVariablesLoading] = useState(false);

  const values: NotificationTemplateRequest = template ? {
    identifier: template.eventType,
    expectedVersion: template.version,
    name: template.name,
    inAppTitleTemplate: template.inAppTitleTemplate,
    inAppBodyTemplate: template.inAppBodyTemplate,
    resendTemplateId: template.resendTemplateId ?? '',
    emailSubjectFallback: template.emailSubjectFallback ?? '',
    isActive: template.isActive,
  } : {
    expectedVersion: 1,
    name: '',
    inAppTitleTemplate: '',
    inAppBodyTemplate: '',
    resendTemplateId: '',
    emailSubjectFallback: '',
    isActive: true,
  };

  const schema = Yup.object().shape({
    name: Yup.string().required('Ad zorunludur'),
    inAppTitleTemplate: Yup.string().required('Başlık şablonu zorunludur'),
    inAppBodyTemplate: Yup.string().required('İçerik şablonu zorunludur'),
  });

  const loadVariables = async (templateId?: string | null) => {
    if (!templateId) {
      setVariables([]);
      return;
    }
    setVariablesLoading(true);
    try {
      const result = await providerEmailTemplateService.getVariables(templateId);
      setVariables(result);
    } catch (error) {
      setVariables([]);
      toast.error(getErrorMessage(error));
    } finally {
      setVariablesLoading(false);
    }
  };

  useEffect(() => {
    void loadVariables(template?.resendTemplateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Bildirim Şablonu</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik initialValues={values} validationSchema={schema} onSubmit={onSave}>
          {({ handleSubmit, handleChange, values, setFieldValue, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Ad</Form.Label>
                <Form.Control name="name" value={values.name} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Uygulama Başlık Şablonu</Form.Label>
                <Form.Control name="inAppTitleTemplate" value={values.inAppTitleTemplate} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Uygulama İçerik Şablonu</Form.Label>
                <Form.Control as="textarea" rows={4} name="inAppBodyTemplate" value={values.inAppBodyTemplate} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>E-posta Tasarım Şablonu</Form.Label>
                <Form.Select
                  name="resendTemplateId"
                  value={values.resendTemplateId ?? ''}
                  disabled={providerUnavailable && providerTemplates.length === 0}
                  onChange={async (event) => {
                    handleChange(event);
                    await loadVariables(event.target.value || null);
                  }}
                >
                  <option value="">Şablon seçilmedi</option>
                  {providerTemplates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.alias ? ` (${item.alias})` : ''}
                    </option>
                  ))}
                </Form.Select>
                {providerUnavailable && (
                  <Form.Text muted>
                    E-posta sağlayıcısı kullanılamadığı için şablon listesi boş. Uygulama içi şablonlar yine de kaydedilebilir.
                  </Form.Text>
                )}
              </Form.Group>
              {(variablesLoading || variables.length > 0) && (
                <div className="mb-3">
                  <Form.Label>Şablon Değişkenleri</Form.Label>
                  {variablesLoading && <Loading />}
                  {!variablesLoading && (
                    <div className="d-flex flex-wrap gap-1">
                      {variables.map((variable) => (
                        <Badge bg="light" text="dark" key={variable}>{variable}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <Form.Group className="mb-3">
                <Form.Label>Yedek Konu</Form.Label>
                <Form.Control name="emailSubjectFallback" value={values.emailSubjectFallback ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="isActive"
                  label="Aktif"
                  checked={values.isActive}
                  onChange={(event) => void setFieldValue('isActive', event.target.checked)}
                />
              </Form.Group>
              <Button disabled={!isValid || isSubmitting} variant="primary" as="input" type="submit" value="Kaydet" />
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function NotificationsPage() {
  const [{ data, isLoading, refetch }] = useApi<NotificationTemplateResponse>({
    service: notificationTemplateService,
    params: { filter: '', pageRequest: { page: 0, size: 100, sort: [{ direction: 'ASC', property: 'eventType' }] } },
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [providerTemplates, setProviderTemplates] = useState<ProviderEmailTemplateSummary[]>([]);
  const [providerUnavailable, setProviderUnavailable] = useState(false);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);

  useEffect(() => {
    providerEmailTemplateService.list()
      .then((items) => {
        setProviderTemplates(items.filter((item) => item.name.toLowerCase().includes('haradan')));
        setProviderUnavailable(false);
        setProviderMessage(null);
      })
      .catch((error) => {
        setProviderTemplates([]);
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const code = axios.isAxiosError(error) ? (error.response?.data as { code?: string } | undefined)?.code : undefined;
        if (status === 503 || code === 'DEPENDENCY_UNAVAILABLE') {
          setProviderUnavailable(true);
          setProviderMessage(getErrorMessage(error) || 'E-posta sağlayıcısı yapılandırılmamış.');
          return;
        }
        setProviderUnavailable(true);
        setProviderMessage(getErrorMessage(error));
        toast.error(getErrorMessage(error));
      });
  }, []);

  const openTemplateModal = (template?: NotificationTemplateResponse) => {
    openModal(
      <TemplateModal
        template={template}
        providerTemplates={providerTemplates}
        providerUnavailable={providerUnavailable}
        onClose={closeModal}
        onSave={handleSave}
      />,
    );
  };

  const handleSave = async (values: NotificationTemplateRequest) => {
    try {
      if (!values.identifier) {
        return;
      }
      await notificationTemplateService.update(values.identifier, values);
      closeModal();
      refetch();
      toast.success('Şablon güncellendi');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const content = data?.content?.map((template) => (
    <tr key={template.id}>
      <td>{getNotificationEventTypeText(template.eventType)}</td>
      <td>{template.name}</td>
      <td>{template.resendTemplateId || '-'}</td>
      <td><StatusBadge status={template.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td>{formatTemplateUpdatedAt(template.createdAt, template.updatedAt)}</td>
      <td>
        <Button
          size="sm"
          variant="outline-primary"
          title="Düzenle"
          aria-label="Düzenle"
          onClick={() => openTemplateModal(template)}
        >
          <Edit size={14} />
        </Button>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading heading="Bildirim Şablonları" showCreateButton={false} />
        </Col>
      </Row>
      {providerUnavailable && (
        <Alert variant="warning" className="mb-3">
          {providerMessage || 'E-posta sağlayıcısı şu anda kullanılamıyor.'}
          {' '}Uygulama içi şablonları düzenleyebilirsiniz; sağlayıcı e-posta şablon listesi geçici olarak kullanılamaz.
        </Alert>
      )}
      {isModalOpen && modalContent}
      {isLoading && <Loading />}
      {!isLoading && <PrepareTable headItems={headItems} content={content} page={undefined} onHandlePageChange={() => undefined} />}
    </Container>
  );
}
