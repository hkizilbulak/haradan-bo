"use client"
import React, { useState } from 'react';
import { Badge, Button, Col, Container, Form, Modal, Offcanvas, Row, Table } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getJobTypeText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { jobService, JobRequest, JobResponse, JobHistoryItem } from '@/services/job.service';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';

const headItems = ['Anahtar', 'Ad', 'Tip', 'Cron', 'Durum', 'Son Çalışma', ''];

function JobModal({ selectedJob, onClose, onSave }: { selectedJob?: JobResponse; onClose: () => void; onSave: (value: JobRequest) => void; }) {
  const values: JobRequest = selectedJob ? {
    identifier: selectedJob.id,
    expectedVersion: selectedJob.version,
    cronExpression: selectedJob.cronExpression,
    isActive: selectedJob.isActive,
    timeoutSeconds: selectedJob.timeoutSeconds,
  } : {
    expectedVersion: 1,
    cronExpression: '* * * * *',
    isActive: true,
    timeoutSeconds: 60,
  };

  const schema = Yup.object().shape({
    cronExpression: Yup.string().required('Cron zorunludur'),
    timeoutSeconds: Yup.number().required('Timeout zorunludur'),
  });

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Job Düzenle</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik initialValues={values} validationSchema={schema} onSubmit={onSave}>
          {({ handleSubmit, handleChange, values, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Cron</Form.Label>
                <Form.Control name="cronExpression" value={values.cronExpression} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Timeout (sn)</Form.Label>
                <Form.Control type="number" name="timeoutSeconds" value={values.timeoutSeconds} onChange={handleChange} />
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
                <th>Hata</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><Badge bg={statusVariant(item.status)}>{item.status}</Badge></td>
                  <td>{item.executionType === 'MANUAL' ? 'Manuel' : 'Zamanlanmış'}</td>
                  <td>{item.startedAt ? formatDateTimeForText(item.startedAt) : '-'}</td>
                  <td>{item.completedAt ? formatDateTimeForText(item.completedAt) : '-'}</td>
                  <td>{item.durationMs != null ? `${(item.durationMs / 1000).toFixed(1)}s` : '-'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.lastError ?? undefined}>
                    {item.lastError ?? '-'}
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
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleRun = async (job: JobResponse) => {
    try {
      await jobService.run(job.id);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const content = data?.content?.map((job) => (
    <tr key={job.id}>
      <td>{job.key}</td>
      <td>{job.name}</td>
      <td>{getJobTypeText(job.jobType)}</td>
      <td>{job.cronExpression}</td>
      <td><StatusBadge status={job.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td>{job.lastRunAt ? formatDateTimeForText(job.lastRunAt) : '-'}</td>
      <td>
        <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => setHistoryJob(job)}>Geçmiş</Button>
        <a className="font-medium text-cyan-600 me-3 cp" onClick={() => openJobModal(job)}>
          <i className="fe fe-edit"></i>
        </a>
        <Button size="sm" variant="primary" onClick={() => handleRun(job)}>Çalıştır</Button>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading heading="Joblar" showCreateButton={false} />
        </Col>
      </Row>
      {isModalOpen && modalContent}
      {historyJob && <JobHistoryModal jobId={historyJob.id} jobName={historyJob.name} onClose={() => setHistoryJob(null)} />}
      {isLoading && <Loading />}
      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={() => undefined} />}
    </Container>
  );
}
