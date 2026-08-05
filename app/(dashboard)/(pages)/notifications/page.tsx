"use client"
import { Button, Col, Container, Form, Offcanvas, Row } from 'react-bootstrap';
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
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';

const headItems = ['Olay', 'Ad', 'Durum', 'Güncelleme', ''];

function TemplateModal({ template, onClose, onSave }: { template?: NotificationTemplateResponse; onClose: () => void; onSave: (value: NotificationTemplateRequest) => void; }) {
  const values: NotificationTemplateRequest = template ? {
    identifier: template.eventType,
    expectedVersion: template.version,
    name: template.name,
    inAppTitleTemplate: template.inAppTitleTemplate,
    inAppBodyTemplate: template.inAppBodyTemplate,
    emailSubjectFallback: template.emailSubjectFallback ?? '',
    isActive: template.isActive,
  } : {
    expectedVersion: 1,
    name: '',
    inAppTitleTemplate: '',
    inAppBodyTemplate: '',
    emailSubjectFallback: '',
    isActive: true,
  };

  const schema = Yup.object().shape({
    name: Yup.string().required('Ad zorunludur'),
    inAppTitleTemplate: Yup.string().required('Başlık şablonu zorunludur'),
    inAppBodyTemplate: Yup.string().required('İçerik şablonu zorunludur'),
  });

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Bildirim Şablonu</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik initialValues={values} validationSchema={schema} onSubmit={onSave}>
          {({ handleSubmit, handleChange, values, isValid, isSubmitting }) => (
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
                <Form.Label>E-posta Konu Fallback</Form.Label>
                <Form.Control name="emailSubjectFallback" value={values.emailSubjectFallback ?? ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="checkbox" name="isActive" label="Aktif" checked={values.isActive} onChange={handleChange} />
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

  const openTemplateModal = (template?: NotificationTemplateResponse) => {
    openModal(<TemplateModal template={template} onClose={closeModal} onSave={handleSave} />);
  };

  const handleSave = async (values: NotificationTemplateRequest) => {
    try {
      if (!values.identifier) {
        return;
      }
      await notificationTemplateService.update(values.identifier, values);
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const content = data?.content?.map((template) => (
    <tr key={template.id}>
      <td>{getNotificationEventTypeText(template.eventType)}</td>
      <td>{template.name}</td>
      <td><StatusBadge status={template.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td>{formatDateTimeForText(template.updatedAt)}</td>
      <td>
        <a className="font-medium text-cyan-600 me-5 cp" onClick={() => openTemplateModal(template)}>
          <i className="fe fe-edit"></i>
        </a>
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
      {isModalOpen && modalContent}
      {isLoading && <Loading />}
      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={() => undefined} />}
    </Container>
  );
}
