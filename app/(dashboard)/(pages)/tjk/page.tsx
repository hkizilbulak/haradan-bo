"use client"
import { Button, Col, Container, Form, Offcanvas, Row } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getTjkModeText, getTjkScopeText, getTjkTriggerKindText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { tjkService, TjkRunResponse } from '@/services/tjk.service';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';

const headItems = ['Mod', 'Durum', 'Kapsam', 'Kaynak', 'Tetik', 'Oluşturulma', ''];

function TriggerModal({ onClose, onSave }: { onClose: () => void; onSave: (value: { mode: string; sourceAdapter: string; scope: string; }) => void; }) {
  const values = { mode: 'FULL', sourceAdapter: 'TJK_HTTP', scope: 'HORSES' };
  const schema = Yup.object().shape({
    mode: Yup.string().required(),
    sourceAdapter: Yup.string().required(),
  });

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>TJK Senkron Başlat</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik initialValues={values} validationSchema={schema} onSubmit={onSave}>
          {({ handleSubmit, handleChange, values, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Mod</Form.Label>
                <Form.Select name="mode" value={values.mode} onChange={handleChange}>
                  <option value="FULL">Tam</option>
                  <option value="INCREMENTAL">Artımlı</option>
                  <option value="RECONCILIATION">Mutabakat</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Kaynak</Form.Label>
                <Form.Control name="sourceAdapter" value={values.sourceAdapter} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Kapsam</Form.Label>
                <Form.Select name="scope" value={values.scope} onChange={handleChange}>
                  <option value="HORSES">Atlar</option>
                </Form.Select>
              </Form.Group>
              <Button disabled={!isValid || isSubmitting} variant="primary" as="input" type="submit" value="Başlat" />
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function TjkPage() {
  const [{ data, isLoading, refetch }] = useApi<TjkRunResponse>({
    service: tjkService,
    params: { filter: '', pageRequest: { page: 0, size: 100, sort: [{ direction: 'DESC', property: 'createdAt' }] } },
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();

  const openTriggerModal = () => {
    openModal(<TriggerModal onClose={closeModal} onSave={handleTrigger} />);
  };

  const handleTrigger = async (values: { mode: string; sourceAdapter: string; scope: string; }) => {
    try {
      await tjkService.trigger(values.mode, values.sourceAdapter, values.scope);
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCancel = async (run: TjkRunResponse) => {
    try {
      await tjkService.cancel(run.id, run.version);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const content = data?.content?.map((run) => (
    <tr key={run.id}>
      <td>{getTjkModeText(run.mode)}</td>
      <td><StatusBadge status={run.status} /></td>
      <td>{getTjkScopeText(run.scope)}</td>
      <td>{run.sourceAdapter}</td>
      <td>{getTjkTriggerKindText(run.triggerKind)}</td>
      <td>{formatDateTimeForText(run.createdAt)}</td>
      <td>
        <Button size="sm" className="me-2" variant="primary" onClick={() => handleCancel(run)}>İptal</Button>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading heading="TJK Senkron" createButtonText="Senkron Başlat" onCreate={openTriggerModal} />
        </Col>
      </Row>
      {isModalOpen && modalContent}
      {isLoading && <Loading />}
      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={() => undefined} />}
    </Container>
  );
}
