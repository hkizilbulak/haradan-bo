"use client"
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Col, Container, Form, Modal, Offcanvas, Row, Table } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getTjkModeText, getTjkScopeText, getTjkTriggerKindText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useCursorApi from '@/hooks/useCursorApi';
import useModal from '@/hooks/useModal';
import { tjkService, TjkRunResponse, TjkItemError } from '@/services/tjk.service';
import { PageHeading } from '@/widgets';
import CursorPagination from '@/components/CursorPagination';
import { toast } from 'react-toastify';

const headItems = ['Mod', 'Durum', 'Kapsam', 'Tetik', 'Oluşturulma', ''];

function isCancellable(status: string) {
  return status === 'QUEUED' || status === 'RUNNING';
}

function errorStatusText(status?: string) {
  if (status === 'OPEN') return 'Açık';
  if (status === 'RESOLVED') return 'Çözüldü';
  if (status === 'IGNORED') return 'Yoksayıldı';
  return status ?? '-';
}

function TriggerModal({ onClose, onSave }: { onClose: () => void; onSave: (value: { mode: string; sourceAdapter: string; scope: string; }) => void; }) {
  const values = { mode: 'FULL', sourceAdapter: 'TJK_HTTP', scope: 'HORSES' };
  const schema = Yup.object().shape({
    mode: Yup.string().required(),
  });

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Manuel Senkron Başlat</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik
          initialValues={values}
          validationSchema={schema}
          onSubmit={(formValues) => onSave({ ...formValues, sourceAdapter: 'TJK_HTTP' })}
        >
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadErrors = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    tjkService.getItemErrors(runId)
      .then((data) => {
        setItems(data);
        setLoadError(null);
      })
      .catch((err) => {
        setItems([]);
        setLoadError(getErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [runId]);

  React.useEffect(() => {
    loadErrors();
  }, [loadErrors]);

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
        {!loading && loadError && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <span>{loadError}</span>
            <Button size="sm" variant="outline-danger" onClick={loadErrors}>Tekrar Dene</Button>
          </Alert>
        )}
        {!loading && !loadError && items.length === 0 && <p className="text-muted">Bu koşuda hata kaydı yok.</p>}
        {!loading && !loadError && items.length > 0 && (
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Durum</th>
                <th>TJK No</th>
                <th>Hata Türü</th>
                <th>Mesaj</th>
                <th>Tarih</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><Badge bg={statusVariant(item.status)}>{errorStatusText(item.status)}</Badge></td>
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
  const [{ data, isLoading, isRefreshing, isError, refetch, goNext, goPrev, canGoPrev, canGoNext, pageIndex }] = useCursorApi<TjkRunResponse>({
    service: tjkService,
    pageSize: 20,
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [errorsRunId, setErrorsRunId] = useState<string | null>(null);

  const hasActiveRun = data?.content?.some(
    (run) => run.status === 'QUEUED' || run.status === 'RUNNING'
  );

  useEffect(() => {
    if (!hasActiveRun) {
      return;
    }
    const id = window.setInterval(() => {
      refetch({ silent: true });
    }, 5000);
    return () => window.clearInterval(id);
  }, [hasActiveRun, refetch]);

  const openTriggerModal = () => {
    if (hasActiveRun) {
      toast.warning('Hali hazırda bekleyen veya çalışan bir senkronizasyon bulunmaktadır. Lütfen tamamlanmasını bekleyin veya mevcut işlemi iptal edin.');
      return;
    }
    openModal(<TriggerModal onClose={closeModal} onSave={handleTrigger} />);
  };

  const handleTrigger = async (values: { mode: string; sourceAdapter: string; scope: string; }) => {
    try {
      await tjkService.trigger(values.mode, values.sourceAdapter, values.scope);
      closeModal();
      toast.success('Senkron başlatma isteği alındı');
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCancel = async (run: TjkRunResponse) => {
    if (!isCancellable(run.status)) {
      return;
    }
    try {
      const latest = await tjkService.getById(run.id);
      const result = await tjkService.cancel(latest.id, latest.version) as TjkRunResponse | undefined;
      if (result?.status === 'CANCELLED') {
        toast.success('İptal edildi');
      } else {
        toast.success('İptal istendi');
      }
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
      <td>{getTjkTriggerKindText(run.triggerKind)}</td>
      <td>{formatDateTimeForText(run.createdAt)}</td>
      <td className="text-nowrap">
        <div className="d-flex flex-wrap gap-1">
        {isCancellable(run.status) && (
          <Button size="sm" variant="primary" onClick={() => handleCancel(run)}>İptal</Button>
        )}
        <Button size="sm" variant="outline-danger" onClick={() => setErrorsRunId(run.id)}>Hatalar</Button>
        </div>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading heading="TJK Senkron" createButtonText="Manuel Senkron Başlat" onCreate={openTriggerModal} />
        </Col>
      </Row>
      {hasActiveRun && (
        <Alert variant="info" className="mb-3 d-flex justify-content-between align-items-center">
          <span>Senkronizasyon devam ediyor. Durum otomatik olarak güncellenecektir.</span>
          {isRefreshing && <span className="small text-muted">Yenileniyor…</span>}
        </Alert>
      )}
      {isModalOpen && modalContent}
      {errorsRunId && <TjkErrorsModal runId={errorsRunId} onClose={() => setErrorsRunId(null)} />}
      {isLoading && !data && <Loading />}
      {!isLoading && isError && !data && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>TJK kayıtları yüklenirken bir hata oluştu.</span>
          <Button size="sm" variant="outline-danger" onClick={() => refetch()}>Tekrar Dene</Button>
        </Alert>
      )}
      {!isLoading && !isError && (data?.content?.length ?? 0) === 0 && (
        <Alert variant="light" className="border text-muted">Henüz TJK senkron kaydı yok. Manuel senkron başlatabilirsiniz.</Alert>
      )}
      {(data?.content?.length ?? 0) > 0 && (
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
