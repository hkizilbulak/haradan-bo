"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Table, Badge, Form, Button, Spinner, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { PlayCircle, Clock, Edit2, ChevronUp, ChevronDown, StopCircle, RefreshCw } from 'react-feather';
import { Job } from '@/models/job-models';
import { jobService } from '@/services/job.service';
import { PageHeading } from '@/widgets';
import JobModal from '@/widgets/job/JobModal';
import RunJobModal from '@/widgets/job/RunJobModal';
import { getErrorMessage } from '@/helpers/HelperUtils';

type SortKey = 'name' | 'is_active' | 'last_status';

const JobsPage = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [jobToRun, setJobToRun] = useState<Job | null>(null);
  const [showRunConfirmModal, setShowRunConfirmModal] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ASC' | 'DESC' }>({
    key: 'name',
    direction: 'ASC',
  });

  const fetchJobs = useCallback(async (sortKey?: SortKey, direction?: 'ASC' | 'DESC', silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const data = await jobService.getJobs(sortKey || sortConfig.key, direction || sortConfig.direction);
      setJobs(data);
    } catch (error: any) {
      if (!silent) {
        const msg = getErrorMessage(error) || 'Görevler yüklenirken hata oluştu';
        toast.error(msg);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [sortConfig.direction, sortConfig.key]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-polling when any job is actively running or queued
  const hasActiveJob = jobs.some((j) => {
    const st = (j.lastStatus || j.last_status)?.toUpperCase();
    return st === 'RUNNING' || st === 'LEASED' || st === 'QUEUED';
  });

  useEffect(() => {
    if (!hasActiveJob) return;
    const interval = setInterval(() => {
      fetchJobs(undefined, undefined, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [hasActiveJob, fetchJobs]);

  const handleSort = (key: SortKey) => {
    let direction: 'ASC' | 'DESC' = 'ASC';
    if (sortConfig.key === key && sortConfig.direction === 'ASC') {
      direction = 'DESC';
    }
    setSortConfig({ key, direction });
    fetchJobs(key, direction);
  };

  const getSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'ASC' ? (
      <ChevronUp size={16} className="ms-1 d-inline" />
    ) : (
      <ChevronDown size={16} className="ms-1 d-inline" />
    );
  };

  const handleHistory = (job: Job) => {
    router.push(`/job-management/history?id=${job.id}`);
  };

  const handleEdit = (job: Job) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const handleRunClick = (job: Job) => {
    setJobToRun(job);
    setShowRunConfirmModal(true);
  };

  const handleCloseRunModal = () => {
    if (runLoading) return;
    setShowRunConfirmModal(false);
    setJobToRun(null);
  };

  const handleRunConfirm = async (referenceDate?: string) => {
    if (!jobToRun || runLoading) return;

    try {
      setRunLoading(true);
      const payload = referenceDate ? { reference_date: referenceDate } : undefined;
      await jobService.runJob(jobToRun.id, payload);
      const suffix = referenceDate
        ? ` (${referenceDate.split('-').reverse().join('.')} tarihi için)`
        : '';
      toast.success(`"${jobToRun.name}" başarıyla tetiklendi${suffix}. Arka planda çalışıyor.`);
      setShowRunConfirmModal(false);
      setJobToRun(null);
      fetchJobs(undefined, undefined, true);
    } catch (error: any) {
      const msg = getErrorMessage(error) || 'Tetikleme sırasında hata oluştu';
      toast.error(msg);
    } finally {
      setRunLoading(false);
    }
  };

  const handleCancelClick = (job: Job) => {
    setJobToCancel(job);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!jobToCancel) return;
    try {
      setCancellingJobId(jobToCancel.id);
      await jobService.cancelJob(jobToCancel.id);
      toast.success(`"${jobToCancel.name}" görevi durduruldu.`);
      setShowCancelModal(false);
      setJobToCancel(null);
      fetchJobs(undefined, undefined, true);
    } catch (error: any) {
      const msg = getErrorMessage(error) || 'Görevi durdururken hata oluştu';
      toast.error(msg);
    } finally {
      setCancellingJobId(null);
    }
  };

  const handleToggleActive = async (job: Job) => {
    const currentActive = job.is_active !== undefined ? job.is_active : job.isActive;
    try {
      setIsLoading(true);
      await jobService.updateJob(job.id, {
        expected_version: job.version,
        cron_expression: job.cron_expression || job.cronExpression,
        is_active: !currentActive,
        timeout_seconds: job.timeout_seconds || job.timeoutSeconds,
      });
      toast.success('Görev durumu güncellendi');
      fetchJobs();
    } catch (error: any) {
      const msg = getErrorMessage(error) || 'Güncelleme sırasında hata oluştu';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusBadge = (status?: string) => {
    const st = status?.toUpperCase();
    switch (st) {
      case 'RUNNING':
      case 'LEASED':
        return (
          <Badge bg="warning" text="dark" className="d-inline-flex align-items-center gap-1">
            <Spinner animation="border" size="sm" style={{ width: '0.75rem', height: '0.75rem', borderWidth: '2px' }} />
            Çalışıyor
          </Badge>
        );
      case 'QUEUED':
        return (
          <Badge bg="info" className="d-inline-flex align-items-center gap-1">
            <Spinner animation="grow" size="sm" style={{ width: '0.75rem', height: '0.75rem' }} />
            Kuyrukta
          </Badge>
        );
      case 'SUCCEEDED':
      case 'SUCCESS':
        return <Badge bg="success">Başarılı</Badge>;
      case 'FAILED':
      case 'DEAD':
        return <Badge bg="danger">Hata</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">İptal Edildi</Badge>;
      case 'TIMEOUT':
        return <Badge bg="secondary">Zaman Aşımı</Badge>;
      default:
        return <span className="text-muted">-</span>;
    }
  };

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <div className="d-flex align-items-center justify-content-between mb-4">
            <PageHeading
              heading="Zamanlanmış Görevler"
              showCreateButton={false}
            />
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => fetchJobs()}
              disabled={isLoading}
              className="d-flex align-items-center"
            >
              <RefreshCw size={14} className={`me-1 ${isLoading ? 'spin' : ''}`} />
              Yenile
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mt-1">
        <Col lg={12} md={12} sm={12}>
          <Card className="border-0 shadow-sm position-relative">
            <Card.Body className="p-0">
              {isLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2 text-muted">Görevler yükleniyor...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th
                          onClick={() => handleSort('name')}
                          className="user-select-none"
                          style={{ cursor: 'pointer' }}
                        >
                          Görev Adı {getSortIcon('name')}
                        </th>
                        <th>Açıklama</th>
                        <th>Cron İfadesi</th>
                        <th
                          onClick={() => handleSort('is_active')}
                          className="user-select-none"
                          style={{ cursor: 'pointer' }}
                        >
                          Zamanlama {getSortIcon('is_active')}
                        </th>
                        <th
                          onClick={() => handleSort('last_status')}
                          className="user-select-none"
                          style={{ cursor: 'pointer' }}
                        >
                          Son Durum {getSortIcon('last_status')}
                        </th>
                        <th className="text-end pe-4">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.length > 0 ? (
                        jobs.map((job: Job) => {
                          const isActive = job.is_active !== undefined ? job.is_active : job.isActive;
                          const cronExpr = job.cron_expression || job.cronExpression;
                          const lastStatus = job.lastStatus || job.last_status;
                          const lastRunAt = job.lastRunAt || job.last_run_at;
                          const isRunning =
                            lastStatus?.toUpperCase() === 'RUNNING' ||
                            lastStatus?.toUpperCase() === 'LEASED' ||
                            lastStatus?.toUpperCase() === 'QUEUED';

                          return (
                            <tr key={job.id}>
                              <td className="fw-semibold">{job.name}</td>
                              <td className="text-muted small">
                                {job.description || '-'}
                              </td>
                              <td>
                                <code>{cronExpr}</code>
                              </td>
                              <td>
                                <Form.Check
                                  type="switch"
                                  id={`custom-switch-${job.id}`}
                                  checked={Boolean(isActive)}
                                  onChange={() => handleToggleActive(job)}
                                  label={isActive ? 'Aktif' : 'Pasif'}
                                  className="fw-medium"
                                />
                              </td>
                              <td>
                                <div>{renderStatusBadge(lastStatus)}</div>
                                {lastRunAt && (
                                  <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                                    {new Date(lastRunAt).toLocaleString('tr-TR')}
                                  </small>
                                )}
                              </td>
                              <td className="text-end pe-4">
                                {isRunning ? (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="me-2"
                                    onClick={() => handleCancelClick(job)}
                                    title="Görevi Durdur"
                                    disabled={cancellingJobId === job.id}
                                  >
                                    {cancellingJobId === job.id ? (
                                      <Spinner animation="border" size="sm" style={{ width: '0.8rem', height: '0.8rem' }} />
                                    ) : (
                                      <StopCircle size={15} />
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    className="me-2"
                                    onClick={() => handleRunClick(job)}
                                    title="Şimdi Çalıştır"
                                  >
                                    <PlayCircle size={15} />
                                  </Button>
                                )}
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  className="me-2"
                                  onClick={() => handleHistory(job)}
                                  title="Geçmişi Görüntüle"
                                >
                                  <Clock size={15} />
                                </Button>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleEdit(job)}
                                  title="Düzenle"
                                >
                                  <Edit2 size={15} />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-4">
                            <div className="text-muted">
                              <p className="mb-0">Sistemde kayıtlı görev bulunamadı.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Durdurma Onay Modalı */}
      <Modal show={showCancelModal} onHide={() => !cancellingJobId && setShowCancelModal(false)} centered>
        <Modal.Header closeButton={!cancellingJobId}>
          <Modal.Title className="h5 text-danger d-flex align-items-center gap-2">
            <StopCircle size={20} />
            Görevi Durdur
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            <strong>&quot;{jobToCancel?.name}&quot;</strong> görevinin devam eden veya kuyruktaki çalışmasını durdurmak istediğinize emin misiniz?
          </p>
          <div className="alert alert-warning mt-3 py-2 small mb-0">
            İşlem iptal edilecek ve durdurulacaktır.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowCancelModal(false)}
            disabled={Boolean(cancellingJobId)}
          >
            Vazgeç
          </Button>
          <Button
            variant="danger"
            onClick={handleCancelConfirm}
            disabled={Boolean(cancellingJobId)}
          >
            {cancellingJobId ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Durduruluyor...
              </>
            ) : (
              'Evet, Durdur'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {showModal && selectedJob && (
        <JobModal
          show={showModal}
          job={selectedJob}
          onHide={() => {
            setShowModal(false);
            setSelectedJob(null);
          }}
          onSave={() => {
            fetchJobs();
          }}
        />
      )}

      {showRunConfirmModal && jobToRun && (
        <RunJobModal
          show={showRunConfirmModal}
          job={jobToRun}
          loading={runLoading}
          onClose={handleCloseRunModal}
          onConfirm={handleRunConfirm}
        />
      )}
    </Container>
  );
};

export default JobsPage;
