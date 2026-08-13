"use client"
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Modal, Offcanvas, Row, Table } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getCronHint, getTjkModeText, getTjkScopeText, getTjkTriggerKindText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useCursorApi from '@/hooks/useCursorApi';
import useModal from '@/hooks/useModal';
import { tjkService, TjkRunResponse, TjkItemError } from '@/services/tjk.service';
import { jobService, JobResponse } from '@/services/job.service';
import { PageHeading } from '@/widgets';
import CursorPagination from '@/components/CursorPagination';
import { toast } from 'react-toastify';

const headItems = ['Tür', 'Durum', 'Kapsam', 'Başlatılma Şekli', 'Başlangıç', 'Bitiş / Süre', 'Sonuç', ''];

function isCancellable(status: string) {
  return status === 'QUEUED' || status === 'RUNNING';
}

function formatRunEnd(run: TjkRunResponse) {
  if (!run.completedAt) return '-';
  const startedAt = run.startedAt ? new Date(run.startedAt).getTime() : NaN;
  const completedAt = new Date(run.completedAt).getTime();
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) {
    return formatDateTimeForText(run.completedAt);
  }
  const totalSeconds = Math.round((completedAt - startedAt) / 1000);
  const duration = totalSeconds < 60
    ? `${totalSeconds} sn`
    : `${Math.floor(totalSeconds / 60)} dk ${totalSeconds % 60} sn`;
  return `${formatDateTimeForText(run.completedAt)} (${duration})`;
}

function formatRunResult(run: TjkRunResponse) {
  if (run.status === 'QUEUED' || run.status === 'RUNNING') return '-';
  return `Toplam ${run.totalCount} · Yeni ${run.createdCount} · Güncellenen ${run.updatedCount} · Değişmeyen ${run.unchangedCount} · Hata ${run.failedCount}`;
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
        <Offcanvas.Title>Şimdi Senkronize Et</Offcanvas.Title>
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
                <Form.Label>Senkronizasyon Türü</Form.Label>
                <Form.Check
                  type="radio"
                  name="mode"
                  id="tjk-mode-full"
                  value="FULL"
                  checked={values.mode === 'FULL'}
                  onChange={handleChange}
                  label={<><strong>Tam Senkronizasyon</strong><span className="d-block small text-muted">TJK’daki tüm at sayfaları baştan taranır ve kayıtlar TJK numarasına göre güncellenir.</span></>}
                />
                <details className="mt-3 border rounded p-2">
                  <summary className="fw-semibold">Gelişmiş seçenekler</summary>
                  <div className="mt-3 d-grid gap-3">
                    <Form.Check
                      type="radio"
                      name="mode"
                      id="tjk-mode-incremental"
                      value="INCREMENTAL"
                      checked={values.mode === 'INCREMENTAL'}
                      onChange={handleChange}
                      label={<><strong>Artımlı Senkronizasyon</strong><span className="d-block small text-muted">Mevcut işleyiş değişiklik penceresi kullanmaz; tüm TJK sayfalarını tam senkronizasyonla aynı şekilde tarar.</span></>}
                    />
                    <Form.Check
                      type="radio"
                      name="mode"
                      id="tjk-mode-reconciliation"
                      value="RECONCILIATION"
                      checked={values.mode === 'RECONCILIATION'}
                      onChange={handleChange}
                      label={<><strong>Kayıtları Yeniden Eşleştirme</strong><span className="d-block small text-muted">TJK kayıtlarını baştan tarayıp mevcut atlarla TJK numarasına göre yeniden eşleştirir; mevcut işleyişte tam senkronizasyonla aynı tarama yolunu kullanır.</span></>}
                    />
                  </div>
                </details>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Kapsam</Form.Label>
                <Form.Select name="scope" value={values.scope} onChange={handleChange}>
                  <option value="HORSES">Atlar</option>
                </Form.Select>
              </Form.Group>
              <Button disabled={!isValid || isSubmitting} variant="primary" as="input" type="submit" value="Senkronizasyonu Başlat" />
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
  const [showTransient, setShowTransient] = useState(true);

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

  const transientCount = items.filter((item) => item.errorClass === 'TRANSIENT').length;
  const displayedItems = showTransient ? items : items.filter((item) => item.errorClass !== 'TRANSIENT');

  return (
    <Modal show onHide={onClose} size="xl" centered dialogClassName="resizable-modal">
      <Modal.Header closeButton className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Modal.Title className="h5 mb-0">Senkron Hataları ve Uyarıları</Modal.Title>
          <Button
            size="sm"
            variant={showTransient ? "outline-secondary" : "warning"}
            className="ms-2 d-inline-flex align-items-center gap-1 fw-semibold"
            onClick={() => setShowTransient(!showTransient)}
          >
            <i className={showTransient ? "fe fe-eye-off" : "fe fe-eye"}></i>
            {showTransient ? "TRANSIENT Hatalarını Gizle" : "TRANSIENT Hatalarını Göster"}
            {transientCount > 0 && <Badge bg={showTransient ? "secondary" : "dark"} className="ms-1">{transientCount}</Badge>}
          </Button>
        </div>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        <Alert variant="info" className="py-2 small mb-3">
          <strong>Bilgilendirme:</strong> <code>TRANSIENT</code> uyarısı içeren kayıtlar geçici bildirimlerdir. TJK sitesinde o ata ait aşım/yavru verisi bulunmadığında veya anlık sunucu yanıt vermediğinde oluşur.
        </Alert>

        {loading && <Loading />}
        {!loading && loadError && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <span>{loadError}</span>
            <Button size="sm" variant="outline-danger" onClick={loadErrors}>Tekrar Dene</Button>
          </Alert>
        )}
        {!loading && !loadError && items.length === 0 && <p className="text-muted py-4 text-center">Bu koşuda hata kaydı yok.</p>}
        {!loading && !loadError && items.length > 0 && displayedItems.length === 0 && (
          <p className="text-muted py-4 text-center">TRANSIENT hataları gizlendi. Listelenecek kritik hata kaydı yok.</p>
        )}
        {!loading && !loadError && displayedItems.length > 0 && (
          <div className="table-responsive">
            <Table striped bordered hover size="sm" className="align-middle">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Durum</th>
                  <th style={{ width: '100px' }}>TJK No</th>
                  <th style={{ width: '130px' }}>Hata Türü</th>
                  <th>Detaylı Hata Mesajı</th>
                  <th style={{ width: '160px' }}>Tarih</th>
                  <th style={{ width: '150px' }} className="text-end">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item) => (
                  <tr key={item.id}>
                    <td><Badge bg={statusVariant(item.status)}>{errorStatusText(item.status)}</Badge></td>
                    <td className="fw-semibold">{item.tjkNumber ?? '-'}</td>
                    <td><Badge bg={item.errorClass === 'TRANSIENT' ? 'light' : 'danger'} className={item.errorClass === 'TRANSIENT' ? 'text-dark border' : 'text-white'}>{item.errorClass}</Badge></td>
                    <td style={{ wordBreak: 'break-word', minWidth: '300px' }}>{item.message}</td>
                    <td className="small text-muted">{formatDateTimeForText(item.createdAt)}</td>
                    <td className="text-end">
                      {item.status === 'OPEN' && (
                        <>
                          <Button size="sm" variant="success" className="me-1 py-0 px-2" onClick={() => handleAction(item.id, 'resolve')}>Çözüldü</Button>
                          <Button size="sm" variant="secondary" className="py-0 px-2" onClick={() => handleAction(item.id, 'ignore')}>Yoksay</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
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
  const [automaticJob, setAutomaticJob] = useState<JobResponse | null>(null);
  const [automaticLoading, setAutomaticLoading] = useState(true);
  const [automaticError, setAutomaticError] = useState<string | null>(null);

  const loadAutomaticJob = useCallback(() => {
    setAutomaticLoading(true);
    setAutomaticError(null);
    jobService.search({ filter: '', pageRequest: { page: 0, size: 100 } })
      .then((result) => {
        setAutomaticJob((result.content ?? []).find((job) => job.key === 'TJK_SYNC' && job.jobType === 'TJK_SYNC') ?? null);
      })
      .catch((error) => {
        setAutomaticJob(null);
        setAutomaticError(getErrorMessage(error));
      })
      .finally(() => setAutomaticLoading(false));
  }, []);

  useEffect(() => {
    loadAutomaticJob();
  }, [loadAutomaticJob]);

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
      <td>{run.startedAt ? formatDateTimeForText(run.startedAt) : 'Henüz başlamadı'}</td>
      <td>{formatRunEnd(run)}</td>
      <td className="small">{formatRunResult(run)}</td>
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
          <PageHeading heading="TJK Senkronizasyonu" showCreateButton={false} />
        </Col>
      </Row>
      <Row className="g-3 mb-4">
        <Col lg={7}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <Card.Title>Otomatik Senkronizasyon</Card.Title>
                  <Card.Text className="text-muted mb-0">Durum ve zamanlama, Zamanlanmış Görevler ayarından okunur.</Card.Text>
                </div>
                {!automaticLoading && automaticJob && (
                  <Badge bg={automaticJob.isActive ? 'success' : 'secondary'}>{automaticJob.isActive ? 'Aktif' : 'Pasif'}</Badge>
                )}
              </div>
              {automaticLoading && <div className="text-muted">Otomatik senkronizasyon durumu yükleniyor…</div>}
              {!automaticLoading && automaticError && (
                <Alert variant="danger" className="d-flex justify-content-between align-items-center mb-3">
                  <span>{automaticError}</span>
                  <Button size="sm" variant="outline-danger" onClick={loadAutomaticJob}>Tekrar Dene</Button>
                </Alert>
              )}
              {!automaticLoading && !automaticError && !automaticJob && (
                <Alert variant="warning">Otomatik TJK görev tanımı bulunamadı.</Alert>
              )}
              {!automaticLoading && automaticJob && (
                <div className="mb-3">
                  <div><strong>Çalışma zamanı:</strong> {getCronHint(automaticJob.cronExpression)}</div>
                  <div><strong>Sonraki çalışma:</strong> {automaticJob.isActive && automaticJob.nextRunAt ? formatDateTimeForText(automaticJob.nextRunAt) : 'Planlanmadı'}</div>
                  <div><strong>Otomatik çalışma türü:</strong> Tam Senkronizasyon</div>
                </div>
              )}
              <Button variant="outline-primary" href="/jobs">Zamanlanmış Görevler</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="h-100">
            <Card.Body className="d-flex flex-column">
              <Card.Title>Manuel Senkronizasyon</Card.Title>
              <Card.Text className="text-muted">Beklemeden yeni bir TJK senkronizasyonu başlatın.</Card.Text>
              <div className="mt-auto">
                <Button onClick={openTriggerModal} disabled={Boolean(hasActiveRun)}>Şimdi Senkronize Et</Button>
              </div>
            </Card.Body>
          </Card>
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
      <h2 className="h4 mb-3">Senkronizasyon Geçmişi</h2>
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
