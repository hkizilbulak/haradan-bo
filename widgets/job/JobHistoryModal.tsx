"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button, Badge, Row, Col, Card, Table, Alert, Spinner } from 'react-bootstrap';
import { Eye, EyeOff, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Layers } from 'react-feather';
import { toast } from 'react-toastify';
import { Job, JobHistory } from '@/models/job-models';
import { tjkService, TjkRunResponse, TjkItemError } from '@/services/tjk.service';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import { getTjkModeText, getTjkScopeText, getTjkTriggerKindText } from '@/helpers/EnumUtils';
import Loading from '@/components/Loading';

interface JobHistoryModalProps {
  show: boolean;
  history: JobHistory;
  job?: Job | null;
  onHide: () => void;
}

const EXECUTION_TYPE_LABELS: Record<string, string> = {
  SCHEDULED: 'Zamanlanmış',
  scheduled: 'Zamanlanmış',
  MANUAL: 'Manuel',
  manual: 'Manuel',
  manual_backfill: 'Geriye Dönük Manuel',
};

function formatReferenceDate(value?: string): string {
  if (!value) return '-';
  const datePart = value.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  }
  return value;
}

function getExecutionTypeLabel(value?: string): string {
  if (!value) return '-';
  return EXECUTION_TYPE_LABELS[value] || value;
}

function getStatusBadge(status: string) {
  switch (status?.toUpperCase()) {
    case 'SUCCEEDED':
    case 'SUCCESS':
      return <Badge bg="success">Başarılı</Badge>;
    case 'FAILED':
    case 'DEAD':
      return <Badge bg="danger">Başarısız</Badge>;
    case 'RUNNING':
    case 'LEASED':
      return <Badge bg="warning" text="dark">Çalışıyor</Badge>;
    case 'QUEUED':
      return <Badge bg="info">Kuyrukta</Badge>;
    case 'CANCELLED':
      return <Badge bg="secondary">İptal Edildi</Badge>;
    case 'TIMEOUT':
      return <Badge bg="secondary">Zaman Aşımı</Badge>;
    default:
      return <Badge bg="light" text="dark">{status}</Badge>;
  }
}

function errorStatusText(status?: string) {
  if (status === 'OPEN') return 'Açık';
  if (status === 'RESOLVED') return 'Çözüldü';
  if (status === 'IGNORED') return 'Yoksayıldı';
  return status ?? '-';
}

function errorStatusVariant(status?: string) {
  switch (status) {
    case 'OPEN': return 'danger';
    case 'RESOLVED': return 'success';
    case 'IGNORED': return 'secondary';
    default: return 'secondary';
  }
}

const JobHistoryModal = ({ show, history, job, onHide }: JobHistoryModalProps) => {
  const startTime = history?.startedAt || history?.start_time || history?.createdAt || history?.created_at;
  const endTime = history?.completedAt || history?.end_time;
  const errorText = history?.lastError || history?.error_summary;
  const processedCount = history?.processedCount ?? history?.processed_count ?? 0;
  const execType = history?.executionType || history?.execution_type;
  const refDate = history?.referenceDate || history?.reference_date;
  const execNode = history?.executionNode || history?.execution_node;
  const triggeredByUser = history?.triggeredByUserId || history?.triggered_by_user_id;

  const isTjkJob =
    job?.key === 'TJK_SYNC' ||
    job?.job_key === 'TJK_SYNC' ||
    job?.jobType === 'TJK_SYNC' ||
    job?.job_type === 'TJK_SYNC' ||
    Boolean(history?.tjkSyncRunId || history?.tjk_sync_run_id);

  const tjkRunId = history?.tjkSyncRunId || history?.tjk_sync_run_id || history?.id;

  const [tjkRun, setTjkRun] = useState<TjkRunResponse | null>(null);
  const [tjkErrors, setTjkErrors] = useState<TjkItemError[]>([]);
  const [loadingTjk, setLoadingTjk] = useState(false);
  const [showTransient, setShowTransient] = useState(true);

  const fetchTjkDetails = useCallback(async () => {
    if (!isTjkJob || !tjkRunId) return;
    try {
      setLoadingTjk(true);
      const [runData, errorsData] = await Promise.all([
        tjkService.getById(tjkRunId).catch(() => null),
        tjkService.getItemErrors(tjkRunId).catch(() => []),
      ]);
      setTjkRun(runData);
      setTjkErrors(errorsData);
    } catch (err) {
      console.warn('TJK detayları alınırken hata:', err);
    } finally {
      setLoadingTjk(false);
    }
  }, [isTjkJob, tjkRunId]);

  useEffect(() => {
    if (show && isTjkJob) {
      fetchTjkDetails();
    }
  }, [show, isTjkJob, fetchTjkDetails]);

  const handleAction = async (errorId: string, action: 'ignore' | 'resolve') => {
    try {
      if (action === 'ignore') {
        await tjkService.ignoreError(errorId);
        toast.success('Hata yoksayıldı');
      } else {
        await tjkService.resolveError(errorId);
        toast.success('Hata çözüldü olarak işaretlendi');
      }
      fetchTjkDetails();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const transientCount = tjkErrors.filter((item) => item.errorClass === 'TRANSIENT').length;
  const displayedErrors = showTransient
    ? tjkErrors
    : tjkErrors.filter((item) => item.errorClass !== 'TRANSIENT');

  return (
    <Modal
      show={show}
      onHide={onHide}
      fullscreen="md-down"
      centered
      dialogClassName="job-detail-modal"
    >
      <Modal.Header closeButton className="py-2 py-md-3 px-3 px-md-4">
        <Modal.Title className="h5 mb-0 fw-bold">
          {job?.name ? `${job.name} Detayları` : 'Görev Çalışma Detayları'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3 p-md-4" style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
        {/* Temel Bilgiler */}
        <Card className="border bg-light mb-3 shadow-none">
          <Card.Body className="p-3">
            <Row className="g-3">
              <Col xs={6} sm={6} md={3}>
                <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  Durum
                </div>
                <div className="mt-1">{getStatusBadge(history?.status)}</div>
              </Col>
              <Col xs={6} sm={6} md={3}>
                <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  Çalıştırma Türü
                </div>
                <div className="text-dark mt-1 text-truncate" style={{ fontSize: '0.88rem' }} title={getExecutionTypeLabel(execType)}>
                  {getExecutionTypeLabel(execType)}
                </div>
              </Col>
              <Col xs={6} sm={6} md={3}>
                <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  Başlangıç Zamanı
                </div>
                <div className="text-dark mt-1" style={{ fontSize: '0.85rem' }}>
                  {startTime ? new Date(startTime).toLocaleString('tr-TR') : '-'}
                </div>
              </Col>
              <Col xs={6} sm={6} md={3}>
                <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  Bitiş Zamanı
                </div>
                <div className="text-dark mt-1" style={{ fontSize: '0.85rem' }}>
                  {endTime ? new Date(endTime).toLocaleString('tr-TR') : '-'}
                </div>
              </Col>
              {!isTjkJob && (
                <Col xs={6} sm={6} md={3}>
                  <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                    İşlenen Kayıt
                  </div>
                  <div className="mt-1">
                    <Badge bg="dark" className="fs-6 px-2 py-1 fw-normal">
                      {processedCount}
                    </Badge>
                  </div>
                </Col>
              )}
              {refDate && (
                <Col xs={6} sm={6} md={3}>
                  <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                    Referans Tarihi
                  </div>
                  <div className="text-dark mt-1" style={{ fontSize: '0.85rem' }}>
                    {formatReferenceDate(refDate)}
                  </div>
                </Col>
              )}
              {execNode && (
                <Col xs={12} sm={6} md={3}>
                  <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                    Sunucu
                  </div>
                  <div className="mt-1"><code>{execNode}</code></div>
                </Col>
              )}
            </Row>
          </Card.Body>
        </Card>

        {/* TJK Detayları ve İstatistikleri */}
        {isTjkJob && (
          <div className="mt-3 mt-md-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="fw-bold mb-0 text-dark">
                📊 Senkronizasyon İstatistikleri
              </h6>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={fetchTjkDetails}
                disabled={loadingTjk}
                className="d-flex align-items-center py-1 px-2"
                title="İstatistikleri Yenile"
              >
                <RefreshCw size={12} className={`me-1 ${loadingTjk ? 'spin' : ''}`} />
                <span className="d-none d-sm-inline">Yenile</span>
              </Button>
            </div>

            {loadingTjk && <Loading />}

            {!loadingTjk && tjkRun && (
              <Row className="g-2 g-md-3 mb-3 text-center">
                <Col xs={4} md={4}>
                  <Card className="border shadow-none h-100 bg-primary-subtle">
                    <Card.Body className="p-2 p-md-3 d-flex flex-column justify-content-center">
                      <div className="fs-4 fw-bold text-primary">{tjkRun.totalCount}</div>
                      <div className="text-muted small">Toplam Kayıt</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={4} md={4}>
                  <Card className="border shadow-none h-100 bg-success-subtle">
                    <Card.Body className="p-2 p-md-3 d-flex flex-column justify-content-center">
                      <div className="fs-4 fw-bold text-success">{tjkRun.createdCount}</div>
                      <div className="text-muted small">Yeni Eklenen</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={4} md={4}>
                  <Card className="border shadow-none h-100 bg-info-subtle">
                    <Card.Body className="p-2 p-md-3 d-flex flex-column justify-content-center">
                      <div className="fs-4 fw-bold text-info">{tjkRun.updatedCount}</div>
                      <div className="text-muted small">Güncellenen</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={4} md={4}>
                  <Card className="border shadow-none h-100 bg-light">
                    <Card.Body className="p-2 p-md-3 d-flex flex-column justify-content-center">
                      <div className="fs-4 fw-bold text-secondary">{tjkRun.unchangedCount}</div>
                      <div className="text-muted small">Değişmeyen</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={4} md={4}>
                  <Card className="border shadow-none h-100 bg-danger-subtle">
                    <Card.Body className="p-2 p-md-3 d-flex flex-column justify-content-center">
                      <div className="fs-4 fw-bold text-danger">{tjkRun.failedCount}</div>
                      <div className="text-muted small">Hatalı</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={4} md={4}>
                  <Card className="border shadow-none h-100 bg-warning-subtle">
                    <Card.Body className="p-2 p-md-3 d-flex flex-column justify-content-center">
                      <div className="fs-4 fw-bold text-warning-emphasis">{tjkRun.skippedCount}</div>
                      <div className="text-muted small">Atlanan</div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* TJK Hata Kayıtları Tablosu / Listesi */}
            <div className="mt-3 mt-md-4">
              <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                <h6 className="fw-bold mb-0 text-dark">⚠️ Hatalar ve Uyarılar ({tjkErrors.length})</h6>
                {tjkErrors.length > 0 && (
                  <Button
                    size="sm"
                    variant={showTransient ? "outline-secondary" : "warning"}
                    className="d-inline-flex align-items-center gap-1 py-1 px-2 fw-semibold"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => setShowTransient(!showTransient)}
                  >
                    {showTransient ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showTransient ? "TRANSIENT Gizle" : "TRANSIENT Göster"}</span>
                    {transientCount > 0 && (
                      <Badge bg={showTransient ? "secondary" : "dark"} className="ms-1">
                        {transientCount}
                      </Badge>
                    )}
                  </Button>
                )}
              </div>

              {tjkErrors.length === 0 && !loadingTjk && (
                <div className="text-muted p-3 text-center bg-light rounded small">
                  Bu senkronizasyon işleminde kaydedilmiş herhangi bir hata veya uyarı bulunmamaktadır.
                </div>
              )}

              {displayedErrors.length > 0 && (
                <>
                  {/* Desktop Tablo Görünümü (md ve üzeri) */}
                  <div className="table-responsive border rounded d-none d-md-block">
                    <Table striped bordered hover size="sm" className="mb-0 align-middle">
                      <thead className="table-light small">
                        <tr>
                          <th style={{ width: '85px' }}>Durum</th>
                          <th style={{ width: '95px' }}>TJK No</th>
                          <th style={{ width: '110px' }}>Hata Türü</th>
                          <th>Hata Mesajı</th>
                          <th style={{ width: '140px' }}>Tarih</th>
                          <th style={{ width: '130px' }} className="text-end">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="small">
                        {displayedErrors.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <Badge bg={errorStatusVariant(item.status)}>
                                {errorStatusText(item.status)}
                              </Badge>
                            </td>
                            <td className="fw-semibold">{item.tjkNumber ?? '-'}</td>
                            <td>
                              <Badge
                                bg={item.errorClass === 'TRANSIENT' ? 'light' : 'danger'}
                                className={item.errorClass === 'TRANSIENT' ? 'text-dark border' : 'text-white'}
                              >
                                {item.errorClass}
                              </Badge>
                            </td>
                            <td style={{ wordBreak: 'break-word' }}>{item.message}</td>
                            <td className="text-muted">{formatDateTimeForText(item.createdAt)}</td>
                            <td className="text-end">
                              {item.status === 'OPEN' && (
                                <div className="d-flex justify-content-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="success"
                                    className="py-0 px-2"
                                    onClick={() => handleAction(item.id, 'resolve')}
                                    title="Çözüldü olarak işaretle"
                                  >
                                    Çözüldü
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="py-0 px-2"
                                    onClick={() => handleAction(item.id, 'ignore')}
                                    title="Yoksay"
                                  >
                                    Yoksay
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Mobil Kart Görünümü (sm ve altı) */}
                  <div className="d-block d-md-none">
                    <div className="d-flex flex-column gap-2">
                      {displayedErrors.map((item) => (
                        <Card key={item.id} className="border shadow-none bg-white">
                          <Card.Body className="p-3">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <div className="d-flex align-items-center gap-1 flex-wrap">
                                <Badge bg={errorStatusVariant(item.status)}>
                                  {errorStatusText(item.status)}
                                </Badge>
                                <Badge
                                  bg={item.errorClass === 'TRANSIENT' ? 'light' : 'danger'}
                                  className={item.errorClass === 'TRANSIENT' ? 'text-dark border' : 'text-white'}
                                >
                                  {item.errorClass}
                                </Badge>
                              </div>
                              {item.tjkNumber && (
                                <div className="small fw-bold text-muted">
                                  TJK No: <span className="text-dark">{item.tjkNumber}</span>
                                </div>
                              )}
                            </div>

                            <p className="mb-2 text-dark small" style={{ wordBreak: 'break-word' }}>
                              {item.message}
                            </p>

                            <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                {formatDateTimeForText(item.createdAt)}
                              </span>
                              {item.status === 'OPEN' && (
                                <div className="d-flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="success"
                                    className="py-0 px-2"
                                    style={{ fontSize: '0.75rem' }}
                                    onClick={() => handleAction(item.id, 'resolve')}
                                  >
                                    Çözüldü
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="py-0 px-2"
                                    style={{ fontSize: '0.75rem' }}
                                    onClick={() => handleAction(item.id, 'ignore')}
                                  >
                                    Yoksay
                                  </Button>
                                </div>
                              )}
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Genel Hata Özeti */}
        {errorText && (
          <div className="mt-3 mt-md-4">
            <h6 className="text-danger border-bottom pb-2">Hata Özeti / Günlüğü</h6>
            <pre
              className="bg-light p-3 rounded text-danger small"
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '0.78rem',
              }}
            >
              {errorText}
            </pre>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="py-2 px-3">
        <Button variant="secondary" onClick={onHide} className="w-100 w-sm-auto">
          Kapat
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default JobHistoryModal;
