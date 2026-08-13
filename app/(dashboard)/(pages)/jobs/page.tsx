"use client"
import React, { useMemo, useState } from 'react';
import { Badge, Button, Col, Container, Form, Modal, Offcanvas, Row, Table } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getCronHint, getJobDisplayName, getJobRunStatusText, getJobTypeText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import {
  buildCronFromFriendly,
  CRON_DAY_OPTIONS,
  defaultFriendlySchedule,
  formatTimeInput,
  FriendlySchedule,
  parseFriendlyCron,
  parseTimeInput,
} from '@/helpers/jobSchedule';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { jobService, JobRequest, JobResponse, JobHistoryItem } from '@/services/job.service';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';
import { Edit } from 'react-feather';

const headItems = ['Ad', 'Tip', 'Çalışma Sıklığı', 'Durum', 'Son Çalışma', 'Sonraki Çalışma', ''];
const ALLOWED_SCHEDULED_JOBS = new Set(['TJK_SYNC', 'PACKAGE_EXPIRY_SCAN', 'MEDIA_RECONCILE']);

type JobFormValues = {
  identifier?: string;
  expectedVersion: number;
  cronExpression: string;
  isActive: boolean;
  timeoutMinutes: number;
  scheduleMode: 'everyDay' | 'days';
  days: number[];
  time: string;
};

function toFormValues(job?: JobResponse): JobFormValues {
  const parsed = parseFriendlyCron(job?.cronExpression) ?? defaultFriendlySchedule();
  return {
    identifier: job?.id,
    expectedVersion: job?.version ?? 1,
    cronExpression: job?.cronExpression ?? buildCronFromFriendly(parsed),
    isActive: job?.isActive ?? true,
    timeoutMinutes: Math.max(1, Math.round((job?.timeoutSeconds ?? 60) / 60)),
    scheduleMode: parsed.everyDay ? 'everyDay' : 'days',
    days: parsed.days.length ? parsed.days : [1, 2, 3, 4, 5],
    time: formatTimeInput(parsed.hour, parsed.minute),
  };
}

function JobModal({ selectedJob, onClose, onSave }: { selectedJob?: JobResponse; onClose: () => void; onSave: (value: JobRequest) => void; }) {
  const initial = useMemo(() => toFormValues(selectedJob), [selectedJob]);

  const schema = Yup.object().shape({
    cronExpression: Yup.string().required('Zamanlama zorunludur'),
    timeoutMinutes: Yup.number().min(1, 'En az 1 dakika').required('Süre zorunludur'),
    time: Yup.string().required('Saat zorunludur'),
  });

  const syncCronFromUi = (
    setFieldValue: (field: string, value: unknown) => void,
    next: Partial<Pick<JobFormValues, 'scheduleMode' | 'days' | 'time'>>,
    current: JobFormValues,
  ) => {
    const scheduleMode = next.scheduleMode ?? current.scheduleMode;
    const days = next.days ?? current.days;
    const time = next.time ?? current.time;
    const parsedTime = parseTimeInput(time) ?? { hour: 9, minute: 0 };
    const schedule: FriendlySchedule = {
      everyDay: scheduleMode === 'everyDay',
      days: scheduleMode === 'everyDay' ? [0, 1, 2, 3, 4, 5, 6] : days,
      hour: parsedTime.hour,
      minute: parsedTime.minute,
    };
    void setFieldValue('cronExpression', buildCronFromFriendly(schedule));
  };

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>
          {selectedJob ? getJobDisplayName(selectedJob.key, selectedJob.name) : 'İş Düzenle'}
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik
          initialValues={initial}
          validationSchema={schema}
          onSubmit={(values) => {
            onSave({
              identifier: values.identifier,
              expectedVersion: values.expectedVersion,
              cronExpression: values.cronExpression.trim(),
              isActive: values.isActive,
              timeoutSeconds: Math.max(60, Math.round(values.timeoutMinutes) * 60),
            });
          }}
        >
          {({ handleSubmit, handleChange, values, setFieldValue, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Çalışma sıklığı</Form.Label>
                <Form.Select
                  value={values.scheduleMode}
                  onChange={(e) => {
                    const scheduleMode = e.target.value as 'everyDay' | 'days';
                    void setFieldValue('scheduleMode', scheduleMode);
                    syncCronFromUi(setFieldValue, { scheduleMode }, values);
                  }}
                >
                  <option value="everyDay">Her gün</option>
                  <option value="days">Belirli günler</option>
                </Form.Select>
              </Form.Group>

              {values.scheduleMode === 'days' && (
                <Form.Group className="mb-3">
                  <Form.Label>Günler</Form.Label>
                  <div className="d-flex flex-wrap gap-2">
                    {CRON_DAY_OPTIONS.map((day) => {
                      const checked = values.days.includes(day.value);
                      return (
                        <Form.Check
                          key={day.value}
                          type="checkbox"
                          id={`job-day-${day.value}`}
                          label={day.label}
                          checked={checked}
                          onChange={() => {
                            const days = checked
                              ? values.days.filter((d) => d !== day.value)
                              : [...values.days, day.value].sort((a, b) => a - b);
                            void setFieldValue('days', days.length ? days : [day.value]);
                            syncCronFromUi(setFieldValue, { days: days.length ? days : [day.value] }, values);
                          }}
                        />
                      );
                    })}
                  </div>
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Saat</Form.Label>
                <Form.Control
                  type="time"
                  value={values.time}
                  onChange={(e) => {
                    void setFieldValue('time', e.target.value);
                    syncCronFromUi(setFieldValue, { time: e.target.value }, values);
                  }}
                />
                <Form.Text muted>{getCronHint(values.cronExpression)}</Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Maksimum Çalışma Süresi (dakika)</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  name="timeoutMinutes"
                  value={values.timeoutMinutes}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check type="checkbox" name="isActive" label="Aktif" checked={values.isActive} onChange={handleChange} />
                {!values.isActive && (
                  <Form.Text muted className="d-block">Pasif işler zamanlanmış çalıştırılmaz; sonraki çalışma planlanmaz.</Form.Text>
                )}
              </Form.Group>

              <Button disabled={!isValid || isSubmitting} variant="primary" as="input" type="submit" value="Kaydet" />
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

function JobHistoryModal({ jobId, jobName, onClose }: { jobId: string; jobName: string; onClose: () => void }) {
  const [items, setItems] = useState<JobHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    setLoading(true);
    jobService.getHistory(jobId)
      .then(setItems)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [jobId]);

  const statusVariant = (status: string) => {
    switch (status) {
      case 'SUCCEEDED': return 'success';
      case 'FAILED': case 'DEAD': return 'danger';
      case 'CANCELLED': return 'warning';
      case 'LEASED': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <Modal show onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{jobName} — Çalışma Geçmişi</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {loading && <Loading />}
        {!loading && items.length === 0 && <p className="text-muted">Henüz çalışma kaydı yok.</p>}
        {!loading && items.length > 0 && (
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Durum</th>
                <th>Tip</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
                <th>Süre</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><Badge bg={statusVariant(item.status)}>{getJobRunStatusText(item.status)}</Badge></td>
                  <td>{item.executionType === 'MANUAL' ? 'Manuel' : 'Zamanlanmış'}</td>
                  <td>{item.startedAt ? formatDateTimeForText(item.startedAt) : '-'}</td>
                  <td>{item.completedAt ? formatDateTimeForText(item.completedAt) : '-'}</td>
                  <td>{item.durationMs != null ? `${(item.durationMs / 1000).toFixed(1)}s` : '-'}</td>
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

export default function JobsPage() {
  const [historyJob, setHistoryJob] = useState<JobResponse | null>(null);
  const [{ data, isLoading, refetch }] = useApi<JobResponse>({
    service: jobService,
    params: { filter: '', pageRequest: { page: 0, size: 100, sort: [{ direction: 'ASC', property: 'key' }] } },
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();

  const openJobModal = (job?: JobResponse) => {
    openModal(<JobModal selectedJob={job} onClose={closeModal} onSave={handleSave} />);
  };

  const handleSave = async (values: JobRequest) => {
    try {
      if (!values.identifier) {
        return;
      }
      await jobService.update(values.identifier, values);
      closeModal();
      refetch();
      toast.success('Görev güncellendi');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleRun = async (job: JobResponse) => {
    try {
      await jobService.run(job.id);
      toast.success('Çalıştırma isteği alındı');
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const visibleJobs = (data?.content ?? []).filter((job) =>
    ALLOWED_SCHEDULED_JOBS.has(job.key) && ALLOWED_SCHEDULED_JOBS.has(job.jobType),
  );
  const content = visibleJobs.map((job) => (
    <tr key={job.id}>
      <td>{getJobDisplayName(job.key, job.name)}</td>
      <td>{getJobTypeText(job.jobType)}</td>
      <td>{getCronHint(job.cronExpression)}</td>
      <td><StatusBadge status={job.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td>{job.lastRunAt ? formatDateTimeForText(job.lastRunAt) : '-'}</td>
      <td>
        {!job.isActive
          ? 'Pasif'
          : (job.nextRunAt ? formatDateTimeForText(job.nextRunAt) : '-')}
      </td>
      <td>
        <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => setHistoryJob(job)}>Geçmiş</Button>
        <Button
          size="sm"
          variant="outline-primary"
          className="me-2"
          title="Düzenle"
          aria-label="Düzenle"
          onClick={() => openJobModal(job)}
        >
          <Edit size={14} />
        </Button>
        <Button size="sm" variant="primary" onClick={() => handleRun(job)}>Çalıştır</Button>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading heading="Zamanlanmış Görevler" showCreateButton={false} />
        </Col>
      </Row>
      {isModalOpen && modalContent}
      {historyJob && (
        <JobHistoryModal
          jobId={historyJob.id}
          jobName={getJobDisplayName(historyJob.key, historyJob.name)}
          onClose={() => setHistoryJob(null)}
        />
      )}
      {isLoading && <Loading />}
      {!isLoading && <PrepareTable headItems={headItems} content={content} page={undefined} onHandlePageChange={() => undefined} />}
    </Container>
  );
}
