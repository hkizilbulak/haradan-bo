"use client"
import React, { useState } from 'react';
import { Badge, Button, Col, Container, Form, Modal, Offcanvas, Row, Table } from 'react-bootstrap';
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
import { tjkService, TjkRunResponse, TjkItemError } from '@/services/tjk.service';
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

function TjkErrorsModal({ runId, onClose }: { runId: string; onClose: () => void }) {
  const [items, setItems] = useState<TjkItemError[]>([]);
  const [loading, setLoading] = useState(true);

  const loadErrors = () => {
    setLoading(true);
    tjkService.getItemErrors(runId)
      .then(setItems)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    loadErrors();
  }, [runId]);

  const handleAction = async (errorId: string, action: 'ignore' | 'resolve') => {
    try {
      if (action === 'ignore') {
        await tjkService.ignoreError(errorId);
      } else {
        await tjkService.resolveError(errorId);
      }
      loadErrors();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'danger';
      case 'RESOLVED': return 'success';
      case 'IGNORED': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Modal show onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Senkron Hataları</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {loading && <Loading />}
        {!loading && items.length === 0 && <p className="text-muted">Bu koşuda hata kaydı yok.</p>}
        {!loading && items.length > 0 && (
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Durum</th>
                <th>TJK No</th>
                <th>Hata Sınıfı</th>
                <th>Mesaj</th>
                <th>Tarih</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><Badge bg={statusVariant(item.status)}>{item.status}</Badge></td>
                  <td>{item.tjkNumber ?? '-'}</td>
                  <td>{item.errorClass}</td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.message}>{item.message}</td>
                  <td>{formatDateTimeForText(item.createdAt)}</td>
                  <td>
                    {item.status === 'OPEN' && (
                      <>
                        <Button size="sm" variant="success" className="me-1" onClick={() => handleAction(item.id, 'resolve')}>Çözüldü</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleAction(item.id, 'ignore')}>Yoksay</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Kapat</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function TjkPage() {
  const [{ data, isLoading, refetch }] = useApi<TjkRunResponse>({
    service: tjkService,
    params: { filter: '', pageRequest: { page: 0, size: 100, sort: [{ direction: 'DESC', property: 'createdAt' }] } },
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [errorsRunId, setErrorsRunId] = useState<string | null>(null);

  const hasActiveRun = data?.content?.some(
    (run) => run.status === 'QUEUED' || run.status === 'RUNNING'
  );

  const openTriggerModal = () => {
    if (hasActiveRun) {
      toast.warning('Hali hazırda kuyrukta veya çalışan bir senkronizasyon bulunmaktadır. Lütfen tamamlanmasını bekleyin veya mevcut işlemi iptal edin.');
      return;
    }
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
        <Button size="sm" variant="outline-danger" onClick={() => setErrorsRunId(run.id)}>Hatalar</Button>
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
      {errorsRunId && <TjkErrorsModal runId={errorsRunId} onClose={() => setErrorsRunId(null)} />}
      {isLoading && <Loading />}
      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={() => undefined} />}
    </Container>
  );
}
