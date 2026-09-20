"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner } from 'react-bootstrap';
import { ArrowLeft, Eye, RefreshCw, ChevronUp, ChevronDown } from 'react-feather';
import { toast } from 'react-toastify';
import { Job, JobHistory } from '@/models/job-models';
import { jobService } from '@/services/job.service';
import JobHistoryModal from '@/widgets/job/JobHistoryModal';
import { getErrorMessage } from '@/helpers/HelperUtils';

type HistorySortKey = 'start_time' | 'end_time' | 'status' | 'processed_count' | 'reference_date';

const JobHistoryClient = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = (searchParams?.get('id') || params?.id) as string;

  const [job, setJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<JobHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState<JobHistory | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: HistorySortKey; direction: 'ASC' | 'DESC' }>({
    key: 'start_time',
    direction: 'DESC',
  });

  const fetchData = React.useCallback(async (silent = false) => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    try {
      if (!silent) setIsLoading(true);
      const [jobData, historyData] = await Promise.all([
        jobService.getJobById(id),
        jobService.getJobHistory(id, { limit: 50 }),
      ]);
      setJob(jobData);
      setHistory(historyData.items || []);
    } catch (error: any) {
      if (!silent) {
        const msg = getErrorMessage(error) || 'Geçmiş kayıtları yüklenirken hata oluştu';
        toast.error(msg);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-poll if any history item is currently running or queued
  const hasActiveRun = history.some(
    (item) => item.status === 'RUNNING' || item.status === 'LEASED' || item.status === 'QUEUED'
  );

  useEffect(() => {
    if (!hasActiveRun) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [hasActiveRun, fetchData]);

  const handleSort = (key: HistorySortKey) => {
    let direction: 'ASC' | 'DESC' = 'ASC';
    if (sortConfig.key === key && sortConfig.direction === 'ASC') {
      direction = 'DESC';
    }
    setSortConfig({ key, direction });

    const sorted = [...history].sort((a: any, b: any) => {
      let valA: any;
      let valB: any;

      if (key === 'start_time') {
        valA = new Date(a.startedAt || a.start_time || a.createdAt || a.created_at || 0).getTime();
        valB = new Date(b.startedAt || b.start_time || b.createdAt || b.created_at || 0).getTime();
      } else if (key === 'end_time') {
        valA = a.completedAt || a.end_time ? new Date(a.completedAt || a.end_time).getTime() : 0;
        valB = b.completedAt || b.end_time ? new Date(b.completedAt || b.end_time).getTime() : 0;
      } else if (key === 'processed_count') {
        valA = a.processedCount ?? a.processed_count ?? 0;
        valB = b.processedCount ?? b.processed_count ?? 0;
      } else if (key === 'reference_date') {
        valA = a.referenceDate || a.reference_date || '';
        valB = b.referenceDate || b.reference_date || '';
      } else {
        valA = a[key] || '';
        valB = b[key] || '';
      }

      if (valA < valB) return direction === 'ASC' ? -1 : 1;
      if (valA > valB) return direction === 'ASC' ? 1 : -1;
      return 0;
    });

    setHistory(sorted);
  };

  const getSortIcon = (key: HistorySortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ASC' ? (
      <ChevronUp size={16} className="ms-1 d-inline" />
    ) : (
      <ChevronDown size={16} className="ms-1 d-inline" />
    );
  };

  const handleViewDetail = (item: JobHistory) => {
    setSelectedHistory(item);
    setShowModal(true);
  };

  const calculateDuration = (startTime?: string, endTime?: string, durationMs?: number) => {
    if (durationMs !== undefined && durationMs !== null) {
      if (durationMs < 1000) {
        return `${durationMs} ms`;
      }
      const totalSecs = (durationMs / 1000).toFixed(1);
      if (durationMs < 60000) {
        return `${totalSecs} sn`;
      }
      const mins = Math.floor(durationMs / 60000);
      const secs = Math.round((durationMs % 60000) / 1000);
      return `${mins} dk ${secs} sn`;
    }

    if (!startTime || !endTime) return '-';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffInSeconds = Math.round((end - start) / 1000);

    if (diffInSeconds < 0) return '-';
    if (diffInSeconds < 60) {
      return `${diffInSeconds} sn`;
    }
    const mins = Math.floor(diffInSeconds / 60);
    const secs = diffInSeconds % 60;
    return `${mins} dk ${secs} sn`;
  };

  const formatReferenceDate = (value?: string) => {
    if (!value) return '-';
    const datePart = value.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}.${month}.${year}`;
    }
    return value;
  };

  const getStatusBadge = (status: string) => {
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
  };

  const showReferenceDate = Boolean(job?.supports_reference_date || job?.supportsReferenceDate);

  return (
    <Container fluid className="p-3 lg:p-6">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center">
          <Button
            variant="outline-secondary"
            size="sm"
            className="me-3 d-flex align-items-center"
            onClick={() => router.push('/job-management')}
          >
            <ArrowLeft size={16} className="me-1" />
            Geri
          </Button>
          <div>
            <h4 className="mb-0 fw-bold">
              {job?.name ? `${job.name} Geçmişi` : 'Çalışma Geçmişi'}
            </h4>
          </div>
        </div>

        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => fetchData()}
          disabled={isLoading}
          className="d-flex align-items-center"
        >
          <RefreshCw size={14} className={`me-1 ${isLoading ? 'spin' : ''}`} />
          Yenile
        </Button>
      </div>

      <Row>
        <Col lg={12} md={12} sm={12}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              {isLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2 text-muted">Geçmiş yükleniyor...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th
                          className="user-select-none"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('start_time')}
                        >
                          Başlangıç {getSortIcon('start_time')}
                        </th>
                        {showReferenceDate && (
                          <th
                            className="user-select-none"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleSort('reference_date')}
                          >
                            Referans Tarihi {getSortIcon('reference_date')}
                          </th>
                        )}
                        <th
                          className="user-select-none"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('end_time')}
                        >
                          Bitiş {getSortIcon('end_time')}
                        </th>
                        <th>Süre</th>
                        <th
                          className="user-select-none text-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('processed_count')}
                        >
                          İşlenen Kayıt {getSortIcon('processed_count')}
                        </th>
                        <th
                          className="user-select-none"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('status')}
                        >
                          Durum {getSortIcon('status')}
                        </th>
                        <th className="text-end pe-4">Detay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length > 0 ? (
                        history.map((item: JobHistory) => {
                          const startTime = item.startedAt || item.start_time || item.createdAt || item.created_at;
                          const endTime = item.completedAt || item.end_time;
                          const processedCount = item.processedCount ?? item.processed_count ?? 0;
                          const refDate = item.referenceDate || item.reference_date;

                          return (
                            <tr key={item.id}>
                              <td>{startTime ? new Date(startTime).toLocaleString('tr-TR') : '-'}</td>
                              {showReferenceDate && (
                                <td>{formatReferenceDate(refDate)}</td>
                              )}
                              <td>{endTime ? new Date(endTime).toLocaleString('tr-TR') : '-'}</td>
                              <td>{calculateDuration(startTime, endTime, item.durationMs ?? item.duration_ms)}</td>
                              <td className="text-center">
                                <Badge bg="light" text="dark" className="border px-2 py-1 fs-6">
                                  {processedCount}
                                </Badge>
                              </td>
                              <td>{getStatusBadge(item.status)}</td>
                              <td className="text-end pe-4">
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => handleViewDetail(item)}
                                  title="Detay Görüntüle"
                                >
                                  <Eye size={14} />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={showReferenceDate ? 7 : 6} className="text-center py-5">
                            <div className="text-muted">
                              <p className="mb-0">Bu görev için henüz çalışma geçmişi bulunamadı.</p>
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

      {showModal && selectedHistory && (
        <JobHistoryModal
          show={showModal}
          history={selectedHistory}
          job={job}
          onHide={() => {
            setShowModal(false);
            setSelectedHistory(null);
          }}
        />
      )}
    </Container>
  );
};

export default JobHistoryClient;
